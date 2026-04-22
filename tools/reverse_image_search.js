const API_KEY = process.env.SHOPPING_API_KEY;

/**
 * Runs a reverse image search using SerpAPI's Google Lens engine.
 * Merges both shopping_results and visual_matches into one products list —
 * Google Lens frequently returns results only in visual_matches for fashion images.
 */
export async function reverseImageSearch(imageUrl) {
  if (!API_KEY) throw new Error('SHOPPING_API_KEY not set');

  const url = new URL('https://serpapi.com/search');
  url.searchParams.set('engine',  'google_lens');
  url.searchParams.set('url',     imageUrl);
  url.searchParams.set('api_key', API_KEY);
  url.searchParams.set('hl',      'en');
  url.searchParams.set('gl',      'us');
  url.searchParams.set('no_cache', 'true');

  const res  = await fetch(url.toString(), { signal: AbortSignal.timeout(20000) });
  const data = await res.json();

  if (data.error) throw new Error(`SerpAPI Google Lens: ${data.error}`);

  console.log('[lens] response keys:', Object.keys(data));
  console.log('[lens] shopping_results count:', data.shopping_results?.length ?? 0);
  console.log('[lens] visual_matches count:', data.visual_matches?.length ?? 0);
  console.log('[lens] first shopping result:', JSON.stringify(data.shopping_results?.[0] ?? null));

  // Explicit shopping results
  const fromShopping = (data.shopping_results ?? []).map(item => ({
    name:        item.title,
    price:       item.price ? parseFloat(item.price.replace(/[^0-9.]/g, '')) : null,
    store:       item.source,
    product_url: item.link,
    image_url:   item.thumbnail,
    brand:       item.brand ?? null,
  })).filter(p => p.name && p.product_url);

  // Visual matches — these almost always exist and also link to shoppable pages
  const fromVisual = (data.visual_matches ?? []).slice(0, 20).map(m => ({
    name:        m.title,
    price:       m.price ? parseFloat(m.price.replace(/[^0-9.]/g, '')) : null,
    store:       m.source,
    product_url: m.link,
    image_url:   m.thumbnail,
    brand:       null,
  })).filter(m => m.name && m.product_url);

  // Merge: shopping first (de-duped against visual)
  const seen          = new Set(fromShopping.map(p => p.product_url));
  const uniqueVisual  = fromVisual.filter(m => !seen.has(m.product_url));
  const allProducts   = [...fromShopping, ...uniqueVisual];

  return {
    shopping_results: allProducts,   // unified shoppable list for the UI
    visual_matches:   fromVisual,    // kept separately if needed
  };
}
