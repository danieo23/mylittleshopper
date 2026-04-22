/**
 * Searches for products using the configured shopping API.
 *
 * TODO: Choose and integrate a shopping API. Options:
 *   - SerpAPI Google Shopping  (https://serpapi.com/google-shopping-api)
 *   - RapidAPI Shopping        (multiple providers available)
 *   - Nordstrom / ASOS affiliate APIs
 *
 * Set in .env:
 *   SHOPPING_API_KEY=your_key_here
 *   SHOPPING_API_PROVIDER=serpapi   # or 'rapidapi'
 */

const PROVIDER = process.env.SHOPPING_API_PROVIDER ?? 'serpapi';
const API_KEY  = process.env.SHOPPING_API_KEY;

/**
 * @param {object} params
 * @param {string}   params.query       - Style-aware search string ("relaxed tapered earth tone trousers")
 * @param {string}   params.category    - tops | bottoms | shoes | outerwear | accessories | dress
 * @param {number}   params.maxPrice    - Budget ceiling for this category
 * @param {string[]} params.stores      - Preferred stores to filter by (optional)
 * @returns {object[]} Normalized product array
 */
export async function searchProducts({ query, category, maxPrice, stores = [] }) {
  if (!API_KEY) throw new Error('SHOPPING_API_KEY is not set in .env');

  if (PROVIDER === 'serpapi') {
    return _searchViaSerpApi({ query, category, maxPrice, stores });
  }
  throw new Error(`Unknown SHOPPING_API_PROVIDER: ${PROVIDER}`);
}

async function _searchViaSerpApi({ query, maxPrice }) {
  // No store filtering — Google Shopping naturally surfaces diverse retailers.
  // Filtering by store name in the query narrows results too aggressively.
  const fullQuery = query;

  const url = new URL('https://serpapi.com/search');
  url.searchParams.set('engine',  'google_shopping');
  url.searchParams.set('q',       fullQuery);
  url.searchParams.set('api_key', API_KEY);
  if (maxPrice) url.searchParams.set('price_max', String(maxPrice));

  const res  = await fetch(url.toString(), { signal: AbortSignal.timeout(20000) });
  const data = await res.json();

  if (data.error) throw new Error(`SerpAPI error: ${data.error}`);

  return (data.shopping_results ?? [])
    .filter(p => p.price && !isNaN(parseFloat(p.price.replace(/[^0-9.]/g, ''))))
    .map(p => ({
      id:          p.product_id ?? p.position?.toString(),
      name:        p.title,
      price:       parseFloat(p.price.replace(/[^0-9.]/g, '')),
      store:       p.source,
      image_url:   p.thumbnail,
      product_url: p.link,
      // Style attributes extracted later via analyze_image_style if needed
      colors:         null,
      style_category: null,
      fit_type:       null,
      brand:          p.brand ?? null,
    }));
}
