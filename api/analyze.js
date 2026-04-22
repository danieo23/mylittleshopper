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

// ── Wardrobe analysis ─────────────────────────────────────────────
async function analyzeWardrobe(userId) {
  // Filter on style_category IS NULL — avoids dependency on the `analyzed` boolean column
  // which may be missing or null on older rows. Re-runs if style_category is still null after a failed pass.
  const { data: items } = await supabase
    .from('wardrobe_items')
    .select('id, image_url')
    .eq('user_id', userId)
    .is('style_category', null);

  if (!items?.length) return { analyzed: 0 };

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

  // Remove only the pins from THIS board — other boards' pins are preserved
  await supabase.from('aspiration_items')
    .delete()
    .eq('user_id', userId)
    .eq('source_type', 'pinterest')
    .eq('source_url', boardUrl);

  let analyzed = 0;
  // Cap at 10 pins — each needs a Claude Vision call + reverse image search (~5s each)
  const toProcess = scraped.images.slice(0, 10);

  await inBatches(toProcess, async (imageUrl) => {
    let styleResult = null;
    let shopResults = null;

    // Analyze style
    try {
      styleResult = await analyzeImageStyle(imageUrl, 'aspiration');
      if (styleResult.skip_reason) return;
    } catch { return; }

    // Reverse image search
    try {
      shopResults = await reverseImageSearch(imageUrl);
    } catch { shopResults = null; }

    await supabase.from('aspiration_items').insert({
      user_id:         userId,
      source_type:     'pinterest',
      source_url:      boardUrl,
      image_url:       imageUrl,
      colors:          styleResult.dominant_colors,
      fit_type:        styleResult.fit_type,
      formality_score: styleResult.formality_score,
      style_category:  styleResult.style_category,
      brand:           styleResult.brand,
      shopping_results: shopResults
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
  // DELETE /api/analyze — remove a single aspiration (shoppable pin) item
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

    // Always re-synthesize Style DNA after analysis
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
