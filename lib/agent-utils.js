/**
 * Pure, I/O-free utility functions shared between api/agent.js and tests.
 * No imports — safe to load in any environment without env vars or DB connections.
 */

// ── Slot definitions ───────────────────────────────────────────────
export const SLOT_DEFS = {
  // Tops
  graphic_tee:      { category: 'tops',      label: 'graphic tee',          keywords: ['graphic', 'print', 'tee', 't-shirt'],                              modifiers: 'graphic tee' },
  band_tee:         { category: 'tops',      label: 'band tee',             keywords: ['band', 'music', 'tee', 'graphic'],                                 modifiers: 'band tee vintage music' },
  short_sleeve:     { category: 'tops',      label: 'short sleeve shirt',   keywords: ['short sleeve', 'short-sleeve', 'ss shirt'],                        modifiers: 'short sleeve shirt' },
  button_down:      { category: 'tops',      label: 'button-down shirt',    keywords: ['button', 'shirt', 'oxford', 'poplin', 'woven', 'chambray', 'linen'], modifiers: 'button-down shirt' },
  polo:             { category: 'tops',      label: 'polo shirt',           keywords: ['polo'],                                                            modifiers: 'polo shirt' },
  tank_top:         { category: 'tops',      label: 'tank top',             keywords: ['tank', 'cami', 'sleeveless'],                                      modifiers: 'tank top cami' },
  linen_shirt:      { category: 'tops',      label: 'linen shirt',          keywords: ['linen'],                                                           modifiers: 'linen shirt' },
  oversized_tee:    { category: 'tops',      label: 'oversized tee',        keywords: ['oversized', 'boxy', 'tee', 't-shirt'],                             modifiers: 'oversized boxy tee' },
  generic_top:      { category: 'tops',      label: 'top',                  keywords: [],                                                                  modifiers: 'top shirt' },
  // Bottoms
  cargo_pants:    { category: 'bottoms',   label: 'cargo pants',       keywords: ['cargo'],                                               modifiers: 'cargo pants' },
  baggy_jeans:    { category: 'bottoms',   label: 'baggy jeans',       keywords: ['baggy', 'wide', 'loose', 'barrel', 'relaxed'],         modifiers: 'baggy wide leg jeans relaxed' },
  straight_jeans: { category: 'bottoms',   label: 'straight jeans',    keywords: ['straight', 'regular', 'classic', 'jean'],              modifiers: 'straight leg jeans' },
  slim_jeans:     { category: 'bottoms',   label: 'slim jeans',        keywords: ['slim', 'skinny', 'tapered'],                           modifiers: 'slim fit jeans' },
  chinos:         { category: 'bottoms',   label: 'chinos',            keywords: ['chino', 'khaki', 'twill'],                             modifiers: 'chino pants' },
  shorts:         { category: 'bottoms',   label: 'shorts',            keywords: ['short'],                                               modifiers: 'shorts' },
  trousers:       { category: 'bottoms',   label: 'trousers',          keywords: ['trouser', 'slacks'],                                   modifiers: 'dress trousers' },
  sweatpants:     { category: 'bottoms',   label: 'sweatpants',        keywords: ['sweat', 'jogger', 'track'],                            modifiers: 'sweatpants joggers' },
  generic_bottom: { category: 'bottoms',   label: 'jeans',             keywords: ['jean', 'denim'],                                       modifiers: 'jeans denim' },
  // Shoes
  sneakers:       { category: 'shoes',     label: 'sneakers',          keywords: ['sneaker', 'trainer', 'runner', 'shoe'],                modifiers: 'sneakers' },
  boots:          { category: 'shoes',     label: 'boots',             keywords: ['boot'],                                                modifiers: 'boots' },
  sandals:        { category: 'shoes',     label: 'sandals',           keywords: ['sandal', 'slide', 'flip'],                             modifiers: 'sandals' },
  loafers:        { category: 'shoes',     label: 'loafers',           keywords: ['loafer', 'mule'],                                      modifiers: 'loafers' },
  // Outerwear
  flannel:        { category: 'outerwear', label: 'flannel',           keywords: ['flannel', 'plaid'],                                    modifiers: 'flannel shirt' },
  hoodie:         { category: 'outerwear', label: 'hoodie',            keywords: ['hoodie', 'sweatshirt', 'pullover'],                    modifiers: 'hoodie sweatshirt' },
  jacket:         { category: 'outerwear', label: 'jacket',            keywords: ['jacket', 'coat', 'blazer'],                            modifiers: 'jacket' },
  cardigan:       { category: 'outerwear', label: 'cardigan',          keywords: ['cardigan', 'knit'],                                    modifiers: 'cardigan' },
};

// ── Slot parser ────────────────────────────────────────────────────
export function parseRequestSlots(text) {
  const t = text.toLowerCase();
  const slots = [];
  let idx = 0;

  const W2N = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6 };
  function countFor(itemRe) {
    const m = t.match(new RegExp(`(\\d+|one|two|three|four|five|six)\\s+${itemRe}`, 'i'));
    if (!m) return null;
    return parseInt(m[1]) || W2N[m[1]] || 1;
  }
  function add(key, explicitCount = null) {
    const n = explicitCount ?? 1;
    for (let i = 0; i < n; i++) {
      slots.push({
        ...SLOT_DEFS[key],
        id:           `${SLOT_DEFS[key].category}_${idx++}`,
        show_options: explicitCount === null,
      });
    }
  }

  if (/graphic tee|graphic t.?shirt|band tee|printed tee/i.test(t)) add('graphic_tee', countFor('(?:graphic\\s+)?tees?'));
  if (/button.?down|dress shirt|oxford shirt|poplin|woven shirt|chambray/i.test(t)) add('button_down', countFor('(?:button.?down|dress shirt|shirts?)'));
  if (/linen shirt/i.test(t) && !/button.?down/i.test(t)) add('linen_shirt');
  if (/\bpolo\b/i.test(t)) add('polo', countFor('polos?'));
  if (/\btank top\b|\bcami\b/i.test(t)) add('tank_top');
  if (/oversized tee|boxy tee/i.test(t) && !/graphic/i.test(t)) add('oversized_tee', countFor('(?:oversized|boxy)\\s+tees?'));
  if (/short.?sleeve\s+(?:shirt|top|tee)/i.test(t) && !slots.some(s => s.category === 'tops')) add('short_sleeve', countFor('short.?sleeve\\s+(?:shirts?|tops?|tees?)'));
  if (!slots.some(s => s.category === 'tops') && /\btop(s)?\b|\bshirt(s)?\b|\btee(s)?\b/i.test(t)) {
    add('generic_top', countFor('(?:tops?|shirts?|tees?)'));
  }

  if (/\bcargo\b/i.test(t)) add('cargo_pants', countFor('cargo'));
  if (/baggy\s*jeans?|wide.?leg\s*jeans?|loose\s*jeans?/i.test(t)) add('baggy_jeans', countFor('(?:baggy|wide.?leg|loose)\\s*jeans?'));
  if (/straight\s*jeans?|regular\s*jeans?/i.test(t)) add('straight_jeans', countFor('straight\\s*jeans?'));
  if (/slim\s*jeans?|skinny\s*jeans?/i.test(t)) add('slim_jeans', countFor('(?:slim|skinny)\\s*jeans?'));
  if (/\bchinos?\b/i.test(t)) add('chinos', countFor('chinos?'));
  if (/\bshorts?\b/i.test(t)) add('shorts', countFor('shorts?'));
  if (/\btrousers?\b/i.test(t)) add('trousers', countFor('trousers?'));
  if (/\bsweatpants?\b|\bjoggers?\b/i.test(t)) add('sweatpants', countFor('(?:sweatpants?|joggers?)'));
  if (!slots.some(s => s.category === 'bottoms') && /\bjeans?\b|\bpants?\b|\bbottoms?\b/i.test(t)) {
    add('generic_bottom', countFor('(?:jeans?|pants?)'));
  }

  if (/\bflannel(s)?\b/i.test(t)) add('flannel', countFor('flannels?'));
  if (/\bhoodie(s)?\b|\bsweatshirt(s)?\b/i.test(t)) add('hoodie', countFor('(?:hoodies?|sweatshirts?)'));
  if (/\bjacket(s)?\b|\bcoat(s)?\b|\bblazer(s)?\b/i.test(t)) add('jacket', countFor('(?:jackets?|coats?|blazers?)'));
  if (/\bcardigan(s)?\b/i.test(t)) add('cardigan', countFor('cardigans?'));

  if (/sneakers?|trainers?/i.test(t)) add('sneakers', countFor('(?:sneakers?|trainers?)'));
  else if (/\bboots?\b/i.test(t)) add('boots', countFor('boots?'));
  else if (/sandals?/i.test(t)) add('sandals', countFor('sandals?'));
  else if (/loafers?/i.test(t)) add('loafers', countFor('loafers?'));

  return slots;
}

// ── Shopping board builder ─────────────────────────────────────────
export function buildShoppingBoard(requiredSlots, slotCache, maxPerSlot = null) {
  const catLabel = { tops: 'top', bottoms: 'bottom', shoes: 'shoes', outerwear: 'outerwear', dress: 'dress', accessories: 'accessory' };
  const usedNames = new Set();
  const nameKey   = name => (name ?? '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 40);
  const items     = [];

  for (const slot of requiredSlots) {
    const pool  = (slotCache[slot.id] ?? []).filter(p => !usedNames.has(nameKey(p.name)));
    const picks = maxPerSlot ? pool.slice(0, maxPerSlot) :
                  slot.show_options ? pool.slice(0, 4) : pool.slice(0, 1);

    for (const p of picks) {
      usedNames.add(nameKey(p.name));
      items.push({
        category:     catLabel[slot.category] ?? slot.category,
        product_name: p.name,
        product:      p,
        _slot_id:     slot.id,
        _subtype:     slot.label,
      });
    }
  }

  const total = items.reduce((s, i) => s + (i.product?.price ?? 0), 0);
  return [{ outfit_name: 'Your Shopping Picks', items, total_price: Math.round(total * 100) / 100, style_note: null, wardrobe_multiplier: 1 }];
}

// ── Hex → readable color bucket ───────────────────────────────────
export function hexToBucket(hex) {
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

// ── Budget parser ──────────────────────────────────────────────────
export function parseBudget(text) {
  const m = (text ?? '').match(
    /(?:(?:under|around|about|max(?:imum)?|budget(?:\s+of)?|spend(?:ing)?|no\s+more\s+than)\s+)?\$(\d+(?:\.\d{1,2})?)|(\d+)\s*(?:dollars?|bucks?)|^(\d+)\s*(?:more\s+or\s+less|ish|or\s+so|total|ish)?$/im
  );
  if (!m) return null;
  const n = parseFloat(m[1] ?? m[2] ?? m[3]);
  return n >= 20 ? n : null;
}

// ── Occasion research ──────────────────────────────────────────────
const OCCASION_BRIEFS = [
  {
    patterns: [/rooftop\s+dinner|dinner\s+party|dinner\s+date|nice\s+dinner|fancy\s+dinner/i],
    brief: {
      event: 'rooftop dinner / dinner party', formality: 7,
      dresscode: 'smart casual — polished and intentional without being stiff; elevated basics, clean lines',
      typicalItems: ['blazer or sport coat', 'chino trousers or slim dress pants', 'button-down or clean crew-neck', 'leather loafers or clean Chelsea boots'],
      avoidItems: ['cargo pants', 'graphic tees', 'athletic sneakers', 'hoodies', 'flip-flops', 'distressed jeans'],
      searchTerms: ['smart casual', 'tailored chino', 'oxford button-down', 'leather loafer', 'slim blazer'],
      context: 'The rooftop setting calls for elevated smart casual — clean sneakers are borderline; beaten-up ones are not.',
    },
  },
  {
    patterns: [/date\s+night|romantic\s+dinner|anniversary\s+dinner/i],
    brief: {
      event: 'date night', formality: 6,
      dresscode: 'smart casual with a confident edge — put-together but relaxed enough to feel like yourself',
      typicalItems: ['well-fitted dark jeans or chinos', 'clean button-down or smart knit', 'loafers or clean white sneakers', 'optional blazer'],
      avoidItems: ['gym wear', 'oversized graphic tees', 'athletic sneakers', 'cargo shorts'],
      searchTerms: ['smart casual', 'slim dark jeans', 'polo', 'chino', 'clean sneaker'],
      context: "Aim for the version of yourself you'd be proud of — sharp but not trying too hard.",
    },
  },
  {
    patterns: [/black\s+tie|white\s+tie|gala\b|formal\s+ball|charity\s+ball/i],
    brief: {
      event: 'black tie / gala', formality: 10,
      dresscode: 'black tie — tuxedo, dress shirt, bow tie, dress shoes',
      typicalItems: ['tuxedo jacket', 'tuxedo trousers', 'dress shirt', 'bow tie', 'patent leather shoes'],
      avoidItems: ['jeans', 'sneakers', 'casual shirts', 'dark suit instead of tuxedo'],
      searchTerms: ['tuxedo', 'formal dress shirt', 'bow tie', 'patent leather oxford', 'evening wear'],
      context: 'Black tie means a tuxedo — not a dark suit. White shirt, black bow tie, patent shoes.',
    },
  },
  {
    patterns: [/cocktail\s+party|cocktail\s+attire|semi.?formal/i],
    brief: {
      event: 'cocktail party / semi-formal', formality: 8,
      dresscode: 'cocktail attire — dark suit or blazer with trousers, dress shoes',
      typicalItems: ['dark suit or blazer', 'dress trousers', 'dress shirt', 'tie optional', 'Oxford or Derby shoes'],
      avoidItems: ['jeans', 'sneakers', 'graphic tees', 'cargo pants'],
      searchTerms: ['dark suit', 'blazer dress trousers', 'dress shirt', 'Oxford shoes', 'slim fit'],
      context: 'A dark well-fitted suit is always the safe call. A sharp blazer with coordinated trousers also reads correctly.',
    },
  },
  {
    patterns: [/\bwedding\b(?!\s+party)|\bwedding\s+guest\b/i],
    brief: {
      event: 'wedding guest', formality: 8,
      dresscode: 'cocktail attire — suit or blazer with trousers; avoid white entirely',
      typicalItems: ['suit or blazer', 'dress trousers', 'dress shirt', 'tie or pocket square', 'Oxford or loafer'],
      avoidItems: ['white or off-white', 'jeans', 'sneakers', 'overly casual clothing'],
      searchTerms: ['suit', 'blazer chino', 'dress shirt', 'Oxford shoes', 'wedding guest attire'],
      context: 'Match formality to the venue. Never wear white.',
    },
  },
  {
    patterns: [/beach\s+wedding|outdoor\s+wedding|garden\s+wedding|garden\s+party/i],
    brief: {
      event: 'beach / garden wedding or garden party', formality: 6,
      dresscode: 'resort smart casual — light fabrics, warm tones, no heavy wool or dark suits',
      typicalItems: ['linen suit or linen blazer', 'light chinos', 'linen or lightweight button-down', 'loafers or clean leather sandals'],
      avoidItems: ['heavy wool suit', 'dark navy or black suit', 'athletic sneakers', 'white at weddings'],
      searchTerms: ['linen suit', 'linen blazer', 'light chino', 'linen shirt', 'loafer'],
      context: 'Lightweight breathable fabrics in warm or pastel tones. Linen is ideal.',
    },
  },
  {
    patterns: [/job\s+interview|business\s+interview/i],
    brief: {
      event: 'job interview', formality: 8,
      dresscode: 'business professional — suit or blazer with trousers, polished and conservative',
      typicalItems: ['suit or blazer', 'dress trousers', 'dress shirt', 'tie optional', 'Oxford or Derby shoes'],
      avoidItems: ['jeans', 'sneakers', 'graphic tees', 'hoodies'],
      searchTerms: ['business professional', 'slim suit', 'dress shirt', 'Oxford shoes', 'blazer trousers'],
      context: 'When in doubt, overdress. For creative or tech roles, a sharp blazer over clean trousers works.',
    },
  },
  {
    patterns: [/\boffice\b|\bbusiness\s+casual\b|client\s+meeting/i],
    brief: {
      event: 'office / business casual', formality: 6,
      dresscode: 'business casual — polished without being formal',
      typicalItems: ['chino or dress trouser', 'Oxford shirt or clean polo', 'blazer or cardigan', 'loafers or clean leather sneakers'],
      avoidItems: ['shorts', 'graphic tees', 'flip-flops', 'athletic wear'],
      searchTerms: ['business casual', 'chino trouser', 'Oxford shirt', 'clean leather sneaker', 'blazer'],
      context: 'Think elevated everyday — confident in a client meeting, not overdressed at lunch.',
    },
  },
  {
    patterns: [/holiday\s+party|office\s+party|christmas\s+party|new\s+year(?:'?s)?\s+(?:eve|party)/i],
    brief: {
      event: 'holiday / office party', formality: 6,
      dresscode: 'festive smart casual — elevated basics with a bit more personality than usual',
      typicalItems: ['smart trousers or dark jeans', 'clean button-down or festive knit', 'blazer', 'loafers or Chelsea boots'],
      avoidItems: ['gym wear', 'very casual athletic wear'],
      searchTerms: ['smart casual', 'slim trousers', 'festive shirt', 'blazer', 'Chelsea boot'],
      context: 'A blazer goes a long way. You can add a bold color or pattern you might normally skip.',
    },
  },
  {
    patterns: [/\bgraduation\b/i],
    brief: {
      event: 'graduation', formality: 7,
      dresscode: 'smart casual to business casual — clean and presentable for photos',
      typicalItems: ['chino or dress trouser', 'button-down or Oxford shirt', 'blazer optional', 'loafers or clean leather sneakers'],
      avoidItems: ['gym clothes', 'graphic tees', 'ripped jeans'],
      searchTerms: ['smart casual', 'chino', 'Oxford shirt', 'blazer', 'clean sneaker'],
      context: "You're under a gown, but photos happen. Clean and put-together.",
    },
  },
  {
    patterns: [/\bcoachella\b|music\s+festival|outdoor\s+festival|bonnaroo|lollapalooza|burning\s+man/i],
    brief: {
      event: 'music festival', formality: 2,
      dresscode: 'festival — expressive, comfortable, heat-appropriate, practical for crowds',
      typicalItems: ['graphic tee or band tee', 'shorts or light pants', 'boots or chunky sneakers', 'hat', 'layering pieces for evening'],
      avoidItems: ['suits', 'dress shoes', 'anything too precious to get dirty'],
      searchTerms: ['festival outfit', 'graphic tee', 'denim shorts', 'boots', 'vintage casual'],
      context: 'Comfort and expression both required. Layers for when the sun goes down.',
    },
  },
  {
    patterns: [/\bmasters\b|golf\s+tournament|pga\b|ryder\s+cup|us\s+open\s+golf/i],
    brief: {
      event: 'golf tournament (spectator)', formality: 5,
      dresscode: 'country club casual — clean, neat, preppy',
      typicalItems: ['polo shirt', 'pressed chino or khaki trouser', 'belt', 'loafers or clean leather sneakers or boat shoes'],
      avoidItems: ['cargo shorts', 'loud graphic tees', 'athletic sneakers', 'flip-flops', 'torn jeans', 'sleeveless shirts'],
      searchTerms: ['polo shirt', 'chino trouser', 'boat shoe', 'preppy casual', 'pressed khaki'],
      context: 'A clean polo with pressed chinos is the uniform. No denim at Augusta.',
    },
  },
  {
    patterns: [/\bmet\s+gala\b|fashion\s+week|red\s+carpet\b/i],
    brief: {
      event: 'red carpet / fashion event', formality: 9,
      dresscode: 'statement formal — bold, intentional, fashion-forward',
      typicalItems: ['tuxedo or statement suit', 'dress shirt', 'bold accessory', 'dress shoes'],
      avoidItems: ['plain basics', 'anything unintentional', 'casual footwear'],
      searchTerms: ['statement suit', 'fashion forward', 'bold blazer', 'dress shoes', 'formal'],
      context: 'This is an occasion to take a fashion risk. A classic tuxedo works; a bold silhouette is even better.',
    },
  },
  {
    patterns: [/art\s+gallery|gallery\s+opening|museum\s+opening/i],
    brief: {
      event: 'art gallery opening', formality: 6,
      dresscode: 'creative smart casual — intellectual, slightly artistic, effortlessly cool',
      typicalItems: ['dark slim jeans or trousers', 'interesting shirt or turtleneck', 'blazer or structured jacket', 'clean boots or loafers'],
      avoidItems: ['gym wear', 'very loud branding', 'flip-flops'],
      searchTerms: ['smart casual', 'turtleneck', 'slim trousers', 'blazer', 'Chelsea boot'],
      context: 'A turtleneck with a blazer is the uniform. Interesting textures or subtle prints work well.',
    },
  },
];

export function researchOccasion(userMessage) {
  for (const { patterns, brief } of OCCASION_BRIEFS) {
    if (patterns.some(re => re.test(userMessage))) return brief;
  }
  return null;
}
