import { createClient } from '@supabase/supabase-js';
import { analyzeImageStyle }  from '../tools/analyze_image_style.js';
import { synthesizeStyleDna } from '../tools/synthesize_style_dna.js';
import { scrapePublicImages } from '../tools/scrape_public_images.js';
import { reverseImageSearch } from '../tools/reverse_image_search.js';

export const config = { maxDuration: 120 };

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Run a list of async tasks in parallel batches
async function inBatches(items, fn, size = 3) {
  const results = [];
  for (let i = 0; i < items.length; i += size) {
    const batch = await Promise.allSettled(items.slice(i, i + size).map(fn));
    results.push(...batch);
  }
  return results;
}

/**
 * Downloads an image and re-uploads it to Supabase Storage so that
 * SerpAPI (and any other external service) can fetch it reliably.
 * Pinterest CDN blocks most bots — serving from our own storage fixes this.
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

// ── Wardrobe analysis ─────────────────────────────────────────────
async function analyzeWardrobe(userId) {
  const { data: allItems } = await supabase
    .from('wardrobe_items')
    .select('*')
    .eq('user_id', userId);

  const items = (allItems ?? []).filter(i => !i.style_category);
  if (!items.length) return { analyzed: 0, alreadyDone: true };

  let analyzed = 0;
  await inBatches(items, async (item) => {
    const result = await analyzeImageStyle(item.image_url, 'wardrobe');
    if (result.skip_reason) return;
    await supabase.from('wardrobe_items').update({
      colors:               result.dominant_colors,
      fit_type:             result.fit_type,
      formality_score:      result.formality_score,
      style_category:       result.style_category ?? 'unclassified',
      brand:                result.brand,
      fabric:               result.fabric,
      occasion_suitability: result.occasion_suitability,
    }).eq('id', item.id);
    analyzed++;
  });

  return { analyzed };
}

// ── Pinterest analysis ────────────────────────────────────────────
async function analyzePinterest(userId, boardUrl) {
  const scraped = await scrapePublicImages(boardUrl);

  if (!scraped.images?.length) {
    return { error: scraped.error, userMessage: scraped.userMessage, analyzed: 0 };
  }

  await supabase.from('aspiration_items')
    .delete()
    .eq('user_id', userId)
    .eq('source_type', 'pinterest')
    .eq('source_url', boardUrl);

  let analyzed = 0;
  const uniqueImages = [...new Set(scraped.images.map(u => u.replace(/\/(?:474x|236x|originals)\//, '/736x/')))];
  const toProcess = uniqueImages.slice(0, 10);

  await inBatches(toProcess, async (imageUrl) => {
    let styleResult = null;
    let shopResults = null;
    let storedUrl   = imageUrl;

    // Analyze style first — Claude downloads the image as Googlebot so this works even
    // if Pinterest blocks regular bots
    try {
      styleResult = await analyzeImageStyle(imageUrl, 'aspiration');
      if (styleResult.skip_reason) return;
    } catch { return; }

    // Proxy image to Supabase Storage so SerpAPI can reliably fetch it
    try {
      storedUrl = await proxyImageToStorage(imageUrl);
    } catch {
      storedUrl = imageUrl; // fall back to Pinterest URL
    }

    // Google Lens — pass the Supabase URL, not the Pinterest CDN URL
    try {
      shopResults = await reverseImageSearch(storedUrl);
    } catch { shopResults = null; }

    await supabase.from('aspiration_items').insert({
      user_id:          userId,
      source_type:      'pinterest',
      source_url:       boardUrl,
      image_url:        storedUrl,  // stored as Supabase URL from now on
      colors:           styleResult.dominant_colors,
      fit_type:         styleResult.fit_type,
      formality_score:  styleResult.formality_score,
      style_category:   styleResult.style_category,
      brand:            styleResult.brand,
      individual_items: styleResult.individual_items ?? null,
      shopping_results: shopResults?.shopping_results?.length
        ? { shopping: shopResults.shopping_results, visual: shopResults.visual_matches }
        : null,
    });
    analyzed++;
  }, 3);

  return {
    analyzed,
    total:     toProcess.length,
    isPartial: scraped.isPartial,
    source:    scraped.source,
  };
}

// ── Handler ───────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method === 'DELETE') {
    const { pinId } = req.body;
    if (!pinId) return res.status(400).json({ error: 'pinId required' });
    const { error } = await supabase.from('aspiration_items').delete().eq('id', pinId);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { userId, type = 'wardrobe', boardUrl } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  try {
    let result = {};

    if (type === 'wardrobe') {
      result = await analyzeWardrobe(userId);
    } else if (type === 'pinterest') {
      if (!boardUrl) return res.status(400).json({ error: 'boardUrl required for pinterest analysis' });
      result = await analyzePinterest(userId, boardUrl);
      if (result.error) return res.status(200).json({ success: false, ...result });
    }

    const dna = await synthesizeStyleDna(userId);

    return res.status(200).json({
      success: true,
      ...result,
      confidence: dna?.overall_confidence_score ?? 'low',
    });
  } catch (err) {
    console.error('[analyze]', err);
    return res.status(500).json({ error: err.message });
  }
}
