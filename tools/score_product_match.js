// ── Helpers: infer style attributes from product title ────────────
// SerpAPI products have colors/fit/style = null. These extract signals
// from the title text so scoring actually works.

function hexToBucket(hex) {
  if (!hex || typeof hex !== 'string') return null;
  const h = hex.replace('#', '').padEnd(6, '0');
  const r = parseInt(h.slice(0,2), 16) || 0;
  const g = parseInt(h.slice(2,4), 16) || 0;
  const b = parseInt(h.slice(4,6), 16) || 0;
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  const max = Math.max(r, g, b);
  const sat = max === 0 ? 0 : (max - Math.min(r, g, b)) / max;
  if (brightness < 35)                return 'black';
  if (brightness > 220 && sat < 0.1) return 'white';
  if (sat < 0.15) {
    if (brightness < 80)  return 'charcoal';
    if (brightness < 150) return 'gray';
    return 'off-white';
  }
  let hue = Math.atan2(Math.sqrt(3) * (g - b), 2 * r - g - b) * (180 / Math.PI);
  if (hue < 0) hue += 360;
  if (sat < 0.35 && brightness > 100 && r >= g && r >= b) {
    if (brightness > 200) return 'cream';
    if (brightness > 160) return 'beige';
    if (brightness > 120) return 'tan';
    return 'camel';
  }
  if (hue < 20 || hue >= 345) return brightness < 100 ? 'burgundy' : 'red';
  if (hue < 40)  return brightness < 120 ? 'rust' : 'orange';
  if (hue < 70)  return sat < 0.4 ? 'sand' : 'yellow';
  if (hue < 165) return sat < 0.5 ? 'olive' : 'green';
  if (hue < 200) return 'teal';
  if (hue < 240) return brightness < 80 ? 'navy' : brightness < 150 ? 'cobalt' : 'blue';
  if (hue < 295) return 'purple';
  return 'pink';
}

const COLOR_TERMS = [
  'black','white','navy','blue','red','green','gray','brown','beige','cream',
  'ivory','tan','camel','sand','stone','taupe','olive','sage','teal','cobalt',
  'burgundy','rust','orange','yellow','pink','purple','mauve','charcoal',
  'ecru','khaki','nude','blush','lilac','mint','coral','rose','indigo',
  'off-white','slate','amber','terracotta','mustard',
];

function extractTitleColors(name) {
  const t = (name ?? '').toLowerCase().replace('grey', 'gray');
  return COLOR_TERMS.filter(c => t.includes(c));
}

function inferFit(name) {
  const t = (name ?? '').toLowerCase();
  if (t.includes('oversized'))                              return 'oversized';
  if (/relaxed|loose|wide.leg|wide leg|baggy|boxy/.test(t)) return 'relaxed';
  if (/slim|skinny/.test(t))                               return 'slim';
  if (/tailored|structured|tapered/.test(t))               return 'tailored';
  if (/fitted|bodycon|form.fit/.test(t))                   return 'fitted';
  return null;
}

function inferStyle(name) {
  const t = (name ?? '').toLowerCase();
  if (/linen|resort|beach|vacation|tropical|swim/.test(t))            return 'coastal';
  if (/athletic|sport|gym|workout|jogger|sweat|active/.test(t))       return 'athleisure';
  if (/hoodie|graphic tee|streetwear|cargo|skate/.test(t))            return 'streetwear';
  if (/minimal|clean.cut/.test(t))                                     return 'minimalist';
  if (/vintage|retro|90s|80s|washed/.test(t))                         return 'vintage';
  if (/blazer|trouser|dress shirt|business|workwear/.test(t))         return 'smart_casual';
  if (/preppy|polo shirt|plaid|argyle/.test(t))                       return 'preppy';
  if (/boho|flowy|peasant|folk/.test(t))                              return 'bohemian';
  if (/dark academia|gothic|academia/.test(t))                        return 'dark_academia';
  return null;
}

/**
 * Scores a product against a user's Style DNA.
 * Returns a score 0-100 and a breakdown of contributing factors.
 * Products scoring 60+ pass to the outfit builder.
 * Products scoring 85+ are flagged as high-confidence picks.
 */
export function scoreProductMatch(product, styleDna) {
  if (!styleDna) return { score: 50, breakdown: [], confidence: 'low' };

  let score = 50;
  const breakdown = [];

  const {
    primary_colors         = [],
    secondary_colors       = [],
    avoided_colors         = [],
    dominant_fit,
    primary_style_category,
    secondary_categories       = [],
    brand_affinities           = [],
    brand_rejections           = [],
    explicit_dislikes          = {},
    per_category_price_sensitivity = {},
  } = styleDna;

  const productName     = product.name ?? '';
  const productBrand    = product.brand;
  const productPrice    = product.price;
  const productCategory = product.category;

  // Use explicit attributes when set, otherwise infer from title
  const effectiveFit   = product.fit_type     ?? inferFit(productName);
  const effectiveStyle = product.style_category ?? inferStyle(productName);

  // Colors: use explicit hex array if present, otherwise extract words from title.
  // DNA colors are always hex → convert to buckets for apples-to-apples comparison.
  const dnaPrimaryBuckets   = primary_colors.map(hexToBucket).filter(Boolean);
  const dnaSecondaryBuckets = secondary_colors.map(hexToBucket).filter(Boolean);
  const dnaAvoidedBuckets   = avoided_colors.map(hexToBucket).filter(Boolean);

  const productColorBuckets = product.colors?.length
    ? product.colors.map(hexToBucket).filter(Boolean)
    : extractTitleColors(productName);

  // ── Color scoring ──────────────────────────────────────────────
  const inPrimary   = productColorBuckets.some(c => dnaPrimaryBuckets.includes(c));
  const inSecondary = productColorBuckets.some(c => dnaSecondaryBuckets.includes(c));
  const inAvoided   = productColorBuckets.some(c => dnaAvoidedBuckets.includes(c));

  if (inPrimary)   { score += 25; breakdown.push({ factor: 'primary color match',   delta: +25 }); }
  if (inSecondary) { score += 15; breakdown.push({ factor: 'secondary color match', delta: +15 }); }
  if (inAvoided)   { score -= 40; breakdown.push({ factor: 'avoided color',          delta: -40 }); }

  // ── Fit scoring ────────────────────────────────────────────────
  const rejectedFits = [].concat(explicit_dislikes.fits ?? []);
  if (dominant_fit && effectiveFit === dominant_fit) {
    score += 20; breakdown.push({ factor: 'fit matches preference', delta: +20 });
  }
  if (effectiveFit && rejectedFits.includes(effectiveFit)) {
    score -= 35; breakdown.push({ factor: 'fit is in rejected list', delta: -35 });
  }

  // ── Style category ─────────────────────────────────────────────
  if (effectiveStyle && effectiveStyle === primary_style_category) {
    score += 20; breakdown.push({ factor: 'primary style match', delta: +20 });
  } else if (effectiveStyle && secondary_categories.includes(effectiveStyle)) {
    score += 10; breakdown.push({ factor: 'secondary style match', delta: +10 });
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
      score -= 20; breakdown.push({ factor: 'price over typical spend', delta: -20 });
    }
  }

  const clamped = Math.max(0, Math.min(100, score));
  return {
    score:      clamped,
    breakdown,
    confidence: clamped >= 85 ? 'high' : clamped >= 60 ? 'medium' : 'low',
    passes:     clamped >= 60,
  };
}
