import { getClient }            from '../lib/anthropic.js';
import { agentLog }             from '../lib/agent-logger.js';
import { getUserProfile }       from '../tools/get_user_profile.js';
import { searchProducts, hardCategoryFilter, enrichSearchResults } from '../tools/search_products.js';
import { scoreProductMatch }    from '../tools/score_product_match.js';
import { buildOutfits }         from '../tools/build_outfits.js';
import { checkOutfitMultiplier } from '../tools/check_outfit_multiplier.js';
import { updateStyleDna }       from '../tools/update_style_dna.js';
import { createOrder }          from '../tools/create_order.js';
import { analyzeImageStyle }    from '../tools/analyze_image_style.js';
import { synthesizeStyleDna }   from '../tools/synthesize_style_dna.js';
import { getInspoProducts }     from '../tools/get_inspo_products.js';
import { visualSearchForSlot }  from '../tools/visual_search.js';
import { comprehendFeedback, verifyRefinement, describePlan } from '../tools/refine_search.js';

const client = getClient();

// ── Tool definitions ───────────────────────────────────────────────
// get_user_profile and score_products are intentionally omitted:
//   - Profile data is fully embedded in the system prompt — no tool call needed
//   - Scoring runs automatically inside search_products before returning results
// This reduces the pipeline from 5 Claude round-trips to 3.
const TOOLS = [
  {
    name: 'search_products',
    description: 'Search for real products matching style-aware queries. Results are automatically scored against the user\'s Style DNA and filtered to the best matches. Call once per category needed, all in the same turn.',
    input_schema: {
      type: 'object',
      properties: {
        query:    { type: 'string', description: 'Style-aware search string, e.g. "relaxed tapered earth tone trousers"' },
        category: { type: 'string', enum: ['tops', 'bottoms', 'shoes', 'outerwear', 'accessories', 'dress'] },
        maxPrice: { type: 'number' },
        stores:   { type: 'array', items: { type: 'string' } },
      },
      required: ['query', 'category'],
    },
  },
  {
    name: 'get_inspo_products',
    description: "Retrieve shoppable products directly from the user's saved inspiration pins and Pinterest boards. Google Lens already matched real purchasable items to each saved image — this returns those exact matches. USE THIS instead of search_products when the user says anything like: 'like my board', 'like my inspo', 'from my Pinterest', 'similar to what I saved/pinned', 'inspired by my photos', or references their saved style images in any way. These are visually matched products — far more accurate than keyword search for inspo-driven requests.",
    input_schema: {
      type: 'object',
      properties: {
        category_filter: {
          type: 'string',
          description: 'Optional: restrict to one specific category if the user only asked for one item type',
          enum: ['tops', 'bottoms', 'shoes', 'outerwear', 'dress', 'accessories'],
        },
      },
      required: [],
    },
  },
  {
    name: 'create_order',
    description: 'Process a confirmed purchase. Checks wallet balance, creates order record, deducts from wallet.',
    input_schema: {
      type: 'object',
      properties: {
        items:       { type: 'array' },
        total_price: { type: 'number' },
        occasion:    { type: 'string' },
      },
      required: ['items', 'total_price'],
    },
  },
  {
    name: 'update_style_dna',
    description: 'Log a feedback signal (approval/rejection/swap) to improve future recommendations.',
    input_schema: {
      type: 'object',
      properties: {
        signal_type:     { type: 'string', enum: ['approval', 'rejection', 'swap', 'post_delivery_positive', 'post_delivery_negative'] },
        item_attributes: { type: 'object' },
        swap_target:     { type: 'object' },
        inferred_reason: { type: 'string' },
      },
      required: ['signal_type', 'item_attributes'],
    },
  },
];

// ── Prompt-caching helpers ─────────────────────────────────────────
// Anthropic caches content up to the last block marked cache_control.
// CACHED_TOOLS marks the final tool definition so the static tool list
// survives across all loop turns without re-transmission.
const CACHED_TOOLS = [
  ...TOOLS.slice(0, -1),
  { ...TOOLS[TOOLS.length - 1], cache_control: { type: 'ephemeral' } },
];

// Wrap the system prompt in the array format required for cache_control.
// The prompt content is identical on every loop turn within a single request,
// so turns 2-N get a cache hit and pay only output tokens.
function cachedSystem(prompt) {
  return [{ type: 'text', text: prompt, cache_control: { type: 'ephemeral' } }];
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SLOT-BASED SHOPPING ENGINE
// Converts explicit item requests into typed slots, searches each
// slot independently, validates fulfillment, and builds the product
// card deterministically — no LLM assembly for specific requests.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const SLOT_DEFS = {
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

/**
 * Parse a user text string into required slots.
 * Returns [] for vague/open requests — only populates when user names specific items.
 */
function parseRequestSlots(text) {
  const t = text.toLowerCase();
  const slots = [];
  let idx = 0;

  const W2N = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6 };
  // Returns the explicit count if the user stated one, or null if they didn't.
  // null = "show me options" mode → display 3-5 results for that slot.
  function countFor(itemRe) {
    const m = t.match(new RegExp(`(\\d+|one|two|three|four|five|six)\\s+${itemRe}`, 'i'));
    if (!m) return null;
    return parseInt(m[1]) || W2N[m[1]] || 1;
  }
  // explicitCount === null means user didn't specify → show_options mode
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

  // ── Tops (order matters: most specific first) ──
  if (/graphic tee|graphic t.?shirt|band tee|printed tee/i.test(t)) add('graphic_tee', countFor('(?:graphic\\s+)?tees?'));
  if (/button.?down|dress shirt|oxford shirt|poplin|woven shirt|chambray/i.test(t)) add('button_down', countFor('(?:button.?down|dress shirt|shirts?)'));
  if (/linen shirt/i.test(t) && !/button.?down/i.test(t)) add('linen_shirt');
  if (/\bpolo\b/i.test(t)) add('polo', countFor('polos?'));
  if (/\btank top\b|\bcami\b/i.test(t)) add('tank_top');
  if (/oversized tee|boxy tee/i.test(t) && !/graphic/i.test(t)) add('oversized_tee', countFor('(?:oversized|boxy)\\s+tees?'));
  if (/short.?sleeve\s+(?:shirt|top|tee)/i.test(t) && !slots.some(s => s.category === 'tops')) add('short_sleeve', countFor('short.?sleeve\\s+(?:shirts?|tops?|tees?)'));
  // Generic top only if no specific top detected AND user mentioned tops/shirts
  if (!slots.some(s => s.category === 'tops') && /\btop(s)?\b|\bshirt(s)?\b|\btee(s)?\b/i.test(t)) {
    add('generic_top', countFor('(?:tops?|shirts?|tees?)'));
  }

  // ── Bottoms (most specific first) ──
  if (/\bcargo\b/i.test(t)) add('cargo_pants', countFor('cargo'));
  if (/baggy\s*jeans?|wide.?leg\s*jeans?|loose\s*jeans?/i.test(t)) add('baggy_jeans', countFor('(?:baggy|wide.?leg|loose)\\s*jeans?'));
  if (/straight\s*jeans?|regular\s*jeans?/i.test(t)) add('straight_jeans', countFor('straight\\s*jeans?'));
  if (/slim\s*jeans?|skinny\s*jeans?/i.test(t)) add('slim_jeans', countFor('(?:slim|skinny)\\s*jeans?'));
  if (/\bchinos?\b/i.test(t)) add('chinos', countFor('chinos?'));
  if (/\bshorts?\b/i.test(t)) add('shorts', countFor('shorts?'));
  if (/\btrousers?\b/i.test(t)) add('trousers', countFor('trousers?'));
  if (/\bsweatpants?\b|\bjoggers?\b/i.test(t)) add('sweatpants', countFor('(?:sweatpants?|joggers?)'));
  // Generic jeans only if no specific bottom detected
  if (!slots.some(s => s.category === 'bottoms') && /\bjeans?\b|\bpants?\b|\bbottoms?\b/i.test(t)) {
    add('generic_bottom', countFor('(?:jeans?|pants?)'));
  }

  // ── Outerwear ──
  if (/\bflannel(s)?\b/i.test(t)) add('flannel', countFor('flannels?'));
  if (/\bhoodie(s)?\b|\bsweatshirt(s)?\b/i.test(t)) add('hoodie', countFor('(?:hoodies?|sweatshirts?)'));
  if (/\bjacket(s)?\b|\bcoat(s)?\b|\bblazer(s)?\b/i.test(t)) add('jacket', countFor('(?:jackets?|coats?|blazers?)'));
  if (/\bcardigan(s)?\b/i.test(t)) add('cardigan', countFor('cardigans?'));

  // ── Shoes ──
  if (/sneakers?|trainers?/i.test(t)) add('sneakers', countFor('(?:sneakers?|trainers?)'));
  else if (/\bboots?\b/i.test(t)) add('boots', countFor('boots?'));
  else if (/sandals?/i.test(t)) add('sandals', countFor('sandals?'));
  else if (/loafers?/i.test(t)) add('loafers', countFor('loafers?'));

  return slots;
}

/**
 * Build a style-aware search query for a specific slot.
 * Always incorporates DNA (fit, color, style) and style tags — profile is always active.
 */
function buildSlotQuery(slot, genderPrefix, dna, occasion, styleTags = [], ageStyleDefault = '', refinementPlan = null, occasionResearch = null) {
  // Fit only makes sense for bottoms/outerwear — tops are item-specific enough
  const TOP_SLOT_KEYS = ['graphic_tee','band_tee','polo','tank_top','button_down','linen_shirt','oversized_tee','generic_top'];
  const slotKey = Object.entries(SLOT_DEFS).find(([, def]) =>
    def.category === slot.category && def.label === slot.label
  )?.[0] ?? '';

  // Refinement plan overrides DNA fit/color; fall back to DNA if plan has no override
  const baseFit = (refinementPlan?.fitOverride && refinementPlan.fitOverride !== 'null')
    ? refinementPlan.fitOverride
    : (dna?.dominant_fit ?? '');
  const fit = baseFit && !TOP_SLOT_KEYS.includes(slotKey) ? baseFit : '';

  const color = (refinementPlan?.colorOverride && refinementPlan.colorOverride !== 'null')
    ? refinementPlan.colorOverride
    : (dna?.primary_colors?.[0] ? hexToBucket(dna.primary_colors[0]) : '');

  // Primary style from DNA → style tags → age-group prior (never fall back to nothing)
  // Deduplicate: don't repeat the DNA category if it already appears in the style tags
  const dnaStyle = dna?.primary_style_category ?? '';
  const extraTags = styleTags
    .map(t => t.toLowerCase())
    .filter(t => t !== dnaStyle && t !== 'smart casual')  // 'smart casual' is too generic to help searches
    .slice(0, 2);
  const styleContext = [dnaStyle, ...extraTags].filter(Boolean).join(' ').trim()
    || ageStyleDefault;

  // Occasion research terms — use event-specific dress code language instead of a bare occasion word.
  // e.g. "dinner party" → "smart casual tailored" instead of just "dinner"
  // When research is available, it replaces the generic occasion keyword entirely.
  const researchTerms = occasionResearch?.searchTerms?.slice(0, 3).join(' ') ?? '';
  const occ = researchTerms || (occasion ? occasion.split(' ').slice(0, 2).join(' ') : '');

  // Refinement additions (e.g. "vintage washed") append to query; removals strip matching words
  const queryAdditions = (refinementPlan?.queryAdditions ?? []).slice(0, 3).join(' ');
  const queryRemovals  = new Set((refinementPlan?.queryRemovals ?? []).map(r => r.toLowerCase()));

  let query = [genderPrefix, fit, color, styleContext, slot.modifiers, queryAdditions, occ]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (queryRemovals.size) {
    query = query.split(' ').filter(w => !queryRemovals.has(w.toLowerCase())).join(' ');
  }

  return query;
}

/**
 * Execute one search per slot in parallel. Returns { slotId: products[] }.
 */
async function fillSlots(requiredSlots, userProfile, occasion, budget, refinementPlan = null, occasionResearch = null) {
  const dna           = userProfile.styleDna;
  const gender        = userProfile.profile?.gender ?? userProfile.gender;
  const genderPrefix  = gender === 'men' ? "men's" : gender === 'nonbinary' ? 'unisex' : "women's";
  const styleTags     = userProfile.styleTags ?? [];
  const opennessTiers = userProfile.storeOpennessTiers ?? [];
  const ageStyleMap   = {
    under_18: 'streetwear grunge y2k',
    '18_24':  'streetwear vintage normcore',
    '25_34':  'smart casual minimal streetwear',
    '35_44':  'smart casual minimal classic',
    '45_54':  'smart casual classic minimal',
    '55_plus':'classic minimal quiet luxury',
  };
  const ageStyleDefault = (styleTags.slice(0,2).map(t => t.toLowerCase()).join(' '))
    || ageStyleMap[userProfile.ageRange] || 'smart casual';
  const wantsBoutique = opennessTiers.includes('mixed') || opennessTiers.includes('open');
  const wantsThrift   = opennessTiers.includes('mixed') || opennessTiers.includes('open');
  const nameKey = name => (name ?? '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 50);
  const dislikedNames = new Set(
    (dna?.explicit_dislikes?.product_names ?? []).map(n => nameKey(n))
  );

  // ── Wardrobe OCR blocklist ─────────────────────────────────────────
  // Extract proper nouns from wardrobe OCR text (character names, brand logos,
  // slogans on garments). Products whose names contain these terms are filtered
  // out — the user already owns them, we should not recommend them again.
  const GENERIC_OCR_WORDS = new Set([
    'this','that','with','from','have','will','your','they','been','were','would',
    'could','should','their','there','about','after','before','black','white','blue',
    'gray','grey','size','large','small','medium','brand','style','mens','womens',
    'shirt','tshirt','pants','shoes','jeans','denim','color','print','logo','wear',
  ]);
  const wardrobeOcrBlocklist = new Set();
  (userProfile.wardrobeItems ?? []).forEach(item => {
    const ocr      = item.ocr_text ?? '';
    const cultural = (item.cultural_signals ?? []).join(' ');
    // Only extract words ≥5 chars that look like proper nouns (specific enough to block)
    `${ocr} ${cultural}`.toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length >= 5 && !GENERIC_OCR_WORDS.has(w))
      .forEach(w => wardrobeOcrBlocklist.add(w));
  });

  // ── Occasion avoidItems patterns ───────────────────────────────────
  // Map common avoidItems phrases to regexes that catch actual product names.
  // "graphic tees" must catch "Superman T-Shirt", "DC Comics Tee", etc.
  const AVOID_PATTERN_MAP = {
    'graphic tees':     /graphic\s+t(?:ee|[-\s]shirt)|\b(?:superman|batman|spider[\s-]?man|iron\s*man|marvel|dc\s+comics|anime|character|scorpion|dragonball|pokemon|vintage\s+graphic)\b/i,
    'cargo pants':      /\bcargo\b/i,
    'athletic sneakers':/athletic\s+shoe|running\s+shoe|training\s+shoe/i,
    'hoodies':          /\bhoodie\b/i,
    'flip-flops':       /flip[\s-]?flop/i,
    'distressed jeans': /\bdistressed|ripped\s+jean|torn\s+jean/i,
    'sneakers':         /\bsneaker|\btrainer\b/i,
    'jeans':            /\bjeans?\b/i,
  };
  const occasionAvoidRegexes = (occasionResearch?.avoidItems ?? []).flatMap(item => {
    const mapped = AVOID_PATTERN_MAP[item.toLowerCase()];
    return mapped ? [mapped] : [];
  });

  const slotCache  = {};
  const usedBrands = new Set(); // tracks brands selected across slots to reduce monoculture

  // ── Group slots by type (same label+category = same search) ──────
  // When user asks for "2 graphic tees", we get 2 identical slots.
  // Run ONE search per unique type, build a large pool, then assign
  // results in offset order so each slot gets a DIFFERENT product.
  const typeGroups = new Map();
  for (const slot of requiredSlots) {
    const sig = `${slot.category}|${slot.label}`;
    if (!typeGroups.has(sig)) typeGroups.set(sig, []);
    typeGroups.get(sig).push(slot);
  }

  // Visual bonus: Lens results already passed through the user's actual wardrobe aesthetic,
  // so they earn a small scoring advantage over text-matched products at the same base score.
  const VISUAL_BONUS = 8;

  await Promise.all([...typeGroups.values()].map(async (groupSlots) => {
    const slot  = groupSlots[0];
    const count = groupSlots.length;

    try {
      const mainQuery = buildSlotQuery(slot, genderPrefix, dna, occasion, styleTags, ageStyleDefault, refinementPlan, occasionResearch);
      console.log(`[slot-group] "${slot.label}" x${count} | query: "${mainQuery}"`);

      // Build text query list (supplement — runs in parallel with visual search)
      const textQueries = [mainQuery];
      if (count > 1) {
        textQueries.push(`${genderPrefix} ${slot.modifiers} ${occasion ? occasion.split(' ')[0] : ''}`);
      }
      if (wantsBoutique) textQueries.push(`${genderPrefix} boutique indie ${slot.modifiers}`);
      if (wantsThrift)   textQueries.push(`${genderPrefix} thrift vintage secondhand ${slot.modifiers}`);

      // ── Run visual search + all text queries in parallel ───────────
      // Hard timeouts on every external call so no single slow service
      // (SerpAPI, Anthropic web search, Shopify) can stall the pipeline.
      const cap = (promise, ms, fallback) =>
        Promise.race([promise, new Promise(resolve => setTimeout(() => resolve(fallback), ms))]);

      const [visualResult, ...textResults] = await Promise.all([
        cap(
          visualSearchForSlot(
            slot.category,
            userProfile.wardrobeItems,
            userProfile.aspirationItems ?? [],
            dna,
            budget
          ).catch(() => ({ products: [], source: 'error' })),
          6000,
          { products: [], source: 'timeout' }
        ),
        ...textQueries.map(q =>
          cap(
            searchProducts({ query: q.trim(), category: slot.category, maxPrice: budget, countryCode: userProfile.countryCode, styleDna: { ...dna, gender: gender === 'men' ? 'mens' : gender === 'women' ? 'womens' : null }, excludedBrands: [...usedBrands] }).catch(() => []),
            20000,
            []
          )
        ),
      ]);

      // When occasion research is active, Lens results are counterproductive —
      // visual search finds "more of what you own" which is wrong for formal events.
      // Zero the visual bonus so text search results (occasion-appropriate items) win.
      const effectiveVisualBonus = occasionResearch ? 0 : VISUAL_BONUS;

      // Tag Lens results with visual bonus; text results get no tag
      const lensProducts  = (visualResult.products ?? []).map(p => ({ ...p, _visualBonus: effectiveVisualBonus }));
      const textProducts  = textResults.flat();
      console.log(`[slot-raw] "${slot.label}": lens=${lensProducts.length} text=${textProducts.length} (textQueries=${textQueries.length})`);

      // Register brands from this slot so subsequent slots can avoid monoculture
      [...lensProducts, ...textProducts].forEach(p => { if (p.brand) usedBrands.add(p.brand); });

      // Merge: Lens first (preferred), then text (fills gaps)
      // Deduplicate across both streams by normalized name, then hard-filter
      // any items that are clearly the wrong category (pants in a tops slot, etc.)
      const seen   = new Set();
      const merged = [...lensProducts, ...textProducts].filter(p => {
        const k = nameKey(p.name);
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
      const categoryFiltered = hardCategoryFilter(merged, slot.category);
      const unique = categoryFiltered.length >= 1 ? categoryFiltered : merged;

      // ── Occasion + wardrobe filters (applied before scoring) ─────────
      // 1. Occasion avoidItems: hard-remove products matching the dress code's
      //    explicit exclusions (e.g. "graphic tees" at a rooftop dinner removes
      //    Superman shirts, DC Comics tees, etc.)
      // 2. Wardrobe OCR blocklist: remove products whose names contain proper
      //    nouns extracted from the user's wardrobe (so "Superman" in wardrobe
      //    → block "Superman T-Shirt" in results)
      // Only apply if the filtered pool would leave ≥2 items (preserve recall).
      let occasionFiltered = unique;
      if (occasionAvoidRegexes.length > 0 || wardrobeOcrBlocklist.size > 0) {
        const filtered = unique.filter(p => {
          const name = (p.name ?? '').toLowerCase();
          if (occasionAvoidRegexes.some(re => re.test(name))) return false;
          if (wardrobeOcrBlocklist.size > 0 &&
              [...wardrobeOcrBlocklist].some(term => name.includes(term))) return false;
          return true;
        });
        if (filtered.length >= 2) occasionFiltered = filtered;
        else if (filtered.length === 1) occasionFiltered = filtered; // 1 is fine
        // If filter wipes everything, fall back to unfiltered (rare edge case)
      }

      // Score all products; Lens results receive the visual bonus on top
      const scored = occasionFiltered.map(p => ({
        ...p,
        _score:   scoreProductMatch(p, dna, occasion).score + (p._visualBonus ?? 0),
        _slot_id: slot.id,
        _subtype: slot.label,
      }));

      const kwFiltered = slot.keywords?.length
        ? scored.filter(p => slot.keywords.some(kw => (p.name ?? '').toLowerCase().includes(kw)))
        : scored;

      console.log(`[slot-filter] "${slot.label}": merged=${merged.length} catFiltered=${unique.length} occasionFiltered=${occasionFiltered.length} scored=${scored.length} kwFiltered=${kwFiltered.length} keywords=[${(slot.keywords ?? []).join(',')}]`);
      if (kwFiltered.length === 0 && scored.length > 0) {
        console.warn(`[slot-filter] "${slot.label}" kw-filter wiped all ${scored.length} products — sample names: ${scored.slice(0,3).map(p => `"${p.name}"`).join(', ')}`);
      }

      // Use keyword-filtered pool as long as ≥1 item matches — never fall back to wrong-category items.
      // Only revert to full scored pool when the slot has no specific keywords (generic slot).
      const kwPool = (slot.keywords?.length && kwFiltered.length === 0) ? scored : kwFiltered;

      // Semantic dedup: within a slot, if multiple products share the same first
      // substantive word (brand name, character, specific noun), keep only the
      // highest-scored one. Prevents 4 Superman shirts or 4 Stüssy variants
      // from filling all slots when show_options=true.
      const CONCEPT_STOPWORDS = new Set(['the','and','for','with','mens','womens','unisex','size','large','small','medium','color','style','vintage','distressed','graphic','classic','slim','relaxed','fitted','washed']);
      const conceptKey = name => {
        const words = (name ?? '').toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/)
          .filter(w => w.length > 3 && !CONCEPT_STOPWORDS.has(w));
        return words[0] ?? (name ?? '').slice(0, 8);
      };
      const seenConcepts = new Set();
      const semanticDeduped = kwPool
        .filter(p => !dislikedNames.has(nameKey(p.name)))
        .sort((a, b) => b._score - a._score)
        .filter(p => {
          const ck = conceptKey(p.name);
          if (seenConcepts.has(ck)) return false;
          seenConcepts.add(ck);
          return true;
        });

      let pool = semanticDeduped.slice(0, 20);

      // Refinement plan: filter out negative keywords and avoided colors post-scoring
      if (refinementPlan) {
        const negKws    = (refinementPlan.negativeKeywords ?? []).map(k => k.toLowerCase());
        const avoidClrs = (refinementPlan.avoidColors ?? []).map(c => c.toLowerCase());
        if (negKws.length || avoidClrs.length) {
          const rfFiltered = pool.filter(p => {
            const name = (p.name ?? '').toLowerCase();
            return !negKws.some(kw => name.includes(kw)) && !avoidClrs.some(c => name.includes(c));
          });
          // Only apply if it doesn't wipe the pool — preserve at least 2 results per slot
          if (rfFiltered.length >= Math.min(count * 2, 2)) pool = rfFiltered;
        }
      }

      groupSlots.forEach((s, offset) => {
        slotCache[s.id] = pool.slice(offset);
      });

      console.log(`[slot-group] "${slot.label}" x${count}: lens=${lensProducts.length} text=${textProducts.length} pool=${pool.length} visual_source=${visualResult.source}`);
    } catch (err) {
      console.error(`[slot-group] "${slot.label}" search failed:`, err.message);
      groupSlots.forEach(s => { slotCache[s.id] = []; });
    }
  }));

  return slotCache;
}

/**
 * Build slots for a full wardrobe redo — one per major category,
 * all in show_options mode so the pool is maximally wide.
 * DNA and occasion drive which specific sub-types to include.
 */
function buildWardrobeRedoSlots(dna, occasion) {
  const fit   = dna?.dominant_fit         ?? 'relaxed';
  const style = dna?.primary_style_category ?? '';
  const isSummer = /summer|beach|warm|tropical/i.test(occasion ?? '');
  let idx = 0;
  const mk = (key) => ({ ...SLOT_DEFS[key], id: `redo_${idx++}`, show_options: true });

  const slots = [];

  // Tops — always two top slots for variety
  slots.push(mk('generic_top'));
  if (/streetwear|grunge|skate/i.test(style)) slots.push(mk('graphic_tee'));
  else                                          slots.push(mk('oversized_tee'));

  // Bottoms — fit-driven, plus shorts for warm weather
  if      (fit === 'slim' || fit === 'fitted')            slots.push(mk('slim_jeans'));
  else if (fit === 'oversized' || fit === 'relaxed')       slots.push(mk('baggy_jeans'));
  else                                                     slots.push(mk('straight_jeans'));
  if (isSummer) slots.push(mk('shorts'));

  // Shoes
  slots.push(mk('sneakers'));

  // Outerwear — skip for summer
  if (!isSummer) slots.push(mk('jacket'));

  return slots;
}

/**
 * Build a deterministic product card from filled slots.
 *
 * Explicit count (user said "2 graphic tees"):
 *   → Pick exactly 1 unique product per slot. Global dedup prevents repeats.
 *
 * No count specified (user said "graphic tee" or "a flannel"):
 *   → show_options = true → show top 4 options for that slot so the user
 *     can browse. This gives 5-10 total items for a typical multi-category
 *     request without a count ("summer clothes" → tees x4 + shorts x4).
 *
 * maxPerSlot overrides show_options pick count — used for wardrobe redo
 * to surface as many options as possible per category row.
 */
function buildShoppingBoard(requiredSlots, slotCache, maxPerSlot = null) {
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

// ── Hex → readable color name ──────────────────────────────────────
// Used so search queries contain "navy beige" not "#1a237e #f5f5dc"
function hexToBucket(hex) {
  if (!hex || typeof hex !== 'string') return null;
  const h = hex.replace('#', '').padEnd(6, '0');
  const r = parseInt(h.slice(0,2), 16) || 0;
  const g = parseInt(h.slice(2,4), 16) || 0;
  const b = parseInt(h.slice(4,6), 16) || 0;
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  const max = Math.max(r, g, b);
  const sat = max === 0 ? 0 : (max - Math.min(r, g, b)) / max;
  if (brightness < 35)                 return 'black';
  if (brightness > 220 && sat < 0.1)  return 'white';
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
// Extract an explicit dollar amount from the user's message.
// Returns null when no budget is stated — callers treat null as "no ceiling."
// Wallet balance is a payment limit, not a search budget: they are separate concepts.
function parseBudget(text) {
  const m = (text ?? '').match(
    /(?:(?:under|around|about|max(?:imum)?|budget(?:\s+of)?|spend(?:ing)?|no\s+more\s+than)\s+)?\$(\d+(?:\.\d{1,2})?)|(\d+)\s*(?:dollars?|bucks?)|^(\d+)\s*(?:more\s+or\s+less|ish|or\s+so|total|ish)?$/im
  );
  if (!m) return null;
  const n = parseFloat(m[1] ?? m[2] ?? m[3]);
  return n >= 20 ? n : null; // ignore small numbers (sizes, counts, etc.)
}

// ── Occasion research ─────────────────────────────────────────────
// Static dress-code lookup — zero latency, no API call.
// Returns a brief for recognised named events, null otherwise.
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
      context: 'Aim for the version of yourself you\'d be proud of — sharp but not trying too hard.',
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
      context: 'You\'re under a gown, but photos happen. Clean and put-together.',
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

function researchOccasion(userMessage) {
  for (const { patterns, brief } of OCCASION_BRIEFS) {
    if (patterns.some(re => re.test(userMessage))) return brief;
  }
  return null;
}

// ── Helpers ────────────────────────────────────────────────────────
function formatRelativeDate(iso) {
  const d    = new Date(iso);
  const now  = new Date();
  const diff = (now - d) / 1000;
  if (diff < 60)        return 'just now';
  if (diff < 3600)      return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)     return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 2) return 'yesterday';
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Re-run the slot pipeline with a RefinementPlan derived from user feedback.
 * Opus comprehends the feedback → slots re-searched with plan overrides →
 * deterministic verification confirms constraints are satisfied.
 */
async function handleRefinementSearch(feedback, priorSlots, userProfile, occasion, budget, conversationHistory) {
  const dna = userProfile.styleDna;

  // Build prior results context from recent assistant messages
  const priorResultsText = conversationHistory
    .filter(m => m.role === 'assistant')
    .slice(-3)
    .map(m => typeof m.content === 'string' ? m.content :
      (m.content ?? []).filter(b => b.type === 'text').map(b => b.text).join(' '))
    .join('\n') || 'prior search results';

  const searchContext = priorSlots.map(s => s.label).join(', ') || 'clothing items';

  // Opus comprehends the feedback into a structured RefinementPlan
  const plan = await comprehendFeedback(feedback, dna, priorResultsText, searchContext);

  // Re-fill slots with plan overrides applied
  const slotCache = await fillSlots(priorSlots, userProfile, occasion, budget, plan);
  const filled    = priorSlots.filter(s => (slotCache[s.id]?.length ?? 0) > 0);

  if (!filled.length) {
    return { plan, outfits: null, description: describePlan(plan), verified: false, gaps: ['no results returned after refinement'] };
  }

  const outfits = buildShoppingBoard(priorSlots, slotCache);
  await enrichProductImages(outfits);

  // Deterministic check: are negativeKeywords/avoidColors actually gone from results?
  const allProducts = outfits.flatMap(o => (o.items ?? []).map(i => i.product)).filter(Boolean);
  const { satisfied, gaps } = verifyRefinement(plan, allProducts);

  return { plan, outfits, description: describePlan(plan), verified: satisfied, gaps };
}

// ── Age-group style priors ─────────────────────────────────────────
// Curated knowledge about typical style preferences per age group.
// Used as a SUPPLEMENT when the DNA is sparse (low/medium confidence).
// Always overridden by actual DNA data and explicit user preferences.
function getAgePrior(ageRange) {
  const priors = {
    under_18: {
      styles:    'Y2K, Streetwear, Grunge, Cottagecore, Dark Academia, Hypebeast',
      fits:      'oversized, baggy, relaxed',
      colorNote: 'bold colors, graphic prints, high contrast',
      brandTier: 'fast fashion, thrift, Depop, Shein, H&M',
      insight:   'Highly trend-driven (TikTok/social); expressive and experimental; thrift/resale common; logo-heavy or anti-logo both valid',
    },
    '18_24': {
      styles:    'Streetwear, Vintage, Y2K, Minimal, Athleisure, Normcore, Bohemian',
      fits:      'relaxed, oversized, some tailored',
      colorNote: 'earth tones trending alongside bold pops; washed/faded finishes popular',
      brandTier: 'ASOS, Zara, Urban Outfitters, thrift, vintage, some premium capsule pieces',
      insight:   'Personal style actively developing; quality starting to matter; mixes high/low; curated "effortless" looks; heavily influenced by music, subcultures, social media',
    },
    '25_34': {
      styles:    'Smart Casual, Minimal, Streetwear, Business Casual, Old Money, Quiet Luxury',
      fits:      'relaxed, tailored, transitioning away from oversized-only',
      colorNote: 'neutrals and earth tones dominate; less loud branding',
      brandTier: 'Everlane, Mango, COS, Uniqlo, Zara, some Nordstrom/Revolve, investment pieces starting',
      insight:   'Style maturing; investing in versatile quality basics; workwear becoming relevant; less trend-reactive; brand logos less important than cut and fabric',
    },
    '35_44': {
      styles:    'Smart Casual, Minimal, Business Casual, Old Money, Quiet Luxury',
      fits:      'tailored, well-fitted, comfortable without being sloppy',
      colorNote: 'sophisticated neutrals, classic navy/camel/white, muted tones',
      brandTier: 'quality mid-range to premium; Banana Republic, J.Crew, Cos, Theory, Rag & Bone',
      insight:   'Quality over quantity; classic investment pieces; professional demands shape wardrobe; minimal trend-chasing; fit and fabric matter most',
    },
    '45_54': {
      styles:    'Smart Casual, Business Casual, Minimal, Quiet Luxury, Classic',
      fits:      'tailored, comfortable, well-structured',
      colorNote: 'timeless palette — navy, camel, stone, white, burgundy; minimal novelty prints',
      brandTier: 'premium and heritage brands; Nordstrom, Bloomingdale\'s, Ralph Lauren, quality investment',
      insight:   'Classic silhouettes; high-quality fabrics; comfort increasingly important without sacrificing polish; heritage brands resonate; minimal trend sensitivity',
    },
    '55_plus': {
      styles:    'Classic, Smart Casual, Minimal, Quiet Luxury',
      fits:      'comfortable, relaxed tailored, easy movement',
      colorNote: 'classic timeless palette; elegant neutrals; quality fabrics that drape well',
      brandTier: 'heritage and luxury brands; quality craftsmanship; investment pieces',
      insight:   'Comfort and quality above all; timeless styling; heritage brands; versatile pieces that work across occasions; ease of movement matters',
    },
  };

  const p = priors[ageRange];
  if (!p) return '';
  const label = ageRange === 'under_18' ? 'Under 18'
    : ageRange === '55_plus' ? '55+'
    : ageRange.replace('_', '–');

  return `
Age group: ${label}
Age-informed style baseline (supplement when DNA is sparse — actual DNA and stated preferences always win):
  Typical styles:   ${p.styles}
  Typical fit:      ${p.fits}
  Color tendency:   ${p.colorNote}
  Typical brands:   ${p.brandTier}
  Key insight:      ${p.insight}`;
}

// ── System prompt ──────────────────────────────────────────────────
function buildSystemPrompt(userProfile, recentConversations = [], priorUserTurns = 0, occasionResearch = null) {
  const { styleDna, confidenceLevel, imageCount, wallet,
          favoriteStores, storeOpennessTiers, sizes, styleTags, pinterestBoardUrls, gender, ageRange } = userProfile;

  const dna = styleDna ?? {};

  const sizeLine = sizes
    ? Object.entries(sizes).filter(([,v]) => v).map(([k, v]) => `${k}: ${v}`).join(', ')
    : 'not set — do not ask, tell the user to add them in Style Vault';

  const dnaActive = !!(dna.primary_style_category || dna.dominant_fit || dna.primary_colors?.length);

  // Convert hex palette to readable names for use in search queries
  const primaryColorNames   = [...new Set((dna.primary_colors   ?? []).map(hexToBucket).filter(Boolean))].slice(0, 4);
  const secondaryColorNames = [...new Set((dna.secondary_colors ?? []).map(hexToBucket).filter(Boolean))].slice(0, 3);
  const avoidedColorNames   = [...new Set((dna.avoided_colors   ?? []).map(hexToBucket).filter(Boolean))];

  const genderKey   = gender ?? 'women';
  const genderLabel = genderKey === 'men' ? "men's" : genderKey === 'nonbinary' ? "gender-neutral / unisex" : "women's";
  const genderRule  = genderKey === 'men'
    ? "Every product you search for is men's clothing, shoes, and accessories. Never recommend women's items."
    : genderKey === 'nonbinary'
    ? "Search across both women's and unisex/gender-neutral sections. Avoid strictly gendered items unless they match the request."
    : "Every product you search for is women's clothing, shoes, and accessories. Never search for or recommend men's items.";

  // Style tags as comma-separated for use in queries (up to 3 most specific ones)
  const styleTagsForQuery = styleTags?.slice(0, 3).map(t => t.toLowerCase()).join(' ') || null;

  // When DNA style is empty, fall back to age-group priors or tags rather than the generic "minimal"
  const agePriorObj = {
    under_18: 'streetwear grunge y2k',
    '18_24':  'streetwear vintage normcore',
    '25_34':  'smart casual minimal streetwear',
    '35_44':  'smart casual minimal classic',
    '45_54':  'smart casual classic minimal',
    '55_plus':'classic minimal quiet luxury',
  };
  const styleDefault = styleTagsForQuery
    ?? agePriorObj[ageRange]
    ?? 'smart casual';

  const agePrior = getAgePrior(ageRange);

  // Gender-aware prefix for search queries and negative constraint
  const genderPrefix = genderKey === 'men' ? "men's" : genderKey === 'nonbinary' ? 'unisex' : "women's";
  const genderNever  = genderKey === 'men' ? "women's" : "men's";

  return `You are Lychee — a personal shopping agent. ${genderRule}

USER PROFILE (do not call any tool to fetch this — it is complete):
- Gender: ${genderLabel} — ALL searches must target ${genderLabel} items
- Age group: ${ageRange ? ageRange.replace('_', '–').replace('plus', '+') : 'not specified'}
- Confidence: ${confidenceLevel} (${imageCount} wardrobe/inspiration images analyzed)
- Wallet: $${wallet?.balance?.toFixed(2) ?? '0.00'}
- Style tags: ${styleTags?.length ? styleTags.join(', ') : 'none set'}
- Pinterest boards analyzed: ${pinterestBoardUrls?.length ? pinterestBoardUrls.join(', ') : 'none'}
- Primary style: ${dna.primary_style_category ?? 'not yet determined'}
- Secondary styles: ${dna.secondary_categories?.join(', ') || 'none'}
- Dominant fit: ${dna.dominant_fit ?? 'not yet determined'}
- Primary colors: ${primaryColorNames.length ? primaryColorNames.join(', ') : 'not determined'}
- Secondary colors: ${secondaryColorNames.length ? secondaryColorNames.join(', ') : 'none'}
- Avoided colors: ${avoidedColorNames.length ? avoidedColorNames.join(', ') : 'none identified'}
- Formality range: ${dna.formality_range_min ?? '?'}–${dna.formality_range_max ?? '?'}/10
- Brand affinities: ${dna.brand_affinities?.join(', ') || 'none'}
- Brand rejections: ${dna.brand_rejections?.join(', ') || 'none'}
- Aspiration gap (from Pinterest/inspo): ${dna.aspiration_gap?.join(', ') || 'none identified'}
- Favorite stores: ${favoriteStores?.length ? favoriteStores.join(', ') : 'none set'}
- Shopping openness: ${
  !storeOpennessTiers?.length ? 'not set — default to mainstream and mixed sources' :
  storeOpennessTiers.includes('open') && storeOpennessTiers.includes('mainstream') ? 'mainstream + mixed + open (any source, including eBay, TikTok Shop, indie brands)' :
  storeOpennessTiers.includes('open') && storeOpennessTiers.includes('mixed') ? 'mixed + open (mainstream and emerging brands, eBay/TikTok Shop ok)' :
  storeOpennessTiers.includes('open') ? 'open (any source — eBay, TikTok Shop, indie brands all ok)' :
  storeOpennessTiers.includes('mainstream') && storeOpennessTiers.includes('mixed') ? 'mainstream + some indie (stick to established brands with occasional smaller finds)' :
  storeOpennessTiers.includes('mixed') ? 'mixed (mainstream plus smaller/emerging brands)' :
  'mainstream only (established brands and well-known retailers — avoid unknown/unverified sellers)'
}
- Sizes: ${sizeLine}
${agePrior}
${!dnaActive ? '\n⚠ Style DNA has not been synthesized yet. Use age-group baseline + style tags + aspiration gap as your primary signal until wardrobe/Pinterest analysis runs.' : ''}

${occasionResearch ? `━━━ OCCASION RESEARCH — read this before searching ━━━

You researched what is typically worn to this specific event. Use this as your primary styling brief — it tells you exactly what the dress code is, which items belong, and which don't. This is stylist-level knowledge: apply it.

Event: ${occasionResearch.event}
Formality: ${occasionResearch.formality}/10
Dress code: ${occasionResearch.dresscode}
Typical items: ${occasionResearch.typicalItems.join(', ')}
Avoid these items entirely: ${occasionResearch.avoidItems.join(', ')}
Search terms to use: ${occasionResearch.searchTerms.join(', ')}
Stylist context: ${occasionResearch.context}

This dress code overrides the user's everyday style defaults when they conflict. A streetwear-coded user going to a rooftop dinner still needs smart casual pieces — lean into what's appropriate for the occasion while keeping the color palette and fit preference from their DNA. Never recommend items from the "avoid" list above.

` : ''}${recentConversations.length ? `━━━ RECENT SESSIONS ━━━

The user's last ${recentConversations.length} shopping session${recentConversations.length > 1 ? 's' : ''} (for continuity — do not re-ask about these):
${recentConversations.map((c, i) => `  ${i + 1}. "${c.title}" — ${formatRelativeDate(c.updated_at)}`).join('\n')}

Use this to: reference past context naturally ("last time you were looking for Italy fits…"), avoid recommending the same things, and notice evolving style patterns. Do NOT start every message by recapping the history.

` : ''}━━━ CLARIFYING QUESTIONS — read profile confidence before deciding ━━━

Before searching, check the user's message against these 4 items:
  1. Item types + count  — "2 tops", "a dress and sandals", "blue jeans and a flannel"
  2. Occasion / use case — "beach trip", "dinners out", "California trip" all count
  3. Budget              — must be explicitly stated. If missing, ask: "What's your budget for this?" Do not search until answered.
  4. Vibe / direction    — "similar to my board", "something edgy", a trip theme

CONFIDENCE IS ${confidenceLevel.toUpperCase()} — adjust accordingly:

If confidence is HIGH:
  • All 4 present → search immediately.
  • Items + occasion + budget present, vibe missing → infer from DNA and search.
  • Budget missing → ask for it. One question only.

If confidence is LOW or MEDIUM:
  • Items + occasion + budget present → ask ONE short question about vibe/inspiration before searching. Example: "Got it — any specific vibe you're going for, or should I go off your Pinterest board energy?"
  • Items missing → ask what they need.
  • Occasion missing → ask when/where.
  • Budget missing → ask for it. Never assume or infer from wallet.
  • Never ask about sizes, stores, or fit — those come from the profile.

AFTER THEY ANSWER YOUR QUESTION → SEARCH. Do not ask a second question. Ever.
If the answer is vague → make your best inference and proceed.
If the user says "yes", "just find it", "go ahead", or shows any impatience → SEARCH NOW.

AFTER THEY ANSWER YOUR QUESTION → SEARCH. Do not ask a second question. Ever.
If the answer is vague → make your best inference and proceed. Do not ask again.
If the user says "yes", "just find it", "go ahead", or shows any impatience → SEARCH NOW.

NEVER ask about — you already have these:
  • Style, vibe, or aesthetic  → DNA + style tags + board
  • Colors or palette          → DNA
  • General fit preference     → DNA (dominant_fit tells you relaxed vs slim vs oversized)
  • Flannel as layer vs. not   → infer from context
  • Standalone vs. outfit      → irrelevant, find what they asked for
  • Favorite stores            → profile
  • Sizes                      → profile

FIT CLARIFICATION EXCEPTION — ask when fit spectrum matters:
  Jeans/trousers cover a huge range even within "relaxed" or "baggy". When a user asks for
  jeans or pants without a precise fit descriptor (or uses a broad word like "baggy", "loose",
  "wide"), ask ONE targeted [CHOICES] question about where on the spectrum they want.
  This applies regardless of confidence level — DNA tells you relaxed vs slim, not
  "barrel-fit" vs "skate-wide" vs "slightly relaxed straight".

  Good: "How baggy are we going with these jeans?
  [CHOICES: Slightly relaxed straight | Barrel / wide-leg | Skate wide / very baggy]"

  Good: "What kind of fit for the trousers?
  [CHOICES: Tapered slim | Straight relaxed | Wide-leg]"

  ALREADY ANSWERED — check conversation history FIRST. If any prior message already answers
  the fit question (contains words like: medium, regular, not too, a bit, slightly, kinda,
  moderate, semi, or any numeric like "32", "34"), DO NOT ask again. Treat it as answered and
  proceed directly to search. Asking the same fit question twice is a hard failure.

  Skip this question if the user already specified: "slim", "straight", "skinny", "tapered",
  "wide-leg", "barrel", "flare", "bootcut", "skater", or a specific numeric measurement.

TEE/TOP CLARIFICATION — ask when the user explicitly invites questions:
  When the user says "ask me clarifying questions" (or similar) AND they requested graphic tees,
  you may ask ONE question about tee style — but COMBINE it with the fit question into a single
  message, not two separate messages. Never ask more than one message worth of questions total.

  Good combined: "Two quick things — how baggy for the jeans, and what kind of graphic tees?
  Fit: [CHOICES: Slightly relaxed | Medium baggy | Very wide/skater]
  Tees: [CHOICES: Band / music tees | Vintage washed graphic | Oversized boxy print | Athletic graphic]"

  If the user did NOT invite clarifying questions, skip the tee question entirely — infer from DNA.

━━━ PROFILE-DRIVEN SEARCH — use the DNA in every query ━━━

Every search query MUST start with "${genderPrefix}" — no exceptions. Never use ${genderNever} terms that would return the wrong gender's items.
${dnaActive ? `
Query formula — ALWAYS in this order:
  ${genderPrefix} [fit] [color] [style] [item] [occasion keyword]

  Fit:     "${dna.dominant_fit ?? 'relaxed'}"
  Colors:  "${primaryColorNames.slice(0,2).join(' ') || 'neutral'}"
  Style:   "${dna.primary_style_category ?? styleDefault}"

  Style tags set by user (USE ALL OF THESE in queries, not just the first):
  ${styleTags?.length ? styleTags.map(t => `"${t}"`).join(', ') : 'none — infer from DNA'}
  When constructing a query, pick the 1-2 most relevant style tags for the item type.
  e.g. for jeans from a "Streetwear, Vintage, Grunge" user: "${genderPrefix} relaxed vintage wash baggy jeans streetwear"
  e.g. for a top from same user: "${genderPrefix} oversized graphic vintage tee grunge"

  Good example:  "${genderPrefix} ${dna.dominant_fit ?? 'relaxed'} ${primaryColorNames[0] ?? 'neutral'} ${dna.primary_style_category ?? (styleTagsForQuery ?? 'minimal')} trousers casual"
  Good example:  "${genderPrefix} straight leg blue jeans"
  Bad example:   "flannel shirt"  ← no gender prefix → returns wrong gender items
  Bad example:   "jeans"          ← too vague, missing "${genderPrefix}"

Color words must be plain English (black, navy, beige, etc.) — never hex codes.
` : `
Profile is still building — style tags are your primary signal:
  Tags: ${styleTags?.join(', ') || 'none set'}
  Use ALL tags together to craft queries. Pick the 1-2 most item-relevant tags per search.
  Query formula: ${genderPrefix} [fit] [style tags] [item] [occasion]
  e.g. "${genderPrefix} relaxed ${styleTags?.slice(0,2).map(t => t.toLowerCase()).join(' ') ?? styleDefault} trousers casual"
`}
Cross-reference with wardrobe before building outfits — don't suggest items they likely already own based on their existing style.
CRITICAL — never recommend something they already own: If their wardrobe includes a Superman tee, a Stüssy graphic, or any specific branded/character item, do NOT search for that same item. Translate it into aesthetic language instead: Superman tee → "vintage pop culture graphic tee", Stüssy scorpion → "Japanese streetwear graphic tee". The goal is similar vibe, not the same item.
Prioritize aspiration gap items — these are things they want but don't have yet.

━━━ YOUR PROFILE IS ALWAYS ACTIVE — never wait to be told ━━━

You are never starting from zero. Every single search you run is shaped by this user's complete
style profile — wardrobe, Pinterest boards, inspiration uploads, style tags, and DNA. You do NOT
need to be told to "use your profile," "take inspiration from my board," or "keep my aesthetic in
mind." You are already doing this. It is not optional and not triggered by phrases.

What is always baked into your searches:
  • Primary + secondary colors    → use the most relevant one in every query
  • Dominant fit                  → bake into every bottoms/outerwear/tops query
  • Primary style + style tags    → shape the aesthetic language of every query
  • Aspiration gap (from boards)  → what they want but don't have — proactively surface these
  • Brand affinities/rejections   → favor affinities, note rejections when relevant

The Style DNA was built FROM their boards and inspo photos. When you search using the DNA, you
ARE already using their board. Never say "I'll use your board for this" — it is already happening.
Never reference the profile only when asked — reference it in every reply, unprompted.

─── The ONE case for get_inspo_products ───
Only call this when the user explicitly wants actual products visually matched to their saved pins:
  "show me things from my inspo pictures", "find stuff like what I saved/pinned", "shop my board",
  "products similar to my Pinterest saves"

→ This is PRODUCT RETRIEVAL — returning items matched to specific saved images.
→ Style guidance is always already active via DNA. These are separate.
→ If the user says "inspired by my board, find me flannels" — do NOT call get_inspo_products.
   Search for flannels using the DNA (which IS their board's aesthetic already).
   get_inspo_products returns whatever is in their pins (could be anything), not necessarily flannels.
→ If get_inspo_products returns has_results: false, say so briefly and fall back to search_products.
→ If the user asks for "stuff like my board" AND specific items, call both in the same turn.

━━━ SEARCH RULES ━━━

- ONLY search for item categories the user explicitly asked for. If they asked for tops and bottoms, do not add shoes or accessories unless they asked.
- Search ALL categories at once in a SINGLE turn (parallel execution). NEVER split searches across multiple turns — do them all at once.
- MULTIPLE TYPES IN ONE CATEGORY: When the user asks for 2+ distinct subtypes within the same category, you MUST make a SEPARATE search_products call for EACH named subtype — never combine them into one query.
  Examples:
    "baggy jeans AND cargo jeans" → call search("men's baggy wide-leg jeans", bottoms) AND search("men's cargo pants", bottoms) — two separate calls
    "two graphic tees" → call search("men's graphic tee streetwear", tops) AND search("men's band tee vintage", tops)
  WRONG: search("men's baggy cargo jeans") — one combined call loses variety
  Doing one search for multiple subtypes is a hard failure — the outfit builder cannot guess which subtype to use.
- Search broadly — Google Shopping surfaces all stores naturally. Do not restrict to favorite stores.
- Use exact Style DNA attributes in every query.
- No category limit — if the user asked for 5 categories, search all 5.
- CATEGORY RULES: Flannel, cardigan, hoodie, blazer, jacket, coat = category: outerwear. NEVER use category: tops for these, even if they are technically tops. This prevents overwriting the tops search results.
- VIBE IN QUERIES: Always incorporate the user's stated vibe and occasion into every query. If they said "breezy California beach", add "coastal casual breezy" to the query. If they said "edgy city", add "urban edgy". The conversation context adds specificity that the DNA formula alone can't provide.
  Good: "women's relaxed coastal breezy linen button-down top beach California"
  Good: "women's oversized plaid flannel shirt coastal casual layer"
  Bad:  "women's flannel" — too generic, returns hunting/outdoor brands

PIPELINE (follow exactly, no deviations):
  STEP 1 — Call search_products for every requested category, ALL IN THE SAME TURN.
  STEP 2 — Short reply after results come back. Outfits are assembled automatically. The UI shows products visually.

CONFIDENCE LEVEL IS ${confidenceLevel.toUpperCase()}:
${confidenceLevel === 'low'
  ? '→ Profile still building. Ask clarifying questions, search broader, offer variety, invite feedback after results.'
  : confidenceLevel === 'medium'
  ? '→ Good signal. Be assertive once you have item clarity.'
  : '→ Strong profile. Once items are confirmed, search with precision.'
}

OTHER RULES:
- Reference the user's specific profile in replies — never generic language
- If wallet is insufficient for an order, state the shortfall and stop
- Keep text replies to 1–3 sentences
- Never invent products. All recommendations must come from search_products.
- If search returns an error, tell the user exactly what failed.
- NEVER say you are "hitting a search limit", "can't search right now", or imply a technical block unless search_products literally returned an error. You always have the ability to search. If you need more info before searching, just ask — do not invent a limit as an excuse.

━━━ BUDGET RULE ━━━

Wallet balance ($${wallet?.balance?.toFixed(0) ?? '0'}) is a PAYMENT LIMIT — not a search budget.
Never use it as a price ceiling when searching. The search budget comes only from what the user explicitly states.
  • User says "$200" or "under $200" → use that as maxPrice in search
  • User says nothing about budget → ask for it before searching. One short question: "What's your budget for this?" Do not search until they answer.
  • Order payment → only then check wallet balance to confirm they can cover it

━━━ FORMATTING — STRICT ━━━

Plain text only. The UI does not render markdown.
- NO asterisks for bold or italic (**word** or *word* will display as raw asterisks to the user)
- NO pound signs for headers
- NO hyphens or asterisks as bullet points
- Use a plain numbered list (1. 2. 3.) only when truly needed
- Em-dash (—) is fine for separation. ALL CAPS for emphasis if needed.

QUICK-REPLY CHOICES:
When your clarifying question has 2–4 bounded options (activity type, occasion, style direction — NOT open-ended things like budget or item count), append this tag on its own line at the very end of your message:
[CHOICES: option one | option two | option three]

The UI renders these as tap-able buttons — do not list the options again in your text.
Good use: "What kind of activities are you packing for?\n[CHOICES: Beach + casual | City exploring | Dinners out | Mix of all]"
Good use: "Is this more of a work thing or going-out thing?\n[CHOICES: Work / office | Going out | Both]"
Bad use: budget questions, item count, anything needing a typed answer — no [CHOICES] for those.

━━━ FULL-OUTFIT COVERAGE ━━━

When the user makes a trip / occasion / seasonal request WITHOUT naming specific items
(e.g. "Italy trip", "summer clothes", "weekend fits", "rooftop dinner"), you MUST search
ALL of these in a SINGLE turn: tops, bottoms, shoes. That's 3 separate search_products
calls in one turn. Do not search only one category for a full-outfit request.
${priorUserTurns > 0 ? `
━━━ ⚠ NO MORE QUESTIONS — SEARCH NOW ━━━

The user has already answered your clarifying question. This is turn ${priorUserTurns + 1}.
You have enough context. Call search_products immediately.
DO NOT ask any further questions — not about vibe, not about fit, not about anything.
Make your best inference from what was said and SEARCH. Asking again is a hard failure.
` : ''}`;
}

// ── Choices parser ─────────────────────────────────────────────────
// Strips [CHOICES: a | b | c] from the end of agent text and returns
// { reply: cleanText, choices: string[] | null }
function parseChoices(text) {
  const match = text.match(/\[CHOICES:\s*([^\]]+)\]\s*$/i);
  if (!match) return { reply: text.trim(), choices: null };
  const choices = match[1].split('|').map(s => s.trim()).filter(Boolean);
  const reply   = text.slice(0, match.index).trim();
  return { reply, choices: choices.length >= 2 ? choices : null };
}

// ── Tool execution ─────────────────────────────────────────────────
async function executeTool(toolName, toolInput, userId, userProfile, excludeProductName = null, occasion = null) {
  switch (toolName) {
    // search_products: fetch, score, return best matches.
    // If DNA isn't strong enough to push anything above the 60-pt threshold,
    // fall back to the top-scored results rather than returning nothing.
    case 'search_products': {
      // Enforce correct gender prefix — replace wrong gender if present, add correct one if missing
      const gPrefix = (userProfile.gender === 'men') ? "men's" : (userProfile.gender === 'nonbinary') ? "unisex" : "women's";
      const gWrong  = gPrefix === "men's" ? /^women'?s?\s+/i : /^men'?s?\s+/i;
      let query = toolInput.query ?? '';
      if (gWrong.test(query)) {
        query = `${gPrefix} ${query.replace(gWrong, '')}`;
      } else if (!/^(women'?s?|men'?s?|unisex)\b/i.test(query)) {
        query = `${gPrefix} ${query}`;
      }
      const results = await searchProducts({ ...toolInput, query, countryCode: userProfile.countryCode, styleDna: { ...userProfile.styleDna, gender: userProfile.gender === 'men' ? 'mens' : userProfile.gender === 'women' ? 'womens' : null } });
      if (!results.length) return [];
      const scored = results.map(p => ({ ...p, ...scoreProductMatch(p, userProfile.styleDna, occasion, userProfile.recentFeedbackSignals ?? []) }));
      // Filter out the excluded product (swap reroll) — normalize both names for fuzzy match
      const normalize = s => (s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const excludeKey = excludeProductName ? normalize(excludeProductName).slice(0, 40) : null;
      const filtered = excludeKey
        ? scored.filter(p => !normalize(p.name).includes(excludeKey.slice(0, 25)))
        : scored;
      const passed = filtered.filter(p => p.passes !== false);
      return (passed.length >= 3 ? passed : filtered)
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
        .slice(0, 10);
    }

    case 'get_inspo_products':
      return getInspoProducts(
        userId,
        userProfile.styleDna,
        toolInput.category_filter ?? null
      );

    case 'create_order':
      return createOrder({
        userId,
        items:         toolInput.items,
        totalPrice:    toolInput.total_price,
        occasion:      toolInput.occasion,
        outfitContext: toolInput.outfit_context,
      });

    case 'update_style_dna':
      return updateStyleDna(
        userId,
        toolInput.signal_type,
        toolInput.item_attributes,
        toolInput.swap_target ?? null,
        toolInput.inferred_reason ?? null,
      );

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

// ── Request keyword filter ─────────────────────────────────────────
// Removes products from a category that don't match the user's explicit subtype request.
// Falls back to unfiltered if fewer than 2 products match (preserves recall).
function applyRequestKeywordFilter(cache, keywords) {
  if (!Object.keys(keywords).length) return cache;
  const filtered = { ...cache };
  for (const [cat, words] of Object.entries(keywords)) {
    if (!filtered[cat]?.length || !words.length) continue;
    const matches = filtered[cat].filter(p =>
      words.some(w => (p.name ?? '').toLowerCase().includes(w))
    );
    if (matches.length >= 2) filtered[cat] = matches;
  }
  return filtered;
}

// ── Image enrichment ──────────────────────────────────────────────
// Uses the stored serpapi_product_link to fetch the full image gallery
// from SerpAPI's google_product engine. Runs server-side so the frontend
// receives complete image arrays without any extra client API calls.
async function enrichProductImages(outfits) {
  if (!outfits?.length) return;
  const items = outfits.flatMap(o => o.items ?? []);
  const toEnrich = items.filter(i => {
    const p = i.product;
    return p?.serpapi_product_link && (p?.all_images?.length ?? 0) <= 1;
  });
  if (!toEnrich.length) return;

  await Promise.allSettled(toEnrich.map(async item => {
    const p = item.product;
    try {
      const url = new URL(p.serpapi_product_link);
      url.searchParams.set('api_key', process.env.SHOPPING_API_KEY);
      const res  = await fetch(url.toString(), { signal: AbortSignal.timeout(5000) });
      const data = await res.json();
      const imgs = (data.product_results?.media ?? [])
        .filter(m => m.type === 'image' && m.link)
        .map(m => m.link);
      if (imgs.length > 0) {
        p.all_images = [...new Set([p.image_url, ...imgs].filter(Boolean))];
      }
      // Upgrade product_url to a direct retailer link when available.
      // Google Shopping's link field goes through google.com; the product API
      // sellers list has the real store URLs — prefer those when present.
      const sellers = data.product_results?.sellers?.online
        ?? data.product_results?.online_sellers
        ?? [];
      const directLink = sellers.find(s => s.link)?.link ?? null;
      if (directLink && (!p.product_url || /google\.com/.test(p.product_url))) {
        p.product_url = directLink;
      }
    } catch {
      // silently skip — frontend falls back to the thumbnail already in all_images
    }
  }));
}

// ── Main handler (Vercel serverless function) ──────────────────────
export const config = { maxDuration: 300 };

async function runAgent(message, conversationHistory, userId, recentConversations = [], excludeProductName = null) {
  agentLog.agentStart(userId, message);
  // Fetch profile once — reused for system prompt and cached for tool calls
  const userProfile = await getUserProfile(userId);

  const messages = [
    ...conversationHistory,
    { role: 'user', content: message },
  ];

  const LOOP_MODEL  = 'claude-sonnet-4-6';
  const LOOP_TOKENS = 2048;

  let lastOutfits      = null;
  let hasSearchResults = false;
  const MAX_TURNS      = 4;
  let turns            = 0;

  // How many user messages have already been exchanged — used to enforce
  // "no more questions after first answer" in both slot engine and agent loop.
  const priorUserTurns = conversationHistory.filter(m => m.role === 'user').length;

  // Build text corpus from USER messages only — assistant text contains product names
  // that would pollute category detection and item counts.
  const userText = [message, ...conversationHistory
    .filter(m => m.role === 'user')
    .map(m => typeof m.content === 'string' ? m.content :
      (m.content ?? []).filter(b => b.type === 'text').map(b => b.text).join(' ')
    )
  ].join(' ').toLowerCase();

  // Build occasion string early — needed by both slot engine and agent loop
  const occasionPatternsEarly = [
    [/\bsummer\b/,                             'summer'],
    [/\bwinter\b/,                             'winter'],
    [/\bfall\b|\bautumn\b/,                    'fall'],
    [/\bspring\b/,                             'spring'],
    [/\bitaly\b|\brome\b|\bflorence\b|\bmilan\b|\bamalfi\b|\bsicily\b/, 'italy summer warm'],
    [/\beurope\b|\beuropean\b|\bparis\b|\bbarcelona\b|\bgreece\b/,      'europe travel'],
    [/\bbeach\b|\bpool\b/,                     'beach summer'],
    [/\bvacation\b|\bholiday\b|\bresort\b/,    'vacation warm'],
    [/\btravel\b|\btrip\b/,                    'travel'],
    [/\btropical\b|\bbali\b|\bmiami\b|\btulum\b/, 'tropical summer warm'],
    [/\boffice\b|\bwork\b|\bbusiness\b/,       'office work'],
    [/\bwedding\b/,                            'wedding formal'],
    [/\bformal\b|\bblack.?tie\b|\bgala\b/,    'formal evening'],
    [/\bdinner\b|\bdate\b/,                    'dinner evening'],
    [/\bparty\b|\bclub\b|\bnight out\b/,       'party night'],
    [/\bgym\b|\bworkout\b|\bathletic\b|\bsport\b/, 'gym athletic'],
    [/\bcasual\b|\bweekend\b/,                 'casual'],
    [/\bcalifornia\b|\bla\b|\bla beach\b/,     'california summer'],
    [/\bbrunch\b/,                             'brunch casual'],
  ];
  const occasionWordsEarly = new Set();
  for (const [re, label] of occasionPatternsEarly) {
    if (re.test(userText)) label.split(' ').forEach(w => occasionWordsEarly.add(w));
  }
  const occasion = occasionWordsEarly.size ? [...occasionWordsEarly].join(' ') : null;

  // ── OCCASION RESEARCH ─────────────────────────────────────────────
  // Only trigger for messages that suggest a specific named event/venue/occasion.
  // Instant static lookup — zero latency, no API call
  const occasionResearch = researchOccasion(message);
  if (occasionResearch) {
    console.log(`[occasion-research] "${occasionResearch.event}" (formality ${occasionResearch.formality}/10)`);
  }

  // ── SLOT ENGINE: deterministic per-item search ────────────────────
  // Parse user's request into typed slots and fill each one with a
  // targeted search. This is the primary path for specific-item requests.
  // Vague requests (no named items) fall through to the agent loop.
  const requiredSlots = parseRequestSlots(userText);
  console.log(`[slots] parsed ${requiredSlots.length} slots:`, requiredSlots.map(s => `${s.id}(${s.label})`).join(', ') || 'none (vague request)');

  // ── WARDROBE REDO PATH ────────────────────────────────────────────
  // Triggered when the user wants a full wardrobe refresh/overhaul.
  // Runs broad searches across all major categories, returns many
  // options per category for the browsable redo layout in the UI.
  const isWardrobeRedo = /\b(redo|revamp|refresh|overhaul|rebuild|replace|redo)\b.{0,40}\bwardrobe\b|\bwardrobe\b.{0,40}\b(redo|revamp|refresh|overhaul|rebuild)\b|\b(new|whole|full|entire|complete)\s+wardrobe\b|\bwardrobe\s+(for|this)\s+(summer|fall|winter|spring|season)\b/i.test(message);

  if (isWardrobeRedo) {
    const budget    = parseBudget(message) ?? userProfile.wallet?.balance ?? null;
    const redoSlots = buildWardrobeRedoSlots(userProfile.styleDna, occasion);
    const slotCache = await fillSlots(redoSlots, userProfile, occasion, budget);
    const outfits   = buildShoppingBoard(redoSlots, slotCache, 10);
    await enrichProductImages(outfits);

    const catSummary = redoSlots
      .filter(s => slotCache[s.id]?.length)
      .map(s => `${s.label} (${slotCache[s.id].length} options)`)
      .join(', ');

    const ctxMsg = `[Wardrobe redo complete. Found: ${catSummary}. The UI shows a category-by-category browsable layout where the user can select favourites. Reply in 1–2 sentences — acknowledge this is a full refresh and briefly describe the aesthetic direction you searched in based on their DNA. Plain text only.]`;
    const replyResp = await client.messages.create({
      model:      LOOP_MODEL,
      max_tokens: 256,
      system:     cachedSystem(buildSystemPrompt(userProfile, recentConversations, priorUserTurns, occasionResearch)),
      messages:   [...conversationHistory, { role: 'user', content: message }, { role: 'user', content: ctxMsg }],
    });
    const { reply, choices } = parseChoices(replyResp.content.find(b => b.type === 'text')?.text ?? '');
    return { reply, history: messages, outfits, wardrobeRedo: true, choices };
  }

  // ── REFINEMENT PATH ───────────────────────────────────────────────
  // When the user is giving feedback on prior results (no new item request
  // parsed from this message alone) and there's prior conversation context,
  // route through the refinement pipeline instead of a fresh search.
  if (requiredSlots.length === 0 && priorUserTurns > 0) {
    const t = message.toLowerCase();
    const looksLikeFeedback = message.length < 300 && (
      /too (dark|light|bright|casual|formal|expensive|cheap|similar|different|boring|loud|busy)/i.test(t) ||
      /more (relaxed|fitted|colorful|neutral|vintage|minimal|casual|formal|earthy|muted|washed)/i.test(t) ||
      /less (dark|light|casual|formal|expensive|loud|busy|graphic|printed|branded)/i.test(t) ||
      /nothing with\b|no (logos?|graphics?|prints?|patterns?|branding|text)/i.test(t) ||
      /different (color|style|fit|vibe|aesthetic)/i.test(t) ||
      /not (my style|what i wanted|right|it)/i.test(t) ||
      /\b(cheaper|pricier|lighter|darker|baggier|slimmer|looser|tighter|softer|cleaner)\b/i.test(t) ||
      /\b(refine|tighten|narrow|sharpen|adjust|tweak)\b.*(search|results|look|picks)/i.test(t) ||
      /\b(these|this|them|those) (don'?t|aren'?t|isn'?t|look|feel|seem|are)\b/i.test(t)
    );

    if (looksLikeFeedback) {
      // Reconstruct which item types to re-search from historical user messages
      const historicalUserText = conversationHistory
        .filter(m => m.role === 'user')
        .map(m => typeof m.content === 'string' ? m.content :
          (m.content ?? []).filter(b => b.type === 'text').map(b => b.text).join(' '))
        .join(' ');
      const priorSlots = parseRequestSlots(historicalUserText);

      if (priorSlots.length > 0) {
        const budget = parseBudget(message) ?? userProfile.wallet?.balance ?? null;
        try {
          const refinement = await handleRefinementSearch(
            message, priorSlots, userProfile, occasion, budget, conversationHistory
          );
          const { plan, outfits, description, verified, gaps } = refinement;

          const verifyNote = verified
            ? 'Verification passed — new results fully satisfy the feedback.'
            : `Partial match — remaining issues: ${gaps.join('; ')}.`;

          const ctxMsg = `[Refinement search complete. Opus understood the feedback as: "${plan.interpretation}". Changes applied: ${description}. ${verifyNote} Updated product cards are displayed in the UI. Reply in 1–2 plain sentences confirming what was adjusted. No markdown.]`;

          const replyResp = await client.messages.create({
            model:      LOOP_MODEL,
            max_tokens: 256,
            system:     cachedSystem(buildSystemPrompt(userProfile, recentConversations, priorUserTurns, occasionResearch)),
            messages:   [...conversationHistory, { role: 'user', content: message }, { role: 'user', content: ctxMsg }],
          });
          const { reply, choices } = parseChoices(replyResp.content.find(b => b.type === 'text')?.text ?? '');
          return { reply, history: messages, outfits, choices };
        } catch (err) {
          console.error('[refine] refinement pipeline failed:', err.message);
          // Fall through to slot engine / agent loop
        }
      }
    }
  }

  if (requiredSlots.length > 0) {
    // ── Pre-search fit clarification (jeans/trousers) ─────────────
    // Jeans fit spans a huge range — barrel vs straight vs skater are
    // completely different results. Always ask on the FIRST turn if the
    // user requested bottoms without a precise fit word, even when they
    // gave vibe/occasion context. This check is independent of hasVibeContext.
    const hasBottomSlot = requiredSlots.some(s => s.category === 'bottoms');
    const fitAlreadySpecified = /\b(slim|skinny|straight|baggy|wide.?leg|barrel|skater|skate|flare|bootcut|tapered|relaxed|loose|fitted|regular)\b/i.test(message);
    const fitAlreadyAnswered  = conversationHistory.some(m => {
      const txt = typeof m.content === 'string' ? m.content :
        (m.content ?? []).filter(b => b.type === 'text').map(b => b.text).join(' ');
      return /\b(slim|skinny|straight|baggy|wide.?leg|barrel|skater|skate|flare|bootcut|tapered|relaxed|loose|fitted|regular|medium|not too|a bit|slightly|kinda|moderate|\d{2}"?)\b/i.test(txt);
    });

    if (priorUserTurns === 0 && hasBottomSlot && !fitAlreadySpecified && !fitAlreadyAnswered) {
      const ctxMsg = `[The user asked for bottoms (jeans/pants) without specifying fit. Ask ONE targeted question about fit — this matters a lot for search quality and "relaxed" is too broad to be useful. Use [CHOICES] with 3 options. Keep it to one sentence. Examples of good choices: "Slightly relaxed straight | Barrel / wide-leg | Skate wide / very baggy" or "Slim / straight | Relaxed / tapered | Wide / barrel". Do NOT search yet — wait for the answer.]`;
      const clarifyResp = await client.messages.create({
        model:      LOOP_MODEL,
        max_tokens: 200,
        system:     cachedSystem(buildSystemPrompt(userProfile, recentConversations, priorUserTurns, occasionResearch)),
        messages:   [...conversationHistory, { role: 'user', content: message }, { role: 'user', content: ctxMsg }],
      });
      const { reply: clarifyText, choices: clarifyChoices } = parseChoices(
        clarifyResp.content.find(b => b.type === 'text')?.text ?? ''
      );
      return { reply: clarifyText, history: messages, outfits: null, choices: clarifyChoices };
    }

    // ── Pre-search vibe clarification ─────────────────────────────
    // If there's no occasion or vibe context at all, ask one question
    // before searching. Skip if fit question was already triggered above.
    const hasVibeContext = occasion !== null ||
      /\b(casual|formal|edgy|minimal|vintage|streetwear|grunge|chill|clean|classic|preppy|coastal|retro|vibe|aesthetic|look|feel|style|inspired|inspo|mood|trip|travel|event|night|day|summer|winter|spring|fall)\b/i.test(message);

    if (priorUserTurns === 0 && !hasVibeContext) {
      const slotLabels = requiredSlots.map(s => s.label);
      const uniqueLabels = [...new Set(slotLabels)].join(', ');
      const ctxMsg = `[The user just asked for: ${uniqueLabels}. Before searching, ask ONE short question — about occasion, vibe, or any context that would meaningfully narrow results. Examples: What this is for (going out? work? travel?), or if there's a specific direction they're going for. Use [CHOICES] if 2–4 bounded options fit. Do NOT ask about budget, sizes, stores, or fit. Keep it to one sentence.]`;
      const clarifyResp = await client.messages.create({
        model:      LOOP_MODEL,
        max_tokens: 200,
        system:     cachedSystem(buildSystemPrompt(userProfile, recentConversations, priorUserTurns, occasionResearch)),
        messages:   [...conversationHistory, { role: 'user', content: message }, { role: 'user', content: ctxMsg }],
      });
      const { reply: clarifyText, choices: clarifyChoices } = parseChoices(
        clarifyResp.content.find(b => b.type === 'text')?.text ?? ''
      );
      return { reply: clarifyText, history: messages, outfits: null, choices: clarifyChoices };
    }

    const budget      = parseBudget(message) ?? null;
    const outfitBudget = budget ?? userProfile.wallet?.balance ?? null;
    const slotCache   = await fillSlots(requiredSlots, userProfile, occasion, budget, null, occasionResearch);
    const filled      = requiredSlots.filter(s => (slotCache[s.id]?.length ?? 0) > 0);
    const unfilled    = requiredSlots.filter(s => !(slotCache[s.id]?.length ?? 0));

    console.log(`[slots] filled=${filled.length}/${requiredSlots.length}` +
      (unfilled.length ? ` unfilled=[${unfilled.map(s => s.label).join(', ')}]` : ''));

    // Enrich all slot products with thumbnail analysis AFTER searches complete,
    // so it never competes with the 12s search timeout inside fillSlots.
    const allSlotProducts = Object.values(slotCache).flat();
    if (allSlotProducts.length > 0) {
      await enrichSearchResults(allSlotProducts);
    }

    if (filled.length > 0) {
      lastOutfits       = buildShoppingBoard(requiredSlots, slotCache);
      await enrichProductImages(lastOutfits);
      hasSearchResults  = true;

      // Summarise results for the agent to write an accurate text reply
      const found  = filled.map(s  => `${s.label}: "${slotCache[s.id][0].name}" ($${slotCache[s.id][0].price})`).join(', ');
      const missed = unfilled.map(s => s.label).join(', ');

      const ctxMsg = `[Search complete. Found: ${found}.${missed ? ` Could not find: ${missed}.` : ''} Product cards are shown in the UI. Reply in 1-2 sentences. Plain text, no markdown.]`;
      const replyResp = await client.messages.create({
        model:      LOOP_MODEL,
        max_tokens: 256,
        system:     cachedSystem(buildSystemPrompt(userProfile, recentConversations, priorUserTurns, occasionResearch)),
        messages:   [...conversationHistory, { role: 'user', content: message }, { role: 'user', content: ctxMsg }],
      });
      const { reply, choices } = parseChoices(replyResp.content.find(b => b.type === 'text')?.text ?? '');
      return { reply, history: messages, outfits: lastOutfits, choices };
    }
    // All slots empty (all searches failed) — fall through to agent loop
    console.warn('[slots] all slots empty — falling back to agent loop');
  }

  // ── CATEGORY GATE: for vague requests, wait until all categories are cached ──
  const requiredCategories = new Set();
  if (/\btop(s)?\b|\bshirt(s)?\b|\bblouse(s)?\b|\btee(s)?\b|\btank(s)?\b/.test(userText)) requiredCategories.add('tops');
  if (/\bjean(s)?\b|\bbottom(s)?\b|\bpant(s)?\b|\btrousers?\b|\bskirt(s)?\b|\bcargo\b/.test(userText)) requiredCategories.add('bottoms');
  if (/\bshoe(s)?\b|\bsneaker(s)?\b|\bboot(s)?\b|\bsandal(s)?\b|\bheel(s)?\b/.test(userText)) requiredCategories.add('shoes');
  if (/\bflannel(s)?\b|\bjacket(s)?\b|\bcoat(s)?\b|\bouterwear\b|\bblazer(s)?\b|\bcardigan(s)?\b|\bhoodie(s)?\b/.test(userText)) requiredCategories.add('outerwear');
  if (/\bdress(es)?\b/.test(userText)) requiredCategories.add('dress');
  if (/\baccessor|\bbag(s)?\b|\bhat(s)?\b|\bscarf|\bjewelr/.test(userText)) requiredCategories.add('accessories');

  // Parse item counts (from all text including assistant clarifications)
  const fullText = [message, ...conversationHistory.map(m =>
    typeof m.content === 'string' ? m.content : (m.content ?? []).filter(b => b.type === 'text').map(b => b.text).join(' ')
  )].join(' ').toLowerCase();
  const itemCounts = {};
  const countPatterns = [
    [/(\d+|one|two|three|four|five)\s+top/,                   'tops'],
    [/(\d+|one|two|three|four|five)\s+shirt/,                  'tops'],
    [/(\d+|one|two|three|four|five)\s+blouse/,                 'tops'],
    [/(\d+|one|two|three|four|five)\s+(?:graphic\s+)?tee/,     'tops'],
    [/(\d+|one|two|three|four|five)\s+(?:graphic\s+)?t.shirt/, 'tops'],
    [/(\d+|one|two|three|four|five)\s+bottom/,     'bottoms'],
    [/(\d+|one|two|three|four|five)\s+jean/,       'bottoms'],
    [/(\d+|one|two|three|four|five)\s+pant/,       'bottoms'],
    [/(\d+|one|two|three|four|five)\s+dress/,      'dress'],
    [/(\d+|one|two|three|four|five)\s+shoe/,       'shoes'],
    [/(\d+|one|two|three|four|five)\s+sneaker/,    'shoes'],
    [/(\d+|one|two|three|four|five)\s+outerwear/,  'outerwear'],
    [/(\d+|one|two|three|four|five)\s+jacket/,     'outerwear'],
    [/(\d+|one|two|three|four|five)\s+coat/,       'outerwear'],
    [/(\d+|one|two|three|four|five)\s+flannel/,    'outerwear'],
  ];
  const wordToNum = { one: 1, two: 2, three: 3, four: 4, five: 5 };
  for (const [re, cat] of countPatterns) {
    const m = fullText.match(re);
    if (m) {
      const n = parseInt(m[1]) || wordToNum[m[1]] || 1;
      if (n > (itemCounts[cat] ?? 0)) itemCounts[cat] = n;
    }
  }

  // Parse item-subtype keywords from the FULL recent user context — not just the current message.
  // Critical: when user is answering a clarifying question ("medium baggy"), the original
  // item request ("cargo jeans, baggy jeans, graphic tees") is in conversation history.
  // Without this, all subtype filtering and counts reset to zero on follow-up turns.
  const recentUserMessages = [message];
  let _uCount = 0;
  for (const m of [...conversationHistory].reverse()) {
    if (_uCount >= 4) break;
    const role = m.role;
    if (role === 'user') {
      const text = typeof m.content === 'string' ? m.content
        : (m.content ?? []).filter(b => b.type === 'text').map(b => b.text).join(' ');
      recentUserMessages.push(text);
      _uCount++;
    }
  }
  const msgLower = recentUserMessages.join(' ').toLowerCase();
  const requestKeywords = {};
  // Tops subtypes
  if (/button.?down|dress shirt|oxford shirt|poplin|linen shirt|woven shirt|chambray/i.test(msgLower)) {
    requestKeywords.tops = ['button', 'shirt', 'linen', 'oxford', 'woven', 'poplin', 'chambray'];
  } else if (/graphic tee|graphic t.?shirt|band tee|printed tee/i.test(msgLower)) {
    requestKeywords.tops = ['graphic', 'print', 'tee', 't-shirt'];
  } else if (/\bpolo\b/i.test(msgLower)) {
    requestKeywords.tops = ['polo'];
  } else if (/\btank top|\bcami\b/i.test(msgLower)) {
    requestKeywords.tops = ['tank', 'cami', 'sleeveless'];
  } else if (/\blinen\b/i.test(msgLower) && /\btop|\bshirt/i.test(msgLower)) {
    requestKeywords.tops = ['linen'];
  }
  // Bottoms subtypes — additive (user can ask for cargo AND baggy)
  if (/cargo/i.test(msgLower)) {
    requestKeywords.bottoms = [...(requestKeywords.bottoms ?? []), 'cargo'];
  }
  if (/baggy jean|wide.?leg jean|loose jean/i.test(msgLower)) {
    requestKeywords.bottoms = [...(requestKeywords.bottoms ?? []), 'baggy', 'wide', 'loose'];
  }
  if (/\bchinos?\b/i.test(msgLower)) {
    requestKeywords.bottoms = [...(requestKeywords.bottoms ?? []), 'chino'];
  }
  if (/\bshorts?\b/i.test(msgLower)) {
    requestKeywords.bottoms = [...(requestKeywords.bottoms ?? []), 'short'];
  }
  // Shoes subtypes
  if (/sneakers?|trainers?|running shoes?/i.test(msgLower)) {
    requestKeywords.shoes = ['sneaker', 'trainer', 'running'];
  } else if (/\bboots?\b/i.test(msgLower)) {
    requestKeywords.shoes = ['boot'];
  } else if (/\bsandals?\b/i.test(msgLower)) {
    requestKeywords.shoes = ['sandal', 'flip', 'slide', 'mule'];
  } else if (/\bloafers?\b/i.test(msgLower)) {
    requestKeywords.shoes = ['loafer'];
  }

  // Detect multiple NAMED subtypes within the same category (e.g. "baggy jeans, cargo jeans").
  // These carry an implicit count even though no number word appears before them.
  // Also produces subtypeRequirements that tell buildOutfits exactly which subtypes must appear.
  const subtypeRequirements = {};

  const detectedBottomSubtypes = [];
  if (/\bcargo\b/i.test(msgLower))                                          detectedBottomSubtypes.push('cargo jeans/pants');
  if (/\bbaggy\b.*jean|wide.?leg.*jean|loose.*jean|\bjean.*baggy\b/i.test(msgLower)) detectedBottomSubtypes.push('baggy/wide-leg jeans');
  if (/\bchinos?\b/i.test(msgLower))                                        detectedBottomSubtypes.push('chinos');
  if (/\bshorts?\b/i.test(msgLower))                                        detectedBottomSubtypes.push('shorts');
  if (detectedBottomSubtypes.length > 1) {
    subtypeRequirements.bottoms = detectedBottomSubtypes;
    if (!itemCounts.bottoms || itemCounts.bottoms < detectedBottomSubtypes.length) {
      itemCounts.bottoms = detectedBottomSubtypes.length;
    }
  }

  const detectedTopSubtypes = [];
  if (/button.?down|dress shirt|oxford shirt|poplin|linen shirt|woven shirt|chambray/i.test(msgLower)) detectedTopSubtypes.push('button-down shirt');
  if (/graphic tee|graphic t.?shirt|band tee|printed tee/i.test(msgLower)) detectedTopSubtypes.push('graphic tee');
  if (/\bpolo\b/i.test(msgLower))                                            detectedTopSubtypes.push('polo');
  if (/\btank top\b|\bcami\b/i.test(msgLower))                               detectedTopSubtypes.push('tank top');
  if (detectedTopSubtypes.length > 1) {
    subtypeRequirements.tops = detectedTopSubtypes;
    if (!itemCounts.tops || itemCounts.tops < detectedTopSubtypes.length) {
      itemCounts.tops = detectedTopSubtypes.length;
    }
  }

  // Full product objects keyed by category — Claude only sees names/prices in
  // its context window; we keep the authoritative data here so build_outfits
  // always has image_url, product_url, etc. regardless of what Claude passes back.
  const productCache = {};

  let response = await client.messages.create({
    model:       LOOP_MODEL,
    max_tokens:  LOOP_TOKENS,
    system:      cachedSystem(buildSystemPrompt(userProfile, recentConversations, priorUserTurns, occasionResearch)),
    tools:       CACHED_TOOLS,
    tool_choice: { type: 'auto' },
    messages,
  });

  agentLog.agentTurn(0, response.stop_reason, response.usage);

  // Agentic loop — run all tool calls per turn in parallel
  while (turns++ < MAX_TURNS && response.stop_reason === 'tool_use') {
    const toolUseBlocks = response.content.filter(b => b.type === 'tool_use');
    if (!toolUseBlocks.length) break;

    const toolResults = await Promise.all(
      toolUseBlocks.map(async (block) => {
        agentLog.toolCall(block.name, block.input);
        const _toolStart = Date.now();
        try {
          const result = await executeTool(block.name, block.input, userId, userProfile, excludeProductName, occasion);
          agentLog.toolResult(block.name, Date.now() - _toolStart, true, Array.isArray(result) ? `${result.length} items` : typeof result);
          if (block.name === 'search_products' && Array.isArray(result) && result.length > 0) {
            hasSearchResults = true;
            const cat = block.input.category;
            // Strip products the user has explicitly disliked — exact name match (normalized).
            const nk = s => (s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 50);
            const dislikedSet = new Set(
              (userProfile.styleDna?.explicit_dislikes?.product_names ?? []).map(n => nk(n))
            );
            const dedisliked = result.filter(p => !dislikedSet.has(nk(p.name)));
            // Tag explicit search results so they rank above inspo products in the cache.
            const tagged = dedisliked.map(p => ({ ...p, _from_explicit_search: true, score: (p.score ?? 50) + 20, _score: (p._score ?? 50) + 20 }));
            const merged = [...tagged, ...(productCache[cat] ?? [])];
            productCache[cat] = merged
              .filter((p, i, arr) =>
                arr.findIndex(q => (p.id && q.id === p.id) || q.name === p.name) === i
              )
              .sort((a, b) => (b._score ?? b.score ?? 0) - (a._score ?? a.score ?? 0))
              .slice(0, 12);
          }

          // get_inspo_products returns products already grouped by category.
          // Inspo products go AFTER explicit search results in the merge.
          if (block.name === 'get_inspo_products' && result?.has_results) {
            hasSearchResults = true;
            for (const [cat, products] of Object.entries(result.products_by_category ?? {})) {
              if (!products.length) continue;
              // Explicit search results already in cache take priority — inspo appended after
              const merged = [...(productCache[cat] ?? []), ...products];
              productCache[cat] = merged
                .filter((p, i, arr) =>
                  arr.findIndex(q => (p.id && q.id === p.id) || q.name === p.name) === i
                )
                .sort((a, b) => (b._score ?? b.score ?? 0) - (a._score ?? a.score ?? 0))
                .slice(0, 12);
            }
          }
          return { type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(result) };
        } catch (err) {
          agentLog.toolResult(block.name, Date.now() - _toolStart, false, err.message);
          console.error(`[agent] tool error (${block.name}):`, err.message);
          return { type: 'tool_result', tool_use_id: block.id, content: `Error: ${err.message}`, is_error: true };
        }
      })
    );

    messages.push({ role: 'assistant', content: response.content });

    // Auto-build outfits once ALL required categories are in the cache.
    // Firing early (before jeans/shoes/etc. are searched) is the main reason
    // outfits come back saying "only tops provided."
    const allWereSearches = toolUseBlocks.every(b =>
      b.name === 'search_products' || b.name === 'get_inspo_products'
    );
    const allCategoriesCached = requiredCategories.size === 0 ||
      [...requiredCategories].every(cat => (productCache[cat]?.length ?? 0) > 0);

    if (allWereSearches && hasSearchResults && !lastOutfits && allCategoriesCached) {
      try {
        const filteredCache = applyRequestKeywordFilter(productCache, requestKeywords);
        lastOutfits = await buildOutfits({
          scoredProducts:     filteredCache,
          styleDna:           userProfile.styleDna,
          wardrobeItems:      userProfile.wardrobeItems,
          budget:             parseBudget(message) ?? userProfile.wallet?.balance ?? null,
          occasion,
          itemCounts,
          userRequest:        message,
          subtypeRequirements,
        });
        await enrichProductImages(lastOutfits);
        // Tell the agent the ACTUAL products in the outfit so it writes an accurate reply.
        // Agent must describe what's really in the cards — not what it intended to find.
        const outfitSummary = lastOutfits[0]?.items
          .map(i => `${i.category}: "${i.product?.name ?? i.product_name}"`)
          .join(', ') ?? 'no items';
        toolResults.push({
          type: 'text',
          text: `Outfits assembled. The first outfit contains: ${outfitSummary}. The UI shows these product cards automatically — do NOT list or describe individual items. Write a 1–2 sentence intro that truthfully reflects what was found. If the products match what the user asked for, say so. If something unexpected ended up in the results, acknowledge it honestly.`,
        });
      } catch (err) {
        console.error('[agent] auto build_outfits failed:', err.message);
        toolResults.push({
          type: 'text',
          text: 'Outfit assembly failed — summarize the top product picks from the search results in plain text instead.',
        });
      }
    }

    messages.push({ role: 'user', content: toolResults });

    response = await client.messages.create({
      model:       LOOP_MODEL,
      max_tokens:  LOOP_TOKENS,
      system:      cachedSystem(buildSystemPrompt(userProfile, recentConversations, priorUserTurns, occasionResearch)),
      tools:       CACHED_TOOLS,
      tool_choice: { type: 'auto' },
      messages,
    });
    agentLog.agentTurn(turns, response.stop_reason, response.usage);
  }

  // Fallback: if we have search results but outfits never fired (e.g. Claude searched
  // in multiple turns and allCategoriesCached was never satisfied mid-loop), build now
  // with whatever is in productCache so the user always gets outfit cards.
  if (hasSearchResults && !lastOutfits && Object.keys(productCache).length > 0) {
    try {
      const filteredCache = applyRequestKeywordFilter(productCache, requestKeywords);
      lastOutfits = await buildOutfits({
        scoredProducts:     filteredCache,
        styleDna:           userProfile.styleDna,
        wardrobeItems:      userProfile.wardrobeItems,
        budget:             parseBudget(message) ?? userProfile.wallet?.balance ?? null,
        occasion,
        itemCounts,
        userRequest:        message,
        subtypeRequirements,
      });
      await enrichProductImages(lastOutfits);
    } catch (err) {
      console.error('[agent] fallback build_outfits failed:', err.message);
    }
  }

  // If loop hit MAX_TURNS while Claude was still mid-tool-call, close the pending
  // tool_use blocks and make one final text-only call so the user gets a real reply.
  if (response.stop_reason === 'tool_use') {
    const pending = response.content.filter(b => b.type === 'tool_use');
    messages.push({ role: 'assistant', content: response.content });
    messages.push({
      role: 'user',
      content: pending.map(b => ({
        type: 'tool_result',
        tool_use_id: b.id,
        content: 'Search limit reached — please respond with what you have so far.',
        is_error: true,
      })),
    });
    const recovery = await client.messages.create({
      model:      LOOP_MODEL,
      max_tokens: 512,
      system:     cachedSystem(buildSystemPrompt(userProfile, recentConversations, priorUserTurns, occasionResearch)),
      messages,
    });
    const rawRecovery = recovery.content.find(b => b.type === 'text')?.text
      ?? "I hit a snag sourcing everything in one shot — try breaking the request into smaller pieces.";
    const { reply: recoveryText, choices: recoveryChoices } = parseChoices(rawRecovery);
    agentLog.agentEnd(turns, !!lastOutfits);
    return { reply: recoveryText, history: messages, outfits: lastOutfits, choices: recoveryChoices };
  }

  const rawText   = response.content.find(b => b.type === 'text')?.text ?? '';
  const { reply: finalText, choices } = parseChoices(rawText);
  agentLog.agentEnd(turns, !!lastOutfits);
  return { reply: finalText, history: messages, outfits: lastOutfits, choices };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { message, conversationHistory = [], userId, recentConversations = [], excludeProductName = null } = req.body;
  if (!message || !userId) return res.status(400).json({ error: 'message and userId are required' });

  // Race the agent against a 280s timeout — always returns JSON, never lets Vercel kill it silently
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('The stylist took too long to respond. Please try again.')), 280_000)
  );

  try {
    const result = await Promise.race([runAgent(message, conversationHistory, userId, recentConversations, excludeProductName), timeout]);
    return res.status(200).json(result);
  } catch (err) {
    console.error('[agent] error:', err);
    return res.status(500).json({ error: err.message ?? 'Internal server error' });
  }
}

// ── Named exports ─────────────────────────────────────────────────
// Pure utility functions — canonical source is lib/agent-utils.js.
// Re-exported here so external callers that already import from agent.js still work.
export { parseBudget, hexToBucket, parseRequestSlots, researchOccasion, buildShoppingBoard, SLOT_DEFS } from '../lib/agent-utils.js';
