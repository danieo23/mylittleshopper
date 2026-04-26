const API_KEY = process.env.SHOPPING_API_KEY;

/**
 * Runs a reverse image search using SerpAPI's Google Lens engine.
 * Returns shoppable products and visually similar items for a given image URL.
 */
export async function reverseImageSearch(imageUrl) {
  if (!API_KEY) throw new Error('SHOPPING_API_KEY not set');

  const url = new URL('https://serpapi.com/search');
  url.searchParams.set('engine',  'google_lens');
  url.searchParams.set('url',     imageUrl);
  url.searchParams.set('api_key', API_KEY);

  const res  = await fetch(url.toString());
  const data = await res.json();

  if (data.error) throw new Error(`SerpAPI Google Lens: ${data.error}`);

  const shopping = (data.shopping_results ?? []).map(item => ({
    name:        item.title,
    price:       item.price ? parseFloat(item.price.replace(/[^0-9.]/g, '')) : null,
    store:       item.source,
    product_url: item.link,
    image_url:   item.thumbnail,
    brand:       item.brand ?? null,
  })).filter(p => p.name && p.product_url);

  const visual = (data.visual_matches ?? []).slice(0, 8).map(m => ({
    title:     m.title,
    source:    m.source,
    link:      m.link,
    image_url: m.thumbnail,
    price:     m.price ? parseFloat(m.price.replace(/[^0-9.]/g, '')) : null,
  })).filter(m => m.link);

  return { shopping_results: shopping, visual_matches: visual };
}
