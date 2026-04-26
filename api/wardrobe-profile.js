import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const client  = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Known music artists / bands — when these appear as `brand`, they signal a band tee
const MUSIC_ARTISTS = new Set([
  'radiohead','the cure','oasis','nirvana','metallica','joy division','the smiths',
  'arctic monkeys','led zeppelin','the beatles','rolling stones','pink floyd',
  'david bowie','the clash','sex pistols','sonic youth','pixies','blur','pulp',
  'suede','placebo','nine inch nails','tool','alice in chains','soundgarden',
  'pearl jam','fugazi','minor threat','bad brains','the misfits','ramones','clash',
  'wu-tang clan','biggie','tupac','nas','jay-z','kendrick lamar','frank ocean',
  'tyler the creator','mac demarco','alex g','palm','widowspeak','beach house',
  'the national','lcd soundsystem','interpol','the strokes','kings of leon',
  'white stripes','black keys','jack white','the xx','mgmt','tame impala',
  'beagles','beatles', // parody/bootleg forms
]);

function isMusicArtist(brand) {
  return brand && MUSIC_ARTISTS.has(brand.toLowerCase().trim());
}

function hexToBucket(hex) {
  if (!hex || typeof hex !== 'string') return null;
  const h = hex.replace('#', '').padEnd(6, '0');
  const r = parseInt(h.slice(0,2), 16) || 0;
  const g = parseInt(h.slice(2,4), 16) || 0;
  const b = parseInt(h.slice(4,6), 16) || 0;
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  const max = Math.max(r, g, b);
  const sat = max === 0 ? 0 : (max - Math.min(r, g, b)) / max;
  if (brightness < 35) return 'black';
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

// Pre-aggregate stats so Claude gets hard numbers to reason from
function buildWardrobeStats(items) {
  const total = items.length;

  const bandTees = items.filter(i => isMusicArtist(i.brand));
  const graphicItems = items.filter(i => i.style_category === 'streetwear' || i.brand);

  // Color distribution
  const colorCounts = {};
  for (const item of items) {
    for (const hex of (item.colors ?? []).slice(0, 2)) {
      const bucket = hexToBucket(hex);
      if (bucket) colorCounts[bucket] = (colorCounts[bucket] ?? 0) + 1;
    }
  }
  const darkNeutralCount = ['black', 'charcoal', 'navy', 'gray', 'off-white'].reduce(
    (s, c) => s + (colorCounts[c] ?? 0), 0
  );

  // Fit distribution
  const fitCounts = {};
  for (const item of items) {
    if (item.fit_type) fitCounts[item.fit_type] = (fitCounts[item.fit_type] ?? 0) + 1;
  }

  // Style categories
  const styleCounts = {};
  for (const item of items) {
    if (item.style_category) styleCounts[item.style_category] = (styleCounts[item.style_category] ?? 0) + 1;
  }

  // Basics (no brand / not graphic)
  const basics = items.filter(i => !i.brand && !['streetwear'].includes(i.style_category));

  return {
    total,
    bandTees: { count: bandTees.length, artists: [...new Set(bandTees.map(i => i.brand).filter(Boolean))] },
    colorDistribution: colorCounts,
    darkNeutralRatio: total > 0 ? Math.round((darkNeutralCount / (total * 2)) * 100) : 0,
    fitCounts,
    styleCounts,
    graphicCount: graphicItems.length,
    basicCount: basics.length,
    fabrics: [...new Set(items.map(i => i.fabric).filter(Boolean))],
    formality: {
      avg: items.filter(i => i.formality_score).reduce((s, i) => s + i.formality_score, 0) /
           (items.filter(i => i.formality_score).length || 1),
    },
  };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  const { data: items } = await supabase
    .from('wardrobe_items')
    .select('item_type, brand, style_category, fit_type, colors, formality_score, fabric, occasion_suitability')
    .eq('user_id', userId)
    .not('item_type', 'is', null);

  if (!items?.length) {
    return res.status(200).json({ profile: null, reason: 'no_analyzed_items' });
  }

  const stats  = buildWardrobeStats(items);
  const prompt = `You are a personal style analyst. Analyze this wardrobe data and generate a sharp, specific "What your wardrobe says about you" profile.

WARDROBE SUMMARY (${stats.total} analyzed items):
- Band/music tees: ${stats.bandTees.count} (${stats.bandTees.artists.join(', ') || 'none'})
- Color distribution: ${JSON.stringify(stats.colorDistribution)}
- Dark neutral ratio: ~${stats.darkNeutralRatio}% of items are dark/muted
- Fit breakdown: ${JSON.stringify(stats.fitCounts)}
- Style categories: ${JSON.stringify(stats.styleCounts)}
- Graphic/branded pieces: ${stats.graphicCount} of ${stats.total}
- Basics (no text/logo): ${stats.basicCount} of ${stats.total}
- Fabrics detected: ${stats.fabrics.join(', ') || 'not analyzed'}
- Average formality score: ${stats.formality.avg.toFixed(1)}/10

RAW ITEM DATA:
${JSON.stringify(items.map(i => ({
  type: i.item_type,
  brand: i.brand,
  style: i.style_category,
  fit: i.fit_type,
  colors: (i.colors ?? []).slice(0, 2).map(hexToBucket).filter(Boolean),
  fabric: i.fabric,
})), null, 2)}

RULES:
- Band tees with music artists = MAJOR cultural identity signal. If there are 3+ from the same genre (alt-rock, Britpop, post-punk, hip-hop), call it out explicitly.
- Use REAL NUMBERS. "7 of 11 items" not "most items". Do the math from the data above.
- For brand recommendations: match the actual aesthetic. A vintage band-tee/streetwear person gets Needles, Human Made, Stüssy, CPFM — NOT Ralph Lauren. A quiet luxury person gets Brunello Cucinelli — NOT Supreme.
- Infer shopping behavior from the data: worn/faded pieces = thrift/vintage hunter. New-looking pieces = retail shopper.
- The shopping_behavior field should be ONE specific sentence describing HOW they shop.
- Tone: direct, specific, no hedging. Say "you have", not "you might".

Return ONLY a JSON object, no markdown:
{
  "insights": [
    {
      "title": "Short punchy title (3-6 words)",
      "emoji": "one emoji",
      "body": "2-3 sentences. Specific. References actual counts or items."
    }
  ],
  "shopping_profile": {
    "loves": ["specific item/aesthetic descriptor", "..."],
    "gravitates_toward": ["behavior or attribute phrase", "..."],
    "brands": ["Brand1", "Brand2", "..."],
    "shopping_behavior": "One sentence about how they likely shop."
  }
}

Generate exactly 5 insights that tell a coherent story about this person's style identity.`;

  try {
    const response = await client.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 2048,
      messages:   [{ role: 'user', content: prompt }],
    });

    const text  = response.content[0].text.trim();
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON returned');

    const profile = JSON.parse(match[0]);
    return res.status(200).json({ profile, itemCount: stats.total });
  } catch (err) {
    console.error('[wardrobe-profile]', err.message);
    return res.status(500).json({ error: err.message });
  }
}
