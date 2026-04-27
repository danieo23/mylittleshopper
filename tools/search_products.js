import Anthropic from '@anthropic-ai/sdk';
import { enrichProductsWithThumbnailAnalysis } from './analyze_product_thumbnail.js';

const client = new Anthropic({
  apiKey:         process.env.ANTHROPIC_API_KEY,
  defaultHeaders: { 'anthropic-beta': 'web-search-2025-03-05' },
});

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

// Build a compact human-readable style brief from DNA for brand selection.
// Includes OCR texts (verbatim garment text), cultural signals, and
// profile-recommended brands so every search starts from the full picture.
function buildStyleBrief(styleDna, query, category) {
  if (!styleDna) return `Item needed: ${query} (${category})`;

  const colors = [...new Set([
    ...(styleDna.primary_colors   ?? []).map(hexToBucket),
    ...(styleDna.secondary_colors ?? []).map(hexToBucket),
  ].filter(Boolean))].slice(0, 4);

  const dislikes  = styleDna.explicit_dislikes ?? {};
  const cultural  = dislikes.cultural_profile ?? [];
  // Verbatim text read off garments via OCR — band names, logos, slogans
  const ocrTexts  = dislikes.ocr_summary ?? [];
  // Brands identified by the wardrobe profile as the best aesthetic matches
  const profBrands = dislikes.profile_recommended_brands ?? [];

  const parts = [
    `Primary aesthetic: ${styleDna.primary_style_category ?? 'not specified'}`,
    styleDna.secondary_categories?.length
      ? `Secondary aesthetics: ${styleDna.secondary_categories.join(', ')}`
      : null,
    `Fit preference: ${styleDna.dominant_fit ?? 'not specified'}`,
    colors.length ? `Core palette: ${colors.join(', ')}` : null,
    ocrTexts.length
      ? `Text found on owned garments — use ONLY to infer aesthetic identity, NEVER to search for these exact graphics or characters: ${ocrTexts.join(' | ')}` : null,
    cultural.length ? `Cultural signals (inferred from owned items): ${cultural.join(', ')}` : null,
    styleDna.brand_affinities?.length
      ? `Wardrobe brand signals: ${styleDna.brand_affinities.slice(0, 5).join(', ')}`
      : null,
    profBrands.length
      ? `Profile-recommended brands (highest aesthetic match): ${profBrands.join(', ')}`
      : null,
    `Formality range: ${styleDna.formality_range_min ?? 1}–${styleDna.formality_range_max ?? 5}/10`,
    `Item needed: ${query} (${category})`,
  ];

  return parts.filter(Boolean).join('\n');
}

// Stage 4: Claude selects up to 5 specific brands whose catalog best matches the style profile,
// ranked by aesthetic match score. No web search — Claude's training knowledge is the signal.
async function selectBrands(styleBrief, query, category, maxPrice, excludedBrands = []) {
  const budgetNote    = maxPrice ? ` Budget ceiling: $${maxPrice}.` : '';
  const excludedNote  = excludedBrands.length
    ? `\n- Do NOT suggest these brands (already used in this outfit): ${excludedBrands.join(', ')}`
    : '';

  const prompt = `You are a fashion brand expert with deep knowledge of brand aesthetics. Based on the user's style profile, select up to 5 brands whose current catalog would have the highest density of matching items for this specific purchase, ranked best-first by aesthetic match.

USER STYLE PROFILE:
${styleBrief}

TASK: Find "${query}" in the "${category}" category.${budgetNote}

Selection rules:
- The "Profile-recommended brands" line lists brands already identified as the best aesthetic match for this wardrobe — prefer these first if they sell the requested category
- "Text found on owned garments" tells you their aesthetic identity — if you see music artist names (Radiohead, The Cure, etc.) the person buys from labels like Needles, Human Made, Stüssy, CPFM. If you see pop culture / superhero / character graphics, they lean vintage-inspired streetwear labels. CRITICAL: do NOT use these as literal search terms — they represent what the user ALREADY OWNS. Never pick a brand because it sells the same graphic they already have.
- FORMALITY MATCH IS MANDATORY: Read the search query for occasion cues (dinner, party, date, office, wedding, rooftop, event, smart casual, formal, etc.). If the occasion is elevated (formality ≥ 6/10), do NOT select streetwear or skate brands (Stüssy, Supreme, Palace, BAPE, Carhartt WIP, etc.) even if they appear in wardrobe signals — those brands do not produce appropriate items for formal occasions. Instead pick brands that actually carry elevated smart casual or formal pieces (COS, ASOS, Reiss, Club Monaco, J.Crew, Ted Baker, Todd Snyder, AllSaints, Buck Mason, Everlane, etc.).
- The brand MUST actually sell this category of item
- Prefer brands with active online stores (DTC or specialty retail — not Amazon/Walmart)
- Most DTC fashion brands run on Shopify; note this in the "shopify" field
- Only suggest brands that sell at the stated budget${excludedNote}

Return ONLY a JSON array ranked best-first, no markdown, no explanation:
[
  {"name":"Brand Name","domain":"brandname.com","shopify":true,"reason":"one-line why this fits the profile"},
  ...
]`;

  try {
    const apiCall = client.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 768,
      messages:   [{ role: 'user', content: prompt }],
    });
    const response = await Promise.race([
      apiCall,
      new Promise((_, reject) => setTimeout(() => reject(new Error('brand-select timeout')), 7000)),
    ]);
    const text  = response.content[0]?.text ?? '';
    console.log('[brand-select] raw response (first 200):', text.slice(0, 200));
    const match = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (!match) { console.warn('[brand-select] no JSON array found in response'); return []; }
    return JSON.parse(match[0]);
  } catch (err) {
    console.error('[brand-select] failed:', err.message);
    return [];
  }
}

// Common Shopify collection slugs per category — tried in order until one returns products.
// "all" is intentionally excluded for specific categories: fetching all products returns mixed
// types (pants in a tee search, etc.) and the keyword filter can't reliably clean that up.
// If no slug matches, fetchShopifyCatalog returns [] and the brand-targeted web search runs instead.
const SHOPIFY_COLLECTION_MAP = {
  tops:        ['t-shirts', 'tops', 'shirts', 'graphic-tees', 'tees', 'knitwear', 'sweatshirts'],
  bottoms:     ['bottoms', 'pants', 'jeans', 'denim', 'trousers', 'shorts'],
  shoes:       ['shoes', 'footwear', 'sneakers', 'boots', 'sandals'],
  outerwear:   ['outerwear', 'jackets', 'coats', 'layers'],
  accessories: ['accessories', 'all'],
  dress:       ['dresses', 'all'],
};

// Stage 5a: Fetch products directly from a brand's Shopify catalog JSON endpoint.
// All collection slugs are tried in parallel — first one with products wins.
async function fetchShopifyCatalog(domain, category, maxPrice) {
  const collections = SHOPIFY_COLLECTION_MAP[category] ?? ['all'];

  const tryCollection = async (col) => {
    const url = `https://${domain}/collections/${col}/products.json?limit=20`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)' },
      signal:  AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`${res.status}`);
    const data = await res.json();
    if (!data?.products?.length) throw new Error('empty');
    const products = data.products
      .filter(p => {
        if (!maxPrice) return true;
        const price = parseFloat(p.variants?.[0]?.price ?? '0');
        return price > 0 && price <= maxPrice;
      })
      .map(p => ({
        id:                   `shopify-${domain}-${p.id}`,
        name:                 p.title,
        price:                parseFloat(p.variants?.[0]?.price ?? '0') || null,
        store:                domain.replace('www.', '').split('.')[0],
        image_url:            p.images?.[0]?.src ?? null,
        all_images:           (p.images ?? []).map(i => i.src),
        product_url:          `https://${domain}/products/${p.handle}`,
        serpapi_product_link: null,
        colors:               null,
        style_category:       null,
        fit_type:             null,
        brand:                p.vendor ?? null,
        result_source:        'shopify',
      }));
    if (!products.length) throw new Error('no matching products');
    return { col, products };
  };

  const results = await Promise.allSettled(collections.map(tryCollection));
  const first   = results.find(r => r.status === 'fulfilled');
  if (!first) return [];
  const { col, products } = first.value;
  console.log(`[shopify] ${domain}/${col}: ${products.length} products`);
  return products;
}

// Hard cap on any single external search call. Resolves to [] on timeout.
const WEB_SEARCH_TIMEOUT_MS = 12000;
const capSearch = (promise) =>
  Promise.race([promise, new Promise(resolve => setTimeout(() => resolve([]), WEB_SEARCH_TIMEOUT_MS))]);

// ── SerpAPI Google Shopping (primary text search) ────────────────────────────
// Uses the same SHOPPING_API_KEY already wired for Google Lens visual search.
// Returns structured product data without any LLM parsing — fast and reliable.
// Returns null if the API key is not configured (signals caller to try Claude fallback).
// Returns: product array on success, null if key missing, undefined if call failed (triggers Claude fallback)
async function serpApiShoppingSearch(query, maxPrice, resultSource = 'serpapi') {
  const API_KEY = process.env.SHOPPING_API_KEY;
  console.log(`[serpapi/${resultSource}] key=${API_KEY ? `set(${API_KEY.slice(0,4)}…)` : 'MISSING'} query="${query.slice(0, 50)}"`);
  if (!API_KEY) return null;

  const params = new URLSearchParams({
    engine:  'google_shopping',
    q:       query,
    gl:      'us',
    hl:      'en',
    api_key: API_KEY,
  });

  try {
    const res = await fetch(`https://serpapi.com/search?${params}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status}: ${body.slice(0, 120)}`);
    }
    const data = await res.json();
    if (data.error) throw new Error(`SerpAPI error: ${data.error}`);

    const products = (data.shopping_results ?? [])
      .filter(p => p.title && p.link)
      .slice(0, 12)
      .map(p => ({
        id:                   `sp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name:                 p.title,
        price:                typeof p.extracted_price === 'number' ? p.extracted_price : parsePrice(p.price),
        store:                p.source ?? null,
        image_url:            p.thumbnail ?? null,
        all_images:           p.thumbnail ? [p.thumbnail] : [],
        product_url:          p.link,
        serpapi_product_link: p.product_link ?? null,
        colors:               null,
        style_category:       null,
        fit_type:             null,
        brand:                p.brand ?? null,
        result_source:        resultSource,
      }));

    console.log(`[serpapi/${resultSource}] ${products.length} products (shopping_results: ${data.shopping_results?.length ?? 0})`);
    return products;
  } catch (err) {
    console.error(`[serpapi/${resultSource}] failed:`, err.message);
    return undefined; // signals caller: key is set but call failed → try Claude
  }
}

// ── Claude web search (fallback when SHOPPING_API_KEY is not set) ────────────
async function claudeWebSearch(query, category, maxPrice, resultSource = 'claude_web') {
  const priceClause = maxPrice ? ` priced under $${maxPrice}` : '';
  const prompt = `Find real, currently purchasable ${category} products matching: "${query}"${priceClause}

Return ONLY a JSON array of up to 12 products — no markdown, just the array:
[{"name":"...","price":49.99,"store":"...","product_url":"https://...","image_url":"https://...","brand":"..."},...]`;

  try {
    const response = await client.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      tools:      [{ type: 'web_search_20250305', name: 'web_search' }],
      messages:   [{ role: 'user', content: prompt }],
    });
    return parseProductJson(response, null, resultSource);
  } catch (err) {
    console.error(`[claude-web/${resultSource}] failed:`, err.status ?? '', err.message);
    return [];
  }
}

// Stage 5b: Brand-targeted product search — SerpAPI primary, Claude fallback.
async function webSearchForBrand(brandName, domain, query, category, maxPrice) {
  // SerpAPI: include brand name in query for Google Shopping targeting
  const brandQuery = `${brandName} ${query}`;
  const serpResults = await serpApiShoppingSearch(brandQuery, maxPrice, 'serpapi_brand');
  // null = no key; undefined = key set but call failed; [] = success but 0 results
  if (serpResults?.length > 0) return serpResults; // got products — done

  // SerpAPI unavailable or returned nothing — fall back to Claude web search
  const priceClause = maxPrice ? ` under $${maxPrice}` : '';
  const siteClause  = domain ? `site:${domain} ` : '';
  const prompt = `Find currently purchasable products from ${brandName}.
Search for: ${siteClause}${query} ${category}${priceClause}
Return ONLY a JSON array of up to 8 products — no markdown, just the array:
[{"name":"...","price":49.99,"store":"${brandName}","product_url":"https://...","image_url":"https://...","brand":"${brandName}"},...]`;

  try {
    const response = await client.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      tools:      [{ type: 'web_search_20250305', name: 'web_search' }],
      messages:   [{ role: 'user', content: prompt }],
    });
    return parseProductJson(response, brandName, 'claude_brand');
  } catch (err) {
    console.error('[brand-web-search] claude failed:', err.status ?? '', err.message);
    return [];
  }
}

// Generic search — SerpAPI primary, Claude fallback.
async function genericWebSearch(query, category, maxPrice) {
  const serpResults = await serpApiShoppingSearch(query, maxPrice, 'serpapi_generic');
  // null = no key; undefined = key set but call failed; [] = success but 0 results
  if (serpResults?.length > 0) return serpResults; // got products — done

  // SerpAPI unavailable or returned nothing → always try Claude
  console.log('[search] SerpAPI yielded nothing — trying Claude web search');
  return claudeWebSearch(query, category, maxPrice, 'claude_generic');
}

function parseProductJson(response, defaultBrand, resultSource = 'brand_web') {
  const textBlock = response?.content?.find(b => b.type === 'text');
  if (!textBlock) { console.warn(`[parse-product/${resultSource}] no text block in response`); return []; }
  console.log(`[parse-product/${resultSource}] raw (first 200):`, textBlock.text.slice(0, 200));
  const match = textBlock.text.match(/\[\s*\{[\s\S]*\}\s*\]/);
  if (!match) { console.warn(`[parse-product/${resultSource}] no JSON array found`); return []; }
  try {
    const raw = JSON.parse(match[0]);
    if (!Array.isArray(raw)) return [];
    return raw
      .filter(p => p.name && p.product_url)
      .map(p => ({
        id:                   `ws-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name:                 p.name,
        price:                parsePrice(p.price),
        store:                p.store ?? defaultBrand ?? null,
        image_url:            p.image_url ?? null,
        all_images:           p.image_url ? [p.image_url] : [],
        product_url:          p.product_url,
        serpapi_product_link: null,
        colors:               null,
        style_category:       null,
        fit_type:             null,
        brand:                p.brand ?? defaultBrand ?? p.store ?? null,
        result_source:        resultSource,
      }));
  } catch { return []; }
}

// Hard-block products that clearly belong to the wrong category.
// Applied after every search (Shopify, brand web, generic web) so pants
// can never appear in a tops slot, shoes in a bottoms slot, etc.
// If the filter removes everything, return [] so the fallback generic search runs.
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
    console.warn(`[category-filter] all ${products.length} results blocked for "${category}" — likely wrong category from source`);
    return []; // Return empty; triggers fallback generic search
  }
  return safe;
}

// Filter by core item keywords from the search query (strip style descriptors first).
// Returns matched items, or the original list if no recognizable keywords remain after stripping.
// Never falls back to the full pool — wrong-category items should be caught by hardCategoryFilter.
const STYLE_STRIP = /\b(men'?s?|women'?s?|unisex|streetwear|minimal|vintage|oversized|relaxed|slim|baggy|loose|black|white|navy|gray|grey|beige|fitted|tailored|washed|faded|dark|light|casual|formal|basic|classic)\b/gi;

function filterByItemKeywords(products, query) {
  const core = query
    .replace(STYLE_STRIP, '')
    .split(/\s+/)
    .filter(w => w.length > 2)
    .map(w => w.toLowerCase());

  if (!core.length) return products;

  const matches = products.filter(p =>
    core.some(kw => (p.name ?? '').toLowerCase().includes(kw))
  );

  // Use matched items if any found; otherwise return all (style keywords may not appear in product names)
  return matches.length >= 1 ? matches : products;
}

/**
 * Searches for products using a brand-first pipeline:
 * 1. Build a style brief from the user's DNA
 * 2. Claude selects 1-3 specific brands whose catalog matches the profile
 * 3. Fetch directly from those brands' Shopify catalogs (clean structured data)
 * 4. Fall back to brand-targeted web search if Shopify fails
 * 5. Fall back to generic web search if brand catalog is insufficient
 *
 * @param {object} params
 * @param {string}   params.query          - Style-aware search string
 * @param {string}   params.category       - tops | bottoms | shoes | outerwear | accessories | dress
 * @param {number}   params.maxPrice       - Budget ceiling
 * @param {string}   params.countryCode    - Country for regional results (default 'us')
 * @param {object}   params.styleDna       - User's Style DNA for brand selection
 * @param {string[]} params.excludedBrands - Brand names already used in this outfit (prevent monoculture)
 * @returns {object[]} Normalized product array
 */
export async function searchProducts({ query, category, maxPrice, countryCode = 'us', stores = [], styleDna = null, excludedBrands = [] }) {
  const hasDna = !!(
    styleDna?.primary_style_category ||
    styleDna?.dominant_fit           ||
    styleDna?.brand_affinities?.length
  );

  const enrichedQuery = hasDna
    ? `${query} ${styleDna.primary_style_category ?? ''} ${styleDna.dominant_fit ?? ''}`.trim().replace(/\s+/g, ' ')
    : query;

  // Brand pipeline and generic search run IN PARALLEL.
  // Generic search (SerpAPI) completes in 1-3s and guarantees results even if
  // the brand pipeline times out. Brand results are preferred (more targeted);
  // generic fills any gaps after deduplication.
  const fetchBrand = async (brand) => {
    if (!brand.domain) return [];
    let bp = [];
    if (brand.shopify !== false) {
      bp = await fetchShopifyCatalog(brand.domain, category, maxPrice);
    }
    if (bp.length < 3) {
      const fallback = await capSearch(webSearchForBrand(brand.name, brand.domain, query, category, maxPrice));
      bp = bp.length >= fallback.length ? bp : fallback;
    }
    bp = filterByItemKeywords(bp, query);
    console.log(`[brand-catalog] ${brand.name}: ${bp.length} matching products`);
    return bp;
  };

  const brandPipelinePromise = hasDna
    ? (async () => {
        const styleBrief     = buildStyleBrief(styleDna, query, category);
        const selectedBrands = await selectBrands(styleBrief, query, category, maxPrice, excludedBrands);
        console.log(`[brand-select] "${query}": ${selectedBrands.map(b => `${b.name} (${b.domain})`).join(', ') || 'none'}`);
        const results = await Promise.all(selectedBrands.slice(0, 3).map(fetchBrand));
        return results.flat();
      })().catch(err => { console.error('[brand-pipeline]', err.message); return []; })
    : Promise.resolve([]);

  const genericPromise = capSearch(genericWebSearch(enrichedQuery, category, maxPrice));

  const [brandProducts, genericProducts] = await Promise.all([brandPipelinePromise, genericPromise]);
  console.log(`[search] brand=${brandProducts.length} generic=${genericProducts.length} query="${query.slice(0, 60)}"`);

  // Brand products first (more persona-targeted), generic fills remaining slots
  let allProducts = [...brandProducts, ...genericProducts];

  // Hard-remove wrong-category items that slipped through any source.
  const categorySafe = hardCategoryFilter(allProducts, category);
  const pool = categorySafe.length >= 1 ? categorySafe : allProducts;

  // Deduplicate by normalized name
  const seen   = new Set();
  const unique = pool.filter(p => {
    const k = (p.name ?? '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 40);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  return unique.filter(p => p.name && p.product_url).slice(0, 15);
}

/**
 * Enrich a product list with Claude Vision thumbnail analysis.
 * Call this AFTER all slot searches complete — never inside a timed search call.
 * Mutates products in place (colors, fit, style_category, formality, etc).
 * 10-second total cap so it never stalls downstream assembly.
 *
 * @param {object[]} products
 * @returns {Promise<void>}
 */
export async function enrichSearchResults(products) {
  if (!products?.length) return;
  const enriched = await enrichProductsWithThumbnailAnalysis(products, 10_000);
  console.log(`[thumbnail] enriched ${enriched}/${products.length} products`);
}
