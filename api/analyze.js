import { createClient } from '@supabase/supabase-js';
import { analyzeImageStyle }  from '../tools/analyze_image_style.js';
import { synthesizeStyleDna } from '../tools/synthesize_style_dna.js';
import { scrapePublicImages } from '../tools/scrape_public_images.js';

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

  // Process items that are missing style_category OR item_type.
  // This catches newly uploaded items AND items analyzed before item_type was stored.
  const items = (allItems ?? []).filter(i => !i.style_category || !i.item_type);
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
      item_type:            result.item_type ?? null,
      brand:                result.brand,
      fabric:               result.fabric,
      occasion_suitability: result.occasion_suitability,
      ocr_text:             result.ocr_text ?? null,
      cultural_signals:     result.cultural_signals ?? [],
      analyzed:             true,
    }).eq('id', item.id);
    analyzed++;
  });

  return { analyzed };
}

// ── Pinterest analysis ────────────────────────────────────────────
// boardType: 'aspiration' (inspo/want) | 'owned' (outfits user actually wears)
// Owned boards are stored in aspiration_items with source_type 'pinterest_owned'
// so they contribute to the wardrobe side of Style DNA synthesis, not the aspiration gap.
async function analyzePinterest(userId, boardUrl, boardType = 'aspiration') {
  const scraped = await scrapePublicImages(boardUrl);

  if (!scraped.images?.length) {
    return { error: scraped.error, userMessage: scraped.userMessage, analyzed: 0 };
  }

  const sourceType = boardType === 'owned' ? 'pinterest_owned' : 'pinterest';
  const analyzeAs  = boardType === 'owned' ? 'wardrobe'     : 'aspiration';

  // Clear old items for this board (both types, in case the user switched)
  await supabase.from('aspiration_items')
    .delete()
    .eq('user_id', userId)
    .in('source_type', ['pinterest', 'pinterest_owned'])
    .eq('source_url', boardUrl);

  let analyzed = 0;
  const uniqueImages = [...new Set(scraped.images.map(u => u.replace(/\/(?:474x|236x|originals)\//, '/736x/')))];
  const toProcess = uniqueImages.slice(0, 20);

  await inBatches(toProcess, async (imageUrl) => {
    let styleResult = null;
    let storedUrl   = imageUrl;

    try {
      styleResult = await analyzeImageStyle(imageUrl, analyzeAs);
      if (styleResult.skip_reason) return;
    } catch { return; }

    // Proxy image to Supabase Storage so SerpAPI can reliably fetch it on demand
    try {
      storedUrl = await proxyImageToStorage(imageUrl);
    } catch {
      storedUrl = imageUrl;
    }

    await supabase.from('aspiration_items').insert({
      user_id:          userId,
      source_type:      sourceType,
      source_url:       boardUrl,
      image_url:        storedUrl,
      colors:           styleResult.dominant_colors,
      fit_type:         styleResult.fit_type,
      formality_score:  styleResult.formality_score,
      style_category:   styleResult.style_category,
      brand:            styleResult.brand,
      individual_items: styleResult.individual_items ?? null,
      shopping_results: null,
    });
    analyzed++;
  }, 5);

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

  const { userId, type = 'wardrobe', boardUrl, boardType = 'aspiration' } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  try {
    let result = {};

    if (type === 'wardrobe') {
      result = await analyzeWardrobe(userId);
    } else if (type === 'pinterest') {
      if (!boardUrl) return res.status(400).json({ error: 'boardUrl required for pinterest analysis' });
      result = await analyzePinterest(userId, boardUrl, boardType);
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
