/**
 * Scores a product against a user's Style DNA.
 * Returns a score 0-100 and a breakdown of contributing factors.
 * Products scoring 60+ pass to the outfit builder.
 * Products scoring 85+ are flagged as high-confidence picks.
 */
export function scoreProductMatch(product, styleDna) {
  if (!styleDna) return { score: 50, breakdown: [], confidence: 'low' };

  let score = 50; // neutral baseline
  const breakdown = [];

  const {
    primary_colors    = [],
    secondary_colors  = [],
    avoided_colors    = [],
    dominant_fit,
    primary_style_category,
    secondary_categories  = [],
    brand_affinities      = [],
    brand_rejections      = [],
    explicit_dislikes     = {},
    per_category_price_sensitivity = {},
  } = styleDna;

  const productColors  = [].concat(product.colors ?? []);
  const productStyle   = product.style_category;
  const productFit     = product.fit_type;
  const productBrand   = product.brand;
  const productPrice   = product.price;
  const productCategory = product.category;

  // ── Color scoring ──────────────────────────────────────────────
  const inPrimary   = productColors.some(c => primary_colors.includes(c));
  const inSecondary = productColors.some(c => secondary_colors.includes(c));
  const inAvoided   = productColors.some(c => avoided_colors.includes(c));

  if (inPrimary)   { score += 25; breakdown.push({ factor: 'primary color match',   delta: +25 }); }
  if (inSecondary) { score += 15; breakdown.push({ factor: 'secondary color match', delta: +15 }); }
  if (inAvoided)   { score -= 40; breakdown.push({ factor: 'avoided color',          delta: -40 }); }

  // ── Fit scoring ────────────────────────────────────────────────
  const rejectedFits = [].concat(explicit_dislikes.fits ?? []);
  if (dominant_fit && productFit === dominant_fit) {
    score += 20; breakdown.push({ factor: 'fit matches preference', delta: +20 });
  }
  if (productFit && rejectedFits.includes(productFit)) {
    score -= 35; breakdown.push({ factor: 'fit is in rejected list', delta: -35 });
  }

  // ── Style category ─────────────────────────────────────────────
  if (productStyle && productStyle === primary_style_category) {
    score += 20; breakdown.push({ factor: 'primary style category match', delta: +20 });
  } else if (productStyle && secondary_categories.includes(productStyle)) {
    score += 10; breakdown.push({ factor: 'secondary style category match', delta: +10 });
  }

  // ── Brand ──────────────────────────────────────────────────────
  if (productBrand && brand_affinities.includes(productBrand)) {
    score += 10; breakdown.push({ factor: 'brand affinity', delta: +10 });
  }
  if (productBrand && brand_rejections.includes(productBrand)) {
    score -= 20; breakdown.push({ factor: 'brand rejection', delta: -20 });
  }

  // ── Price ──────────────────────────────────────────────────────
  const typicalSpend = per_category_price_sensitivity[productCategory];
  if (typicalSpend && productPrice) {
    if (productPrice <= typicalSpend * 1.2) {
      score += 10; breakdown.push({ factor: 'price within typical range', delta: +10 });
    } else if (productPrice > typicalSpend * 2) {
      score -= 20; breakdown.push({ factor: 'price significantly over typical spend', delta: -20 });
    }
  }

  const clamped = Math.max(0, Math.min(100, score));
  return {
    score: clamped,
    breakdown,
    confidence: clamped >= 85 ? 'high' : clamped >= 60 ? 'medium' : 'low',
    passes: clamped >= 60,
  };
}
