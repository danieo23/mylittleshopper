import { createClient } from '@supabase/supabase-js';
import { reverseImageSearch } from '../tools/reverse_image_search.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Downloads an image and re-uploads it to Supabase Storage so SerpAPI
 * can fetch it. Pinterest CDN blocks most external bots.
 */
async function proxyImageToStorage(imageUrl) {
  const res = await fetch(imageUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)' },
    signal:  AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`Image fetch failed: ${res.status}`);

  const arrayBuffer = await res.arrayBuffer();
  const buffer      = Buffer.from(arrayBuffer);
  const contentType = res.headers.get('content-type') ?? 'image/jpeg';
  const ext         = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
  const path        = `pins/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage.from('wardrobe').upload(path, buffer, { contentType, upsert: true });
  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage.from('wardrobe').getPublicUrl(path);
  return publicUrl;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { imageUrl, pinId, userId } = req.body;
  if (!imageUrl || !userId) return res.status(400).json({ error: 'imageUrl and userId required' });

  try {
    // Proxy the image through Supabase so SerpAPI can fetch it
    let fetchUrl = imageUrl;
    try {
      // Only proxy if it's a third-party URL (not already on our storage)
      if (!imageUrl.includes('supabase')) {
        fetchUrl = await proxyImageToStorage(imageUrl);
        // Update the pin's stored image_url to the Supabase URL for future use
        if (pinId) {
          await supabase
            .from('aspiration_items')
            .update({ image_url: fetchUrl })
            .eq('id', pinId)
            .eq('user_id', userId);
        }
      }
    } catch (proxyErr) {
      console.warn('[lens] Image proxy failed, using original URL:', proxyErr.message);
    }

    // Run Google Lens with the proxied URL
    const lens = await reverseImageSearch(fetchUrl);
    const hasResults = lens.shopping_results?.length > 0;

    if (!hasResults) {
      return res.status(200).json({
        shopping_results: { shopping: [], visual: [] },
        debug: 'Google Lens returned no results for this image',
      });
    }

    const shopResults = {
      shopping: lens.shopping_results,
      visual:   lens.visual_matches,
    };

    // Cache results on the pin row
    if (pinId) {
      await supabase
        .from('aspiration_items')
        .update({ shopping_results: shopResults })
        .eq('id', pinId)
        .eq('user_id', userId);
    }

    return res.status(200).json({ shopping_results: shopResults });
  } catch (err) {
    console.error('[lens]', err);
    return res.status(500).json({ error: err.message });
  }
}
