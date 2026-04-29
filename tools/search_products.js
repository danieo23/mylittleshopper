import Anthropic          from '@anthropic-ai/sdk';
import { createClient }   from '@supabase/supabase-js';
import { enrichProductsWithThumbnailAnalysis } from './analyze_product_thumbnail.js';

// Used only by claudeKnowledgeFallback
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ── Utilities ─────────────────────────────────────────────────────────────

function parsePrice(raw) {
  if (typeof raw === 'number') return raw;
  const n = parseFloat(String(raw ?? '').replace(/[^0-9.]/g, ''));
  return isNaN(n) ? null : n;
}

function hexToBucket(hex) {
  if (!hex || typeof hex !== 'string') return null;
  const h = hex.replace('#', '').padEnd(6, '0');
  const r = parseInt(h.slice(0,2), 16) || 0;
  const g = parseInt(h.slice(2,4), 16) || 0;
  const b = parseInt(h.slice(4,6), 16) || 0;
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  const max = Math.max(r, g, b);
  const sat = max === 0 ? 0 : (max - Math.min(r, g, b)) / max;
  if (brightness < 35) return 'black';
  if (brightness > 220 && sat < 0.1) return 'white';
  if (sat < 0.15) {
    if (brightness < 80) return 'charcoal';
    if (brightness < 150) return 'gray';
    return 'off-white';
  }
  let hue = Math.atan2(Math.sqrt(3) * (g - b), 2 * r - g - b) * (180 / Math.PI);
  if (hue < 0) hue += 360;
  if (sat < 0.35 && brightness > 100 && r >= g && r >= b) {
    if (brightness > 200) return 'cream';
    if (brightness > 160) return 'beige';
    if (brightness > 120) return 'tan';
    return 'camel';
  }
  if (hue < 20 || hue >= 345) return brightness < 100 ? 'burgundy' : 'red';
  if (hue < 40)  return brightness < 120 ? 'rust' : 'orange';
  if (hue < 70)  return sat < 0.4 ? 'sand' : 'yellow';
  if (hue < 165) return sat < 0.5 ? 'olive' : 'green';
  if (hue < 200) return 'teal';
  if (hue < 240) return brightness < 80 ? 'navy' : brightness < 150 ? 'cobalt' : 'blue';
  if (hue < 295) return 'purple';
  return 'pink';
}

// ── Brand selection from curated catalog ─────────────────────────────────

// Maps maxPrice to allowed price tiers (± one tier for flexibility).
function priceTiersForBudget(maxPrice) {
  if (!maxPrice) return ['budget', 'mid', 'premium', 'luxury'];
  if (maxPrice < 50)  return ['budget'];
  if (maxPrice < 120) return ['budget', 'mid'];
  if (maxPrice < 300) return ['mid', 'premium'];
  if (maxPrice < 600) return ['premium', 'luxury'];
  return ['luxury'];
}

// Detect elevated formality from query string (occasion terms injected by buildSlotQuery).
function isElevatedOccasion(query) {
  return /dinner|gala|wedding|formal|rooftop|event|office|business|smart.?casual|tailored|date.?night|cocktail/i.test(query);
}

// Tag overlap count between user DNA tags and brand tags (case-insensitive substring match).
function tagOverlap(brandTags, userTags) {
  if (!brandTags?.length || !userTags?.length) return 0;
  return userTags.filter(ut =>
    brandTags.some(bt => bt.toLowerCase().includes(ut.toLowerCase()) || ut.toLowerCase().includes(bt.toLowerCase()))
  ).length;
}

/**
 * Queries curated_brands for active Shopify brands matching budget/formality/gender,
 * then uses Claude Haiku to rank the top 5 by aesthetic fit.
 * Returns up to 5 full brand records in ranked order.
 */
async function selectBrandsFromCatalog(styleDna, query, category, maxPrice, excludedBrands = []) {
  const tiers     = priceTiersForBudget(maxPrice);
  const formal    = isElevatedOccasion(query);

  // Fetch all active Shopify brands within the price tier range
  const { data: candidates, error } = await supabase
    .from('curated_brands')
    .select('*')
    .eq('is_active', true)
    .eq('is_shopify', true)
    .in('price_tier', tiers)
    .order('name');

  if (error) {
    console.error('[brand-catalog] Supabase query failed:', error.message);
    return [];
  }

  // Filter in JS: excluded brands, formality gate, gender compatibility
  const userGender = styleDna?.gender ?? null; // 'mens' | 'womens' | null
  const filtered = (candidates ?? []).filter(brand => {
    if (excludedBrands.some(e => e.toLowerCase() === brand.name.toLowerCase())) return false;
    // Formal occasions: skip brands tagged streetwear or skate
    if (formal && brand.aesthetic_tags?.some(t => /streetwear|skate/i.test(t))) return false;
    // Gender: skip brands where gender_focus is opposite of user's.
    // When gender is unknown, restrict to gender-neutral brands to avoid contamination.
    if (userGender === 'mens'   && brand.gender_focus === 'womens') return false;
    if (userGender === 'womens' && brand.gender_focus === 'mens')   return false;
    if (!userGender && brand.gender_focus !== 'all') return false;
    return true;
  });

  if (!filtered.length) {
    console.warn('[brand-catalog] no brands passed filters — returning empty');
    return [];
  }

  // Build user tag list from DNA for overlap scoring
  const userTags = [
    styleDna?.primary_style_category,
    ...(styleDna?.secondary_categories ?? []),
    ...(styleDna?.explicit_dislikes?.cultural_profile ?? []),
  ].filter(Boolean).map(t => t.toLowerCase());

  // Score by tag overlap and sort — gives Claude a pre-ranked list
  const preSorted = filtered
    .map(brand => ({
      ...brand,
      _overlap: tagOverlap(
        [...(brand.aesthetic_tags ?? []), ...(brand.cultural_signals ?? [])],
        userTags
      ),
    }))
    .sort((a, b) => b._overlap - a._overlap)
    .slice(0, 20); // send top 20 to Claude for final ranking

  const result = preSorted.slice(0, 5);
  console.log(`[brand-catalog] selected: ${result.map(b => b.name).join(', ')}`);
  return result;
}

// ── Shopify catalog fetch ─────────────────────────────────────────────────

// Standard collection slugs per category tried when brand has no custom slugs configured.
const SHOPIFY_COLLECTION_MAP = {
  tops:        ['t-shirts', 'tops', 'shirts', 'graphic-tees', 'tees', 'knitwear', 'sweatshirts'],
  bottoms:     ['bottoms', 'pants', 'jeans', 'denim', 'trousers', 'shorts'],
  shoes:       ['shoes', 'footwear', 'sneakers', 'boots', 'sandals'],
  outerwear:   ['outerwear', 'jackets', 'coats', 'layers'],
  accessories: ['accessories', 'all'],
  dress:       ['dresses', 'all'],
};

/**
 * Fetches products from a curated_brands record's Shopify catalog.
 * Tries brand-specific slugs first, then category defaults, then /products.json.
 * Runs slug attempts in parallel (within one brand) for speed.
 * Returns normalized product array or [] if the brand's catalog is unreachable.
 */
async function fetchBrandShopifyCatalog(brand, category, maxPrice) {
  const base = (brand.shopify_base_url ?? `https://${brand.domain}`).replace(/\/$/, '');

  // Brand-specific slugs (from admin verification) first, then category defaults, deduplicated
  const brandSlugs    = brand.shopify_collection_slugs ?? [];
  const categorySlugs = SHOPIFY_COLLECTION_MAP[category] ?? ['all'];
  const slugsToTry    = [...new Set([...brandSlugs, ...categorySlugs])];

  const mapProduct = (p) => ({
    id:                   `shopify-${brand.domain}-${p.id}`,
    name:                 p.title,
    price:                parseFloat(p.variants?.[0]?.price ?? '0') || null,
    store:                brand.name,
    image_url:            p.images?.[0]?.src ?? null,
    all_images:           (p.images ?? []).map(i => i.src),
    product_url:          `${base}/products/${p.handle}`,
    serpapi_product_link: null,
    colors:               null,
    style_category:       null,
    fit_type:             null,
    brand:                p.vendor ?? brand.name,
    result_source:        'shopify',
  });

  const trySlug = async (slug) => {
    const url = `${base}/collections/${slug}/products.json?limit=50`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)' },
      signal:  AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`${res.status}`);
    const data = await res.json();
    if (!data?.products?.length) throw new Error('empty');
    const products = data.products
      .filter(p => !maxPrice || parseFloat(p.variants?.[0]?.price ?? '0') <= maxPrice)
      .map(mapProduct)
      .filter(p => p.name && p.product_url);
    if (!products.length) throw new Error('no matching products after price filter');
    return products;
  };

  // Try all collection slugs in parallel — take the first that returns products
  const results = await Promise.allSettled(slugsToTry.map(trySlug));
  const first   = results.find(r => r.status === 'fulfilled');
  if (first) {
    const products = first.value;
    console.log(`[shopify] ${brand.name}: ${products.length} products`);
    return products;
  }

  // All collection slugs failed — try the catch-all /products.json endpoint
  try {
    const url = `${base}/products.json?limit=50`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)' },
      signal:  AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`${res.status}`);
    const data = await res.json();
    const products = (data.products ?? [])
      .filter(p => !maxPrice || parseFloat(p.variants?.[0]?.price ?? '0') <= maxPrice)
      .map(mapProduct)
      .filter(p => p.name && p.product_url);
    if (products.length) console.log(`[shopify] ${brand.name}/all: ${products.length} products`);

    // Mark brand as having a broken/empty catalog so we can investigate
    if (!products.length) {
      console.warn(`[shopify] ${brand.name}: no products from any endpoint`);
      // Best-effort: update last_verified_at to null to flag for admin re-check
      supabase.from('curated_brands')
        .update({ last_verified_at: null })
        .eq('slug', brand.slug)
        .then(() => {});
    }

    return products;
  } catch (err) {
    console.error(`[shopify] ${brand.name} all-products failed:`, err.message);
    return [];
  }
}

// ── Gender filtering ──────────────────────────────────────────────────────

const WOMENS_SIGNALS = /\b(women'?s?|woman'?s?|ladies|lady|feminine|femme|girls?|her\b|bralette|bikini|maternity|nursing|blouse)\b/i;
const MENS_SIGNALS   = /\b(men'?s?|man'?s?|male|guys?|his\b|beard)\b/i;

function filterByGender(products, gender) {
  if (!gender) return products;
  if (gender === 'mens') {
    const safe = products.filter(p => !WOMENS_SIGNALS.test(p.name ?? ''));
    return safe.length ? safe : products; // never wipe everything
  }
  if (gender === 'womens') {
    const safe = products.filter(p => !MENS_SIGNALS.test(p.name ?? ''));
    return safe.length ? safe : products;
  }
  return products;
}

// ── Category and keyword filtering ────────────────────────────────────────

// Hard-block products that clearly belong to the wrong category.
const CATEGORY_BLOCKLIST = {
  tops:      /\b(pants?|trousers?|jeans?|denim\b(?! jacket| shirt)|shorts?|leggings?|joggers?|sweatpants?|chinos?|skirts?|loafers?|sneakers?|boots?|sandals?|shoes?)\b/i,
  bottoms:   /\b(t-?shirts?|tees?\b|blouses?|polos?|henley|henleys?|hoodie|hoodies?|sweatshirt|sweatshirts?|cardigans?|sweater|sweaters?|sneakers?|boots?|sandals?|shoes?|loafers?)\b/i,
  shoes:     /\b(pants?|trousers?|jeans?|t-?shirts?|tees?\b|tops?|blouses?|jackets?|coats?|hoodies?)\b/i,
  outerwear: /\b(pants?|trousers?|jeans?|shorts?|sneakers?|sandals?|loafers?|t-?shirts?|tees?\b)\b/i,
};

export function hardCategoryFilter(products, category) {
  const blocklist = CATEGORY_BLOCKLIST[category];
  if (!blocklist) return products;
  const safe = products.filter(p => !blocklist.test(p.name ?? ''));
  if (safe.length === 0 && products.length > 0) {
    console.warn(`[category-filter] all ${products.length} results blocked for "${category}"`);
    return [];
  }
  return safe;
}

// Strip style adjectives, keep core item keywords, filter products by them.
const STYLE_STRIP = /\b(men'?s?|women'?s?|unisex|streetwear|minimal|vintage|oversized|relaxed|slim|baggy|loose|black|white|navy|gray|grey|beige|fitted|tailored|washed|faded|dark|light|casual|formal|basic|classic)\b/gi;

function filterByItemKeywords(products, query) {
  const core = query
    .replace(STYLE_STRIP, '')
    .split(/\s+/)
    .filter(w => w.length > 2)
    .map(w => w.toLowerCase());

  if (!core.length) return products;
  const matches = products.filter(p => core.some(kw => (p.name ?? '').toLowerCase().includes(kw)));
  return matches.length >= 1 ? matches : products; // safety: never return empty when products exist
}

// ── Last-resort Claude knowledge fallback ─────────────────────────────────
// Only fires when the curated catalog returns 0 products across all selected brands.
// Uses Claude's training knowledge (no web search) for a reliable 2-4s JSON response.

async function claudeKnowledgeFallback(query, category, maxPrice) {
  const priceClause = maxPrice ? ` under $${maxPrice}` : '';
  const prompt = `You are a fashion shopping expert. List up to 10 real ${category} products matching: "${query}"${priceClause}.

Use your training knowledge of actual products from real brands. Return ONLY a valid JSON array — no markdown, no explanation:
[{"name":"exact product name","price":79.00,"store":"StoreName","product_url":"https://store.com/products/item","image_url":null,"brand":"Brand"},...]`;

  try {
    const response = await client.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages:   [{ role: 'user', content: prompt }],
    });
    const text  = response.content[0]?.text ?? '';
    const match = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (!match) { console.warn('[claude-fallback] no JSON array found'); return []; }
    const raw = JSON.parse(match[0]);
    return raw
      .filter(p => p.name && p.product_url)
      .map(p => ({
        id:                   `cf-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name:                 p.name,
        price:                parsePrice(p.price),
        store:                p.store ?? null,
        image_url:            p.image_url ?? null,
        all_images:           p.image_url ? [p.image_url] : [],
        product_url:          p.product_url,
        serpapi_product_link: null,
        colors:               null,
        style_category:       null,
        fit_type:             null,
        brand:                p.brand ?? p.store ?? null,
        result_source:        'claude_knowledge',
      }));
  } catch (err) {
    console.error('[claude-fallback] failed:', err.message);
    return [];
  }
}

// ── Main search function ──────────────────────────────────────────────────

/**
 * Searches for products using the curated brand catalog:
 * 1. Query curated_brands for Shopify brands matching budget/aesthetic/gender
 * 2. Claude Haiku ranks the top 5 by aesthetic fit
 * 3. Iterate brands sequentially, fetching each Shopify catalog
 * 4. Stop once 8+ products accumulated (early-stop to avoid unnecessary fetches)
 * 5. Last resort: Claude knowledge fallback if catalog yields nothing
 *
 * @param {object} params
 * @param {string}   params.query          - Style-aware search string
 * @param {string}   params.category       - tops | bottoms | shoes | outerwear | accessories | dress
 * @param {number}   params.maxPrice       - Budget ceiling (null = no limit)
 * @param {string}   params.countryCode    - Country code (unused for Shopify, kept for API compatibility)
 * @param {object}   params.styleDna       - User's Style DNA
 * @param {string[]} params.excludedBrands - Brand names already used (prevent monoculture)
 * @returns {object[]} Normalized product array
 */
export async function searchProducts({ query, category, maxPrice, countryCode = 'us', stores = [], styleDna = null, excludedBrands = [] }) {

  // Step 1: Select up to 5 ranked brands from the curated catalog
  const selectedBrands = await selectBrandsFromCatalog(styleDna, query, category, maxPrice, excludedBrands);

  if (!selectedBrands.length) {
    console.warn(`[search] no brands selected for "${query}" (${category}) — trying knowledge fallback`);
    return claudeKnowledgeFallback(query, category, maxPrice);
  }

  // Step 2: Fetch all selected brands in parallel (max 5s per brand due to slug timeouts)
  const shopifyBrands = selectedBrands.filter(b => b.is_shopify);
  const brandResults  = await Promise.allSettled(
    shopifyBrands.map(brand => fetchBrandShopifyCatalog(brand, category, maxPrice))
  );

  const userGender = styleDna?.gender ?? null;
  const accumulated = [];
  brandResults.forEach((r, i) => {
    if (r.status !== 'fulfilled') return;
    const genderSafe = filterByGender(r.value, userGender);
    const filtered   = filterByItemKeywords(genderSafe, query);
    console.log(`[brand-catalog] ${shopifyBrands[i].name}: ${filtered.length} products after gender+keyword filter`);
    accumulated.push(...filtered);
  });

  // Step 3: If catalog yielded nothing, fire Claude knowledge as last resort
  if (!accumulated.length) {
    console.warn(`[search] all Shopify fetches returned 0 for "${query}" — using Claude knowledge fallback`);
    return claudeKnowledgeFallback(query, category, maxPrice);
  }

  // Step 4: Hard-filter wrong-category items, deduplicate, return
  const categorySafe = hardCategoryFilter(accumulated, category);
  const pool = categorySafe.length >= 1 ? categorySafe : accumulated;

  const seen   = new Set();
  const unique = pool.filter(p => {
    const k = (p.name ?? '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 40);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  console.log(`[search] final pool: ${unique.length} products for "${query.slice(0, 60)}"`);
  return unique.filter(p => p.name && p.product_url).slice(0, 15);
}

// ── Thumbnail enrichment (unchanged) ─────────────────────────────────────

/**
 * Enrich a product list with Claude Vision thumbnail analysis.
 * Call AFTER all slot searches complete — never inside a timed search call.
 */
export async function enrichSearchResults(products) {
  if (!products?.length) return;
  const enriched = await enrichProductsWithThumbnailAnalysis(products, 10_000);
  console.log(`[thumbnail] enriched ${enriched}/${products.length} products`);
}

// ── Removed code (SerpAPI Google Shopping) ───────────────────────────────
//
// REMOVED 2025-04-27: SerpAPI Google Shopping fallbacks replaced by curated brand catalog.
// See git history if you need to restore serpApiShoppingSearch, webSearchForBrand,
// genericWebSearch, or capSearch. Google Lens (visual_search.js) is unaffected.
