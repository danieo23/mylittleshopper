import { createClient } from '@supabase/supabase-js';
import { analyzeImageStyle } from './analyze_image_style.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Analyze a product's thumbnail image using Claude Vision, with a 7-day cache
 * in the product_embeddings table.
 *
 * Cache hit  → returns stored attributes instantly, no API call.
 * Cache miss → calls analyzeImageStyle(), upserts result with 7-day TTL, returns it.
 *
 * Do not block the search hot path on this: wrap the call in a Promise.race
 * with a short timeout so slow analysis never stalls a request.
 *
 * @param {{ image_url: string, product_url: string }} product
 * @returns {object|null} Style attributes in the same shape as analyzeImageStyle(), or null on failure
 */
export async function analyzeProductThumbnail(product) {
  if (!product?.image_url || !product?.product_url) return null;

  // Cache lookup — only use rows that haven't expired
  try {
    const { data: cached } = await supabase
      .from('product_embeddings')
      .select('item_type, dominant_colors, secondary_colors, fit_type, fabric, formality_score, style_category, brand, occasion_suitability, ocr_text, cultural_signals, confidence')
      .eq('product_url', product.product_url)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (cached) return { ...cached, _fromCache: true };
  } catch {
    // Cache miss or table not ready — fall through to analysis
  }

  // Cache miss — call existing analyzeImageStyle (handles base64 conversion internally)
  let result;
  try {
    result = await analyzeImageStyle(product.image_url, 'wardrobe');
    if (result?.skip_reason) return null;
  } catch {
    return null;
  }

  // Upsert into cache with 7-day TTL
  const now     = new Date();
  const expires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  try {
    await supabase.from('product_embeddings').upsert({
      product_url:          product.product_url,
      image_url:            product.image_url,
      item_type:            result.item_type            ?? null,
      dominant_colors:      result.dominant_colors      ?? [],
      secondary_colors:     result.secondary_colors     ?? [],
      fit_type:             result.fit_type             ?? null,
      fabric:               result.fabric               ?? null,
      formality_score:      result.formality_score      ?? null,
      style_category:       result.style_category       ?? null,
      brand:                result.brand                ?? null,
      occasion_suitability: result.occasion_suitability ?? [],
      ocr_text:             result.ocr_text             ?? null,
      cultural_signals:     result.cultural_signals     ?? [],
      confidence:           result.confidence           ?? 'low',
      analyzed_at:          now.toISOString(),
      expires_at:           expires.toISOString(),
    }, { onConflict: 'product_url' });
  } catch (err) {
    // Write failure is non-fatal — return the result anyway
    console.warn('[product-thumb] cache write failed:', err.message);
  }

  return result;
}

/**
 * Enrich a batch of products with analyzed thumbnail features.
 * Runs all analysis in parallel, capped at totalTimeoutMs total.
 * Products that time out or fail fall back to their title-inferred attributes.
 *
 * Mutates each product in place by merging analyzed attributes.
 * Returns the count of products that were successfully enriched.
 *
 * @param {object[]} products
 * @param {number}   totalTimeoutMs  Default 10 000ms
 * @returns {Promise<number>} count enriched
 */
export async function enrichProductsWithThumbnailAnalysis(products, totalTimeoutMs = 10_000) {
  if (!products?.length) return 0;

  const analysisPromises = products.map(p => analyzeProductThumbnail(p).catch(() => null));

  const results = await Promise.race([
    Promise.allSettled(analysisPromises),
    new Promise(resolve =>
      setTimeout(() => resolve(products.map(() => ({ status: 'rejected', reason: 'batch timeout' }))), totalTimeoutMs)
    ),
  ]);

  let enriched = 0;
  for (let i = 0; i < products.length; i++) {
    const r = results[i];
    if (r?.status !== 'fulfilled' || !r.value) continue;
    const attrs = r.value;

    // Merge: only overwrite fields where analysis produced a real value.
    // Keeps existing product data (name, price, store, product_url, image_url) intact.
    if (attrs.dominant_colors?.length)  products[i].colors         = attrs.dominant_colors;
    if (attrs.fit_type)                 products[i].fit_type        = attrs.fit_type;
    if (attrs.style_category)           products[i].style_category  = attrs.style_category;
    if (attrs.brand)                    products[i].brand           = products[i].brand ?? attrs.brand;
    if (attrs.formality_score != null)  products[i].formality_score = attrs.formality_score;
    if (attrs.occasion_suitability?.length) products[i].occasion_suitability = attrs.occasion_suitability;
    if (attrs.cultural_signals?.length) products[i].cultural_signals = attrs.cultural_signals;
    if (attrs.ocr_text)                 products[i].ocr_text        = attrs.ocr_text;
    enriched++;
  }

  return enriched;
}
