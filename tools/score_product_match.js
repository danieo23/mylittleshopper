import { hexToLab, deltaE, minDeltaE } from './color_distance.js';

// ── Title-inference helpers (fallback when product lacks analyzed attributes) ──

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

// Bucket system retained as fallback for color comparison when product has no hex colors
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

function classifyOccasion(occasion) {
  if (!occasion) return { isSummer: false, isWinter: false, isFormal: false, isAthletic: false };
  const o = occasion.toLowerCase();
  return {
    isSummer:   /summer|warm|hot|italy|europe|tropical|beach|vacation|resort|travel|mediterranean|california|bali|miami|tulum/.test(o),
    isWinter:   /winter|cold|snow|ski|freezing/.test(o),
    isFormal:   /wedding|formal|black.?tie|gala|evening/.test(o),
    isAthletic: /gym|workout|sport|athletic/.test(o),
  };
}

// ── Feedback signal similarity ─────────────────────────────────────────────
// Compares a product's core attributes against a recent feedback signal's stored attributes.
// Returns true when 2+ attributes align — enough signal to apply the factor.
function attributesOverlap(product, signalAttrs, minOverlap = 2) {
  if (!signalAttrs || typeof signalAttrs !== 'object') return false;
  let matches = 0;

  // Fit match
  const productFit  = product.fit_type;
  const signalFit   = signalAttrs.fit_type;
  if (productFit && signalFit && productFit === signalFit) matches++;

  // Style category match
  const productStyle = product.style_category;
  const signalStyle  = signalAttrs.style_category;
  if (productStyle && signalStyle && productStyle === signalStyle) matches++;

  // Color proximity — use Delta-E when both sides have hex values
  const productColors = product.colors ?? [];
  const signalColors  = signalAttrs.colors ?? signalAttrs.dominant_colors ?? [];
  if (productColors.length && signalColors.length) {
    const close = productColors.some(pc =>
      signalColors.some(sc => {
        const labP = hexToLab(pc), labS = hexToLab(sc);
        return labP && labS && deltaE(labP, labS) < 25;
      })
    );
    if (close) matches++;
  }

  return matches >= minOverlap;
}

/**
 * Scores a product against a user's Style DNA.
 *
 * @param {object} product         - Product object (may have analyzed attributes from analyzeProductThumbnail)
 * @param {object} styleDna        - User's Style DNA
 * @param {string|null} occasion   - Occasion string for seasonal/formal adjustments
 * @param {object[]} recentSignals - Last N feedback_signals rows (optional; from getUserProfile)
 *
 * Returns { score: 0-100, breakdown: [], confidence: string, passes: boolean }
 */
export function scoreProductMatch(product, styleDna, occasion = null, recentSignals = []) {
  if (!styleDna) return { score: 40, breakdown: [], confidence: 'low' };

  const isSparse = styleDna.overall_confidence_score === 'low' || styleDna.overall_confidence_score === 'medium';
  let score = isSparse ? 42 : 50;
  const breakdown = [];

  const {
    primary_colors             = [],
    secondary_colors           = [],
    avoided_colors             = [],
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
  const dislikeCounts   = explicit_dislikes.counts ?? {};

  // Use analyzed attributes (from analyzeProductThumbnail) when available;
  // fall back to regex inference from the product title.
  const effectiveFit   = product.fit_type      ?? inferFit(productName);
  const effectiveStyle = product.style_category ?? inferStyle(productName);

  // ── Color scoring ────────────────────────────────────────────────────────
  // When the product has real hex colors (set by analyzeProductThumbnail),
  // use Delta-E perceptual distance against DNA hex values.
  // When only title color words are available, fall back to the bucket system.

  const productHexColors = (product.colors ?? []).filter(c => c?.startsWith('#'));
  const hasRealColors    = productHexColors.length > 0;

  if (hasRealColors) {
    // Delta-E path: compare each DNA hex against product hexes
    // Primary palette — any product color within deltaE 25 of any DNA primary color
    const primaryMatch = primary_colors.some(dnaHex => minDeltaE(dnaHex, productHexColors) < 25);
    // Exact match (deltaE < 5) earns the full +25; close match earns +15
    if (primaryMatch) {
      const exact = primary_colors.some(dnaHex => minDeltaE(dnaHex, productHexColors) < 5);
      const delta = exact ? 25 : 15;
      score += delta;
      breakdown.push({ factor: exact ? 'primary color exact match (Delta-E)' : 'primary color close match (Delta-E)', delta });
    }

    // Secondary palette
    const secondaryMatch = !primaryMatch && secondary_colors.some(dnaHex => minDeltaE(dnaHex, productHexColors) < 25);
    if (secondaryMatch) {
      score += 15; breakdown.push({ factor: 'secondary color match (Delta-E)', delta: +15 });
    }

    // Avoided colors — any product color close to an avoided DNA color
    const avoidedMatch = avoided_colors.some(dnaHex => minDeltaE(dnaHex, productHexColors) < 25);
    if (avoidedMatch) {
      score -= 40; breakdown.push({ factor: 'avoided color (Delta-E)', delta: -40 });
    } else {
      // Soft penalty for a color the user disliked once
      const onceDisliked = productHexColors.some(pc =>
        Object.entries(dislikeCounts.colors ?? {}).some(([dnaHex, cnt]) =>
          cnt === 1 && minDeltaE(dnaHex, [pc]) < 25
        )
      );
      if (onceDisliked) { score -= 12; breakdown.push({ factor: 'color disliked once (Delta-E)', delta: -12 }); }
    }
  } else {
    // Bucket fallback: title color words vs DNA hex→bucket
    const dnaPrimaryBuckets   = primary_colors.map(hexToBucket).filter(Boolean);
    const dnaSecondaryBuckets = secondary_colors.map(hexToBucket).filter(Boolean);
    const dnaAvoidedBuckets   = avoided_colors.map(hexToBucket).filter(Boolean);
    const productColorBuckets = extractTitleColors(productName);

    const inPrimary   = productColorBuckets.some(c => dnaPrimaryBuckets.includes(c));
    const inSecondary = productColorBuckets.some(c => dnaSecondaryBuckets.includes(c));
    const inAvoided   = productColorBuckets.some(c => dnaAvoidedBuckets.includes(c));

    if (inPrimary)   { score += 25; breakdown.push({ factor: 'primary color match (bucket)',   delta: +25 }); }
    if (inSecondary) { score += 15; breakdown.push({ factor: 'secondary color match (bucket)', delta: +15 }); }
    if (inAvoided)   { score -= 40; breakdown.push({ factor: 'avoided color (bucket)',          delta: -40 }); }
    else {
      const maxColorDislikes = Math.max(0, ...productColorBuckets.map(c => dislikeCounts.colors?.[c] ?? 0));
      if (maxColorDislikes === 1) { score -= 12; breakdown.push({ factor: 'color disliked once (bucket)', delta: -12 }); }
    }
  }

  // ── Fit scoring ──────────────────────────────────────────────────────────
  const rejectedFits = [].concat(explicit_dislikes.fits ?? []);
  if (dominant_fit && effectiveFit === dominant_fit) {
    score += 20; breakdown.push({ factor: 'fit matches preference', delta: +20 });
  }
  if (effectiveFit && rejectedFits.includes(effectiveFit)) {
    score -= 35; breakdown.push({ factor: 'fit is in rejected list', delta: -35 });
  } else if (effectiveFit) {
    const fitCount = dislikeCounts.fits?.[effectiveFit] ?? 0;
    if (fitCount === 1) { score -= 15; breakdown.push({ factor: 'fit disliked once', delta: -15 }); }
  }

  // ── Style category ───────────────────────────────────────────────────────
  const rejectedStyles = [].concat(explicit_dislikes.styles ?? []);
  if (effectiveStyle && effectiveStyle === primary_style_category) {
    score += 20; breakdown.push({ factor: 'primary style match', delta: +20 });
  } else if (effectiveStyle && secondary_categories.includes(effectiveStyle)) {
    score += 10; breakdown.push({ factor: 'secondary style match', delta: +10 });
  }
  if (effectiveStyle && rejectedStyles.includes(effectiveStyle)) {
    score -= 30; breakdown.push({ factor: 'style in rejected list', delta: -30 });
  } else if (effectiveStyle) {
    const styleCount = dislikeCounts.styles?.[effectiveStyle] ?? 0;
    if (styleCount === 1) { score -= 12; breakdown.push({ factor: 'style disliked once', delta: -12 }); }
  }

  // ── Brand ────────────────────────────────────────────────────────────────
  if (productBrand && brand_affinities.includes(productBrand)) {
    score += 10; breakdown.push({ factor: 'brand affinity', delta: +10 });
  }
  if (productBrand && brand_rejections.includes(productBrand)) {
    score -= 20; breakdown.push({ factor: 'brand rejection', delta: -20 });
  } else if (productBrand) {
    const brandCount = dislikeCounts.brands?.[productBrand] ?? 0;
    if (brandCount === 1) { score -= 8;  breakdown.push({ factor: 'brand disliked once',  delta: -8  }); }
    if (brandCount === 2) { score -= 16; breakdown.push({ factor: 'brand disliked twice', delta: -16 }); }
  }

  // ── Price ────────────────────────────────────────────────────────────────
  const typicalSpend = per_category_price_sensitivity[productCategory];
  if (typicalSpend && productPrice) {
    if (productPrice <= typicalSpend * 1.2) {
      score += 10; breakdown.push({ factor: 'price within typical range', delta: +10 });
    } else if (productPrice > typicalSpend * 2) {
      score -= 20; breakdown.push({ factor: 'price over typical spend', delta: -20 });
    }
  }

  // ── Source quality bonus/penalty ─────────────────────────────────────────
  if (product.result_source === 'shopify') {
    score += 5;  breakdown.push({ factor: 'clean Shopify source', delta: +5 });
  } else if (product.result_source === 'generic_web') {
    score -= 5;  breakdown.push({ factor: 'generic web source', delta: -5 });
  }

  // ── Feedback signal similarity ───────────────────────────────────────────
  // Compare this product's attributes against the user's last 50 feedback signals.
  // 2+ attribute matches with an approval → +15; with a rejection → −30.
  if (recentSignals.length > 0) {
    let approvalBonus = 0, rejectionPenalty = 0;
    for (const sig of recentSignals) {
      const attrs = sig.item_attributes_json;
      if (!attrs) continue;
      if ((sig.signal_type === 'approval' || sig.signal_type === 'post_delivery_positive') &&
          attributesOverlap(product, attrs)) {
        approvalBonus = 15; // apply once even if multiple approvals match
      }
      if ((sig.signal_type === 'rejection' || sig.signal_type === 'post_delivery_negative') &&
          attributesOverlap(product, attrs)) {
        rejectionPenalty = -30;
        break; // one rejection match is enough to penalize
      }
    }
    if (rejectionPenalty) {
      score += rejectionPenalty; breakdown.push({ factor: 'similar to previously rejected item', delta: rejectionPenalty });
    } else if (approvalBonus) {
      score += approvalBonus;    breakdown.push({ factor: 'similar to previously approved item', delta: approvalBonus });
    }
  }

  // ── Occasion / season ────────────────────────────────────────────────────
  const { isSummer, isWinter, isFormal, isAthletic } = classifyOccasion(occasion);
  const n = productName.toLowerCase();

  if (isSummer) {
    if (/hoodie|sweatshirt|puffer|parka|peacoat|overcoat|fleece|wool|flannel|sweater|knit|turtleneck|thermal|windbreaker|down jacket/.test(n)) {
      score -= 35; breakdown.push({ factor: 'heavy item for summer/warm occasion', delta: -35 });
    }
    if (/linen|cotton|chambray|seersucker|gauze|short.?sleeve|shorts|sandal|lightweight|breathable|airy|linen-blend/.test(n)) {
      score += 15; breakdown.push({ factor: 'light item for summer/warm occasion', delta: +15 });
    }
  }
  if (isWinter) {
    if (/shorts|sandal|sleeveless|crop top|swimwear|swim|bikini/.test(n)) {
      score -= 25; breakdown.push({ factor: 'too light for winter occasion', delta: -25 });
    }
    if (/wool|fleece|puffer|coat|knit|thermal|sweater|insulated/.test(n)) {
      score += 10; breakdown.push({ factor: 'warm item for winter occasion', delta: +10 });
    }
  }
  if (isFormal) {
    if (/hoodie|sweatshirt|sneaker|flip.?flop|cargo|jogger|athletic|graphic tee/.test(n)) {
      score -= 30; breakdown.push({ factor: 'too casual for formal occasion', delta: -30 });
    }
  }
  if (isAthletic) {
    if (/athletic|sport|gym|workout|performance|active|training/.test(n)) {
      score += 15; breakdown.push({ factor: 'athletic item for workout occasion', delta: +15 });
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
