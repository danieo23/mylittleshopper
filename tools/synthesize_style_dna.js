import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const RECENCY_WEIGHT = (uploadedAt) => {
  const days = (Date.now() - new Date(uploadedAt).getTime()) / (1000 * 60 * 60 * 24);
  if (days <= 30)  return 2.0;
  if (days <= 180) return 1.0;
  return 0.5;
};

function topN(freq, n = 5) {
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k]) => k);
}

function buildFrequencyMap(items, getter, weightFn = () => 1) {
  const map = {};
  for (const item of items) {
    const values = [].concat(getter(item) ?? []);
    const w = weightFn(item);
    for (const v of values) {
      if (v) map[v] = (map[v] ?? 0) + w;
    }
  }
  return map;
}

/**
 * Synthesizes all wardrobe + aspiration items into an updated Style DNA.
 * Writes the result to the style_dna table.
 */
export async function synthesizeStyleDna(userId) {
  const [{ data: wardrobe }, { data: aspirationRaw }, { data: existingDna }] = await Promise.all([
    supabase.from('wardrobe_items').select('*').eq('user_id', userId),
    supabase.from('aspiration_items').select('*').eq('user_id', userId),
    supabase.from('style_dna').select('explicit_dislikes,avoided_colors,brand_rejections,per_category_price_sensitivity').eq('user_id', userId).single(),
  ]);

  // pinterest_owned boards = outfits the user actually wears → treated as wardrobe
  // pinterest / other sources = aspiration / inspiration → treated as aspirational
  const ownedPins   = (aspirationRaw ?? []).filter(i => i.source_type === 'pinterest_owned');
  const aspiration  = (aspirationRaw ?? []).filter(i => i.source_type !== 'pinterest_owned');

  const all = [
    ...(wardrobe   ?? []).map(i => ({ ...i, _source: 'wardrobe',    _date: i.uploaded_at })),
    ...ownedPins        .map(i => ({ ...i, _source: 'wardrobe',    _date: i.analyzed_at })),
    ...aspiration       .map(i => ({ ...i, _source: 'aspiration', _date: i.analyzed_at })),
  ];

  if (all.length === 0) return null;

  const wFn = (i) => RECENCY_WEIGHT(i._date);

  // Colors
  const primaryColorFreq   = buildFrequencyMap(all, i => i.colors?.slice(0, 2), wFn);
  const secondaryColorFreq = buildFrequencyMap(all, i => i.colors?.slice(2, 4), wFn);
  const primaryColors   = topN(primaryColorFreq, 5);
  const secondaryColors = topN(secondaryColorFreq, 3);

  // Fit
  const fitFreq = buildFrequencyMap(all, i => i.fit_type, wFn);
  const dominantFit = topN(fitFreq, 1)[0] ?? null;
  const fitValues = Object.values(fitFreq);
  const fitTotal  = fitValues.reduce((s, v) => s + v, 0);
  const fitMax    = Math.max(...fitValues, 1);
  const fitConsistencyScore = Math.round((fitMax / fitTotal) * 100);

  // Style categories
  const styleFreq = buildFrequencyMap(all, i => i.style_category, wFn);
  const [primaryStyleCategory, ...otherCategories] = topN(styleFreq, 3);
  const secondaryCategories = otherCategories.filter(Boolean);

  // Formality
  const formalityScores = all
    .filter(i => i.formality_score != null)
    .map(i => ({ score: i.formality_score, w: wFn(i) }));
  const weightedFormality = formalityScores.length > 0
    ? formalityScores.reduce((s, i) => s + i.score * i.w, 0) /
      formalityScores.reduce((s, i) => s + i.w, 0)
    : 5;
  const formalityMin = Math.max(1, Math.round(weightedFormality - 1.5));
  const formalityMax = Math.min(10, Math.round(weightedFormality + 1.5));

  // Brands
  const brandFreq = buildFrequencyMap(all, i => i.brand, wFn);
  const brandAffinities = topN(brandFreq, 10);

  // Cultural profile: aggregate cultural_signals from wardrobe items.
  // cultural_signals is stored by analyze.js after the OCR dual-pass prompt.
  // Older items (pre-migration) have null — they'll contribute once re-analyzed.
  const culturalFreq = buildFrequencyMap(
    [...(wardrobe ?? []), ...ownedPins],
    i => i.cultural_signals ?? [],
    wFn
  );
  const culturalProfile = topN(culturalFreq, 8).filter(Boolean);

  // OCR summary: verbatim text found on garments, deduplicated.
  // Stored so search_products can use the actual band/brand names as brand-selection context.
  const ocrSummary = [...new Set(
    [...(wardrobe ?? []), ...ownedPins]
      .map(i => i.ocr_text)
      .filter(Boolean)
  )].slice(0, 20);

  // Aspiration gap: style categories in pure aspiration but absent from owned items
  // (wardrobe photos + owned Pinterest boards = "what I actually wear")
  const ownedStyles = new Set([
    ...(wardrobe   ?? []).map(i => i.style_category),
    ...ownedPins        .map(i => i.style_category),
  ].filter(Boolean));
  const aspirationStyleFreq = buildFrequencyMap(aspiration, i => i.style_category);
  const aspirationGap = Object.entries(aspirationStyleFreq)
    .filter(([style]) => !ownedStyles.has(style))
    .sort((a, b) => b[1] - a[1])
    .map(([style]) => style);

  // Confidence
  const imageCount = all.length;
  const overallConfidenceScore = imageCount < 20 ? 'low' : imageCount < 50 ? 'medium' : 'high';

  const dna = {
    user_id:                  userId,
    primary_colors:           primaryColors,
    secondary_colors:         secondaryColors,
    avoided_colors:           existingDna?.avoided_colors ?? [],
    dominant_fit:             dominantFit,
    fit_consistency_score:    fitConsistencyScore,
    primary_style_category:   primaryStyleCategory ?? null,
    secondary_categories:     secondaryCategories,
    formality_range_min:      formalityMin,
    formality_range_max:      formalityMax,
    brand_affinities:         brandAffinities,
    brand_rejections:         existingDna?.brand_rejections ?? [],
    // Preserve learned dislike data from feedback; only update the cultural_profile key.
    // Without this merge, re-synthesizing would erase all rejection signals.
    explicit_dislikes: {
      ...(existingDna?.explicit_dislikes ?? {}),
      cultural_profile: culturalProfile,
      ocr_summary:      ocrSummary,
    },
    aspiration_gap:           aspirationGap,
    // Preserve per-category price sensitivity learned from approvals
    per_category_price_sensitivity: existingDna?.per_category_price_sensitivity ?? {},
    overall_confidence_score: overallConfidenceScore,
    last_synthesized_at:      new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('style_dna')
    .upsert(dna, { onConflict: 'user_id' })
    .select()
    .single();

  if (error) throw error;
  return data;
}
