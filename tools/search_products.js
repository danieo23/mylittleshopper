import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function parsePrice(raw) {
  if (typeof raw === 'number') return raw;
  const n = parseFloat(String(raw ?? '').replace(/[^0-9.]/g, ''));
  return isNaN(n) ? null : n;
}

/**
 * Searches for products using Claude's server-side web_search tool.
 * Claude searches the live web, finds real product pages, and returns
 * structured product data — exact same mechanism as Claude on claude.ai.
 *
 * @param {object} params
 * @param {string}   params.query       - Style-aware search string
 * @param {string}   params.category    - tops | bottoms | shoes | outerwear | accessories | dress
 * @param {number}   params.maxPrice    - Budget ceiling for this category
 * @param {string}   params.countryCode - Country for regional results (default 'us')
 * @returns {object[]} Normalized product array
 */
export async function searchProducts({ query, category, maxPrice, countryCode = 'us', stores = [] }) {
  const priceClause  = maxPrice  ? ` priced under $${maxPrice}` : '';
  const regionClause = countryCode !== 'us' ? ` available in ${countryCode.toUpperCase()}` : '';

  const prompt = `You are a fashion product search specialist. Find real, currently purchasable ${category} products matching this style brief:

"${query}"${priceClause}${regionClause}

Search the web for actual products from real retailers. Look for product listing pages (not category homepages). For each product found:
- Copy the exact product name as it appears on the page
- Extract the exact numeric price in USD
- Note the store/retailer name
- Get the direct product page URL (the specific product, not a category)
- Get the product image URL (the main product photo)

Return ONLY a JSON array of up to 15 products — no markdown, no explanation, just the array:
[
  {"name":"...","price":49.99,"store":"...","product_url":"https://...","image_url":"https://...","brand":"..."},
  ...
]

If you cannot find enough products, return fewer. If you find nothing, return [].
Focus on products that genuinely match the style query — not just the keywords.`;

  const messages = [{ role: 'user', content: prompt }];

  // client.beta.messages enables the server-side web_search tool.
  // Anthropic executes the actual searches on their end — no external search API needed.
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
    console.error('[search] web_search beta call failed:', err.message);
    return [];
  }

  // Agentic loop — Claude may search multiple times before producing the final JSON
  let turns = 0;
  while (response.stop_reason === 'tool_use' && turns++ < 6) {
    const toolUses = response.content.filter(b => b.type === 'tool_use');
    messages.push({ role: 'assistant', content: response.content });

    // For server-side web_search, pass tool results back.
    // If the tool_use block has a .output field, the server already provided results.
    // Otherwise pass empty content — Anthropic's servers fill it in.
    const toolResults = toolUses.map(b => ({
      type:        'tool_result',
      tool_use_id: b.id,
      content:     (b).output ?? '',
    }));
    messages.push({ role: 'user', content: toolResults });

    try {
      response = await client.beta.messages.create({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        betas:      ['web-search-2025-03-05'],
        tools:      [{ type: 'web_search_20250305', name: 'web_search' }],
        messages,
      });
    } catch (err) {
      console.error('[search] web_search loop failed at turn', turns, ':', err.message);
      break;
    }
  }

  // Extract the JSON array from Claude's final text response
  const textBlock = response.content.find(b => b.type === 'text');
  if (!textBlock) {
    console.warn('[search] no text block in final response');
    return [];
  }

  const jsonMatch = textBlock.text.match(/\[[\s\S]*?\]/);
  if (!jsonMatch) {
    console.warn('[search] no JSON array found in response');
    return [];
  }

  let raw;
  try {
    raw = JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error('[search] JSON parse failed:', err.message);
    return [];
  }

  if (!Array.isArray(raw)) return [];

  return raw
    .filter(p => p.name && p.product_url)
    .map(p => ({
      id:          `ws-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name:        p.name ?? '',
      price:       parsePrice(p.price),
      store:       p.store ?? null,
      image_url:   p.image_url ?? null,
      all_images:  p.image_url ? [p.image_url] : [],
      product_url: p.product_url ?? null,
      serpapi_product_link: null,
      colors:         null,
      style_category: null,
      fit_type:       null,
      brand:          p.brand ?? p.store ?? null,
    }));
}
