const API_KEY = process.env.SHOPPING_API_KEY;

// Domains that return videos, social posts, or Pinterest pages — not buyable clothing
const NON_SHOPPING_DOMAINS = [
  'youtube.com', 'youtu.be', 'vimeo.com', 'dailymotion.com',
  'pinterest.com', 'pinterest.co',
  'instagram.com', 'tiktok.com', 'twitter.com', 'x.com',
  'threads.net',
  'facebook.com', 'reddit.com', 'tumblr.com', 'snapchat.com',
  'lookbook.nu', 'polyvore.com', 'stylebook.com',
];

function isShoppableUrl(url) {
  if (!url) return false;
  try {
    const host = new URL(url).hostname.replace(/^www\./, '').toLowerCase();
    return !NON_SHOPPING_DOMAINS.some(d => host === d || host.endsWith('.' + d));
  } catch { return false; }
}

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

  const res  = await fetch(url.toString(), { signal: AbortSignal.timeout(15000) });
  const data = await res.json();

  if (data.error) throw new Error(`SerpAPI Google Lens: ${data.error}`);

  console.log('[lens] response keys:', Object.keys(data));
  console.log('[lens] shopping_results count:', data.shopping_results?.length ?? 0);
  console.log('[lens] visual_matches count:', data.visual_matches?.length ?? 0);
  console.log('[lens] first shopping result:', JSON.stringify(data.shopping_results?.[0] ?? null));

  const parsePrice = (p) => {
    if (!p) return null;
    if (typeof p === 'number') return p;
    if (typeof p === 'object') return p.extracted_value ?? (parseFloat(String(p.value ?? '').replace(/[^0-9.]/g, '')) || null);
    return parseFloat(String(p).replace(/[^0-9.]/g, '')) || null;
  };

  // Explicit shopping results
  const fromShopping = (data.shopping_results ?? []).map(item => ({
    name:        item.title,
    price:       parsePrice(item.price),
    store:       item.source,
    product_url: item.link,
    image_url:   item.thumbnail,
    brand:       item.brand ?? null,
  })).filter(p => p.name && p.product_url);

  // Visual matches — filter to only buyable clothing pages (exclude videos, Pinterest, social media)
  const fromVisual = (data.visual_matches ?? []).slice(0, 30).map(m => ({
    name:        m.title,
    price:       parsePrice(m.price),
    store:       m.source,
    product_url: m.link,
    image_url:   m.thumbnail,
    brand:       null,
  })).filter(m => m.name && m.product_url && m.price && isShoppableUrl(m.product_url));

  // Merge: shopping first (de-duped against visual)
  const seen          = new Set(fromShopping.map(p => p.product_url));
  const uniqueVisual  = fromVisual.filter(m => !seen.has(m.product_url));
  const allProducts   = [...fromShopping, ...uniqueVisual];

  return {
    shopping_results: allProducts,   // unified shoppable list for the UI
    visual_matches:   fromVisual,    // kept separately if needed
  };
}
