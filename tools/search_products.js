import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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

// Build a compact human-readable style brief from DNA for brand selection
function buildStyleBrief(styleDna, query, category) {
  if (!styleDna) return `Item needed: ${query} (${category})`;

  const colors = [...new Set([
    ...(styleDna.primary_colors   ?? []).map(hexToBucket),
    ...(styleDna.secondary_colors ?? []).map(hexToBucket),
  ].filter(Boolean))].slice(0, 4);

  // Cultural profile is stored inside explicit_dislikes to avoid DB migration
  const cultural = styleDna.explicit_dislikes?.cultural_profile ?? [];

  const parts = [
    `Primary aesthetic: ${styleDna.primary_style_category ?? 'not specified'}`,
    styleDna.secondary_categories?.length
      ? `Secondary aesthetics: ${styleDna.secondary_categories.join(', ')}`
      : null,
    `Fit preference: ${styleDna.dominant_fit ?? 'not specified'}`,
    colors.length ? `Core palette: ${colors.join(', ')}` : null,
    cultural.length ? `Cultural signals: ${cultural.join(', ')}` : null,
    styleDna.brand_affinities?.length
      ? `Wardrobe brand signals: ${styleDna.brand_affinities.slice(0, 5).join(', ')}`
      : null,
    `Formality range: ${styleDna.formality_range_min ?? 1}–${styleDna.formality_range_max ?? 5}/10`,
    `Item needed: ${query} (${category})`,
  ];

  return parts.filter(Boolean).join('\n');
}

// Stage 4: Claude selects 1-3 specific brands whose catalog best matches the style profile.
// No web search — Claude's training knowledge of brand aesthetics is the signal here.
async function selectBrands(styleBrief, query, category, maxPrice) {
  const budgetNote = maxPrice ? ` Budget ceiling: $${maxPrice}.` : '';

  const prompt = `You are a fashion brand expert with deep knowledge of brand aesthetics. Based on the user's style profile, select the 2-3 brands whose current catalog would have the highest density of matching items for this specific purchase.

USER STYLE PROFILE:
${styleBrief}

TASK: Find "${query}" in the "${category}" category.${budgetNote}

Selection rules:
- The brand MUST actually sell this category of item
- Match the aesthetic precisely — this is style-first selection, not just category matching
- Prefer brands with active online stores (DTC preferred over department stores)
- If the wardrobe shows specific brand names (band names, logos), treat those as subculture signals that indicate what aesthetic family to stay within
- Most DTC fashion brands run on Shopify; note this in the "shopify" field
- Only suggest brands that sell at the stated budget

Return ONLY a JSON array, no markdown, no explanation:
[
  {"name":"Brand Name","domain":"brandname.com","shopify":true,"reason":"one-line why this fits the profile"},
  ...
]`;

  try {
    const response = await client.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages:   [{ role: 'user', content: prompt }],
    });
    const text  = response.content[0]?.text ?? '';
    const match = text.match(/\[[\s\S]*?\]/);
    if (!match) return [];
    return JSON.parse(match[0]);
  } catch (err) {
    console.error('[brand-select] failed:', err.message);
    return [];
  }
}

// Common Shopify collection slugs per category — tried in order until one returns products
const SHOPIFY_COLLECTION_MAP = {
  tops:        ['t-shirts', 'tops', 'shirts', 'graphic-tees', 'tees', 'all'],
  bottoms:     ['bottoms', 'pants', 'jeans', 'denim', 'all'],
  shoes:       ['shoes', 'footwear', 'sneakers', 'all'],
  outerwear:   ['outerwear', 'jackets', 'coats', 'layers', 'all'],
  accessories: ['accessories', 'all'],
  dress:       ['dresses', 'all'],
};

// Stage 5a: Fetch products directly from a brand's Shopify catalog JSON endpoint.
// Returns clean structured data — no HTML parsing, no scraping.
async function fetchShopifyCatalog(domain, category, maxPrice) {
  const collections = SHOPIFY_COLLECTION_MAP[category] ?? ['all'];

  for (const col of collections) {
    try {
      const url = `https://${domain}/collections/${col}/products.json?limit=20`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)' },
        signal:  AbortSignal.timeout(8000),
      });
      if (!res.ok) continue;
      const data = await res.json();
      if (!data?.products?.length) continue;

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
        }));

      if (products.length > 0) {
        console.log(`[shopify] ${domain}/${col}: ${products.length} products`);
        return products;
      }
    } catch (_) {
      // Try next collection slug
    }
  }
  return [];
}

// Stage 5b: Brand-targeted web search fallback for non-Shopify brands.
async function webSearchForBrand(brandName, domain, query, category, maxPrice) {
  const priceClause = maxPrice ? ` under $${maxPrice}` : '';
  const siteClause  = domain ? `site:${domain} ` : '';

  const prompt = `You are a fashion product search specialist. Find currently purchasable products from ${brandName}.

Search for: ${siteClause}${query} ${category}${priceClause}

For each product found:
- Copy the exact product name as it appears on the store
- Extract the exact numeric price in USD
- Get the direct product page URL
- Get the product image URL

Return ONLY a JSON array of up to 8 products — no markdown, just the array:
[{"name":"...","price":49.99,"store":"${brandName}","product_url":"https://...","image_url":"https://...","brand":"${brandName}"},...]`;

  const messages = [{ role: 'user', content: prompt }];
  let response;
  try {
    response = await client.beta.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      betas:      ['web-search-2025-03-05'],
      tools:      [{ type: 'web_search_20250305', name: 'web_search' }],
      messages,
    });
  } catch (err) {
    console.error('[brand-web-search] failed:', err.message);
    return [];
  }

  let turns = 0;
  while (response.stop_reason === 'tool_use' && turns++ < 4) {
    const toolUses = response.content.filter(b => b.type === 'tool_use');
    messages.push({ role: 'assistant', content: response.content });
    messages.push({ role: 'user', content: toolUses.map(b => ({
      type: 'tool_result', tool_use_id: b.id, content: b.output ?? '',
    })) });
    try {
      response = await client.beta.messages.create({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        betas:      ['web-search-2025-03-05'],
        tools:      [{ type: 'web_search_20250305', name: 'web_search' }],
        messages,
      });
    } catch { break; }
  }

  return parseProductJson(response, brandName);
}

// Generic web search when no DNA or brand selection is available
async function genericWebSearch(query, category, maxPrice) {
  const priceClause = maxPrice ? ` priced under $${maxPrice}` : '';

  const prompt = `You are a fashion product search specialist. Find real, currently purchasable ${category} products matching this style brief:

"${query}"${priceClause}

Search the web for actual products from real retailers. For each product found:
- Copy the exact product name as it appears on the page
- Extract the exact numeric price in USD
- Note the store/retailer name
- Get the direct product page URL (the specific product, not a category)
- Get the product image URL (the main product photo)

Return ONLY a JSON array of up to 12 products — no markdown, no explanation, just the array:
[{"name":"...","price":49.99,"store":"...","product_url":"https://...","image_url":"https://...","brand":"..."},...]`;

  const messages = [{ role: 'user', content: prompt }];
  let response;
  try {
    response = await client.beta.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      betas:      ['web-search-2025-03-05'],
      tools:      [{ type: 'web_search_20250305', name: 'web_search' }],
      messages,
    });
  } catch (err) {
    console.error('[generic-search] failed:', err.message);
    return [];
  }

  let turns = 0;
  while (response.stop_reason === 'tool_use' && turns++ < 6) {
    const toolUses = response.content.filter(b => b.type === 'tool_use');
    messages.push({ role: 'assistant', content: response.content });
    messages.push({ role: 'user', content: toolUses.map(b => ({
      type: 'tool_result', tool_use_id: b.id, content: b.output ?? '',
    })) });
    try {
      response = await client.beta.messages.create({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        betas:      ['web-search-2025-03-05'],
        tools:      [{ type: 'web_search_20250305', name: 'web_search' }],
        messages,
      });
    } catch { break; }
  }

  return parseProductJson(response, null);
}

function parseProductJson(response, defaultBrand) {
  const textBlock = response?.content?.find(b => b.type === 'text');
  if (!textBlock) return [];
  const match = textBlock.text.match(/\[[\s\S]*?\]/);
  if (!match) return [];
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
      }));
  } catch { return []; }
}

// Filter Shopify catalog by core item keywords (strip style descriptors first)
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

  // Keep filter only if it leaves at least 2 products — don't wipe the pool
  return matches.length >= 2 ? matches : products;
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
 * @param {string}   params.query       - Style-aware search string
 * @param {string}   params.category    - tops | bottoms | shoes | outerwear | accessories | dress
 * @param {number}   params.maxPrice    - Budget ceiling
 * @param {string}   params.countryCode - Country for regional results (default 'us')
 * @param {object}   params.styleDna    - User's Style DNA for brand selection
 * @returns {object[]} Normalized product array
 */
export async function searchProducts({ query, category, maxPrice, countryCode = 'us', stores = [], styleDna = null }) {
  const hasDna = !!(
    styleDna?.primary_style_category ||
    styleDna?.dominant_fit           ||
    styleDna?.brand_affinities?.length
  );

  let allProducts = [];

  if (hasDna) {
    // Stage 3: Build holistic style brief
    const styleBrief = buildStyleBrief(styleDna, query, category);

    // Stage 4: Select 1-3 best-fit brands
    const selectedBrands = await selectBrands(styleBrief, query, category, maxPrice);
    console.log(`[brand-select] "${query}": ${selectedBrands.map(b => `${b.name} (${b.domain})`).join(', ') || 'none'}`);

    // Stage 5: Fetch from each brand — Shopify first, web search fallback
    for (const brand of selectedBrands.slice(0, 2)) {
      let brandProducts = [];

      if (brand.shopify !== false && brand.domain) {
        brandProducts = await fetchShopifyCatalog(brand.domain, category, maxPrice);
      }

      if (brandProducts.length < 3 && brand.domain) {
        const fallback = await webSearchForBrand(brand.name, brand.domain, query, category, maxPrice);
        brandProducts = brandProducts.length >= fallback.length ? brandProducts : fallback;
      }

      brandProducts = filterByItemKeywords(brandProducts, query);
      console.log(`[brand-catalog] ${brand.name}: ${brandProducts.length} matching products`);
      allProducts.push(...brandProducts);

      if (allProducts.length >= 12) break;
    }
  }

  // Supplement with generic web search if brand catalog was insufficient
  if (allProducts.length < 5) {
    console.log(`[search] brand pipeline yielded ${allProducts.length}, running generic web search`);
    const enrichedQuery = hasDna
      ? `${query} ${styleDna.primary_style_category ?? ''} ${styleDna.dominant_fit ?? ''}`.trim().replace(/\s+/g, ' ')
      : query;
    const fallback = await genericWebSearch(enrichedQuery, category, maxPrice);
    allProducts.push(...fallback);
  }

  // Deduplicate by normalized name
  const seen   = new Set();
  const unique = allProducts.filter(p => {
    const k = (p.name ?? '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 40);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  return unique.filter(p => p.name && p.product_url).slice(0, 15);
}
