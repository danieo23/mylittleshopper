import { updateStyleDna } from '../tools/update_style_dna.js';

// ── Attribute inference (mirrors score_product_match.js) ──────────
// SerpAPI products arrive with fit_type/style_category/colors = null.
// Infer from the product name so dislike signals actually train the DNA.
const COLOR_TERMS = [
  'black','white','navy','blue','red','green','gray','brown','beige','cream',
  'ivory','tan','camel','sand','stone','taupe','olive','sage','teal','cobalt',
  'burgundy','rust','orange','yellow','pink','purple','mauve','charcoal',
  'ecru','khaki','nude','blush','lilac','mint','coral','rose','indigo',
  'off-white','slate','amber','terracotta','mustard',
];

function inferFit(name) {
  const t = (name ?? '').toLowerCase();
  if (t.includes('oversized'))                               return 'oversized';
  if (/relaxed|loose|wide.leg|wide leg|baggy|boxy/.test(t)) return 'relaxed';
  if (/slim|skinny/.test(t))                                return 'slim';
  if (/tailored|structured|tapered/.test(t))                return 'tailored';
  if (/fitted|bodycon|form.fit/.test(t))                    return 'fitted';
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
  return null;
}

function inferColors(name) {
  const t = (name ?? '').toLowerCase().replace('grey', 'gray');
  return COLOR_TERMS.filter(c => t.includes(c));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { userId, signalType, itemAttributes, inferredReason } = req.body;
  if (!userId || !signalType || !itemAttributes) {
    return res.status(400).json({ error: 'userId, signalType, and itemAttributes required' });
  }

  // Enrich null attributes from product name so DNA actually learns the pattern
  const enriched = { ...itemAttributes };
  const productName = enriched.name ?? '';
  if (!enriched.fit_type)         enriched.fit_type       = inferFit(productName);
  if (!enriched.style_category)   enriched.style_category = inferStyle(productName);
  if (!enriched.colors?.length)   enriched.colors         = inferColors(productName);

  try {
    await updateStyleDna(userId, signalType, enriched, null, inferredReason ?? null);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[feedback]', err);
    return res.status(500).json({ error: err.message });
  }
}
