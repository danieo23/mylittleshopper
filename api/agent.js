import Anthropic from '@anthropic-ai/sdk';
import { getUserProfile }       from '../tools/get_user_profile.js';
import { searchProducts }       from '../tools/search_products.js';
import { scoreProductMatch }    from '../tools/score_product_match.js';
import { buildOutfits }         from '../tools/build_outfits.js';
import { checkOutfitMultiplier } from '../tools/check_outfit_multiplier.js';
import { updateStyleDna }       from '../tools/update_style_dna.js';
import { createOrder }          from '../tools/create_order.js';
import { analyzeImageStyle }    from '../tools/analyze_image_style.js';
import { synthesizeStyleDna }   from '../tools/synthesize_style_dna.js';
import { getInspoProducts }     from '../tools/get_inspo_products.js';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 60_000 });

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
function buildSystemPrompt(userProfile, recentConversations = []) {
  const { styleDna, confidenceLevel, imageCount, wallet,
          favoriteStores, sizes, styleTags, pinterestBoardUrls, gender, ageRange } = userProfile;

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
- Sizes: ${sizeLine}
${agePrior}
${!dnaActive ? '\n⚠ Style DNA has not been synthesized yet. Use age-group baseline + style tags + aspiration gap as your primary signal until wardrobe/Pinterest analysis runs.' : ''}

${recentConversations.length ? `━━━ RECENT SESSIONS ━━━

The user's last ${recentConversations.length} shopping session${recentConversations.length > 1 ? 's' : ''} (for continuity — do not re-ask about these):
${recentConversations.map((c, i) => `  ${i + 1}. "${c.title}" — ${formatRelativeDate(c.updated_at)}`).join('\n')}

Use this to: reference past context naturally ("last time you were looking for Italy fits…"), avoid recommending the same things, and notice evolving style patterns. Do NOT start every message by recapping the history.

` : ''}━━━ CLARIFYING QUESTIONS — read profile confidence before deciding ━━━

Before searching, check the user's message against these 4 items:
  1. Item types + count  — "2 tops", "a dress and sandals", "blue jeans and a flannel"
  2. Occasion / use case — "beach trip", "dinners out", "California trip" all count
  3. Budget              — stated amount, OR infer from wallet $${wallet?.balance?.toFixed(0) ?? '0'}
  4. Vibe / direction    — "similar to my board", "something edgy", a trip theme

CONFIDENCE IS ${confidenceLevel.toUpperCase()} — adjust accordingly:

If confidence is HIGH:
  • All 4 present → search immediately.
  • Items + occasion present, vibe missing → infer from DNA and search.

If confidence is LOW or MEDIUM:
  • Items + occasion + budget present → ask ONE short question about vibe/inspiration before searching. Example: "Got it — any specific vibe you're going for, or should I go off your Pinterest board energy?"
  • Items missing → ask what they need.
  • Occasion missing → ask when/where.
  • Never ask about budget, sizes, stores, or fit — those come from the profile.

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
  Style:   "${dna.primary_style_category ?? (styleTagsForQuery ?? 'minimal')}"

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
  e.g. "${genderPrefix} relaxed ${styleTags?.slice(0,2).map(t => t.toLowerCase()).join(' ') ?? 'minimal'} trousers casual"
`}
Cross-reference with wardrobe before building outfits — don't suggest items they likely already own based on their existing style.
Prioritize aspiration gap items — these are things they want but don't have yet.

━━━ BOARD / INSPO REFERENCES — read this carefully before acting ━━━

There are TWO completely different things a user can mean when they mention their board or inspo.
Read the exact phrasing to decide which path to take. Getting this wrong is the #1 source of bad results.

─── PATH 1: STYLE GUIDANCE (most common) ───
Trigger phrases: "take inspiration from my board/profile", "inspired by my board", "in the style of my inspo",
  "using my board as reference", "based on my Pinterest", "with my aesthetic", "my vibe"

What this means: Use the board's colors, aesthetic, and style as context for search queries.
DO NOT call get_inspo_products. Instead, pull the style signals already embedded in this system prompt
(DNA, style tags, aspiration gap, primary colors) and bake them into style-aware search_products queries.

→ Search for the items the user explicitly asked for, with the board's aesthetic woven into the query.
Example: user says "take inspo from my board and find me button-down shirts for Italy"
  Correct: search_products("men's relaxed linen vintage button-down shirt coastal euro casual")
  WRONG:   call get_inspo_products — this returns cached board products (likely hoodies/jeans), not button-downs

─── PATH 2: PRODUCT RETRIEVAL (explicit) ───
Trigger phrases: "like my board", "similar to what's on my board", "from my Pinterest", "shop my board",
  "find me stuff like what I saved/pinned", "show me things like my inspo pictures"

What this means: The user wants actual products visually matched to their saved images.
→ Call get_inspo_products. These are Google Lens-matched products from their pins — highly accurate for this.
→ If the user also named specific items (e.g. "like my board but also find sneakers"), ALSO call search_products for those specific categories in the same turn.
→ If get_inspo_products returns has_results: false, tell the user briefly then fall back to search_products.

─── THE KEY RULE ───
"Inspiration/inspired by" = style guidance → search_products with DNA-aware queries
"Like/similar to/from my board" = product retrieval → get_inspo_products

When in doubt, default to PATH 1. A bad inspo retrieval returns wrong products. A style-guided search always finds the right item type.

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
Bad use: budget questions, item count, anything needing a typed answer — no [CHOICES] for those.`;
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
      const results = await searchProducts({ ...toolInput, query });
      if (!results.length) return [];
      const scored = results.map(p => ({ ...p, ...scoreProductMatch(p, userProfile.styleDna, occasion) }));
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

// ── Main handler (Vercel serverless function) ──────────────────────
export const config = { maxDuration: 300 };

async function runAgent(message, conversationHistory, userId, recentConversations = [], excludeProductName = null) {
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

  // Build text corpus from USER messages only — assistant text contains product names
  // that would pollute category detection and item counts.
  const userText = [message, ...conversationHistory
    .filter(m => m.role === 'user')
    .map(m => typeof m.content === 'string' ? m.content :
      (m.content ?? []).filter(b => b.type === 'text').map(b => b.text).join(' ')
    )
  ].join(' ').toLowerCase();

  // Parse which product categories the user explicitly asked for.
  // buildOutfits is only triggered once ALL required categories are in the cache —
  // this prevents assembling outfits before the jeans/shoes/etc. search completes.
  const requiredCategories = new Set();
  if (/\btop(s)?\b|\bshirt(s)?\b|\bblouse(s)?\b|\btee(s)?\b|\btank(s)?\b/.test(userText)) requiredCategories.add('tops');
  if (/\bjean(s)?\b|\bbottom(s)?\b|\bpant(s)?\b|\btrousers?\b|\bskirt(s)?\b|\bcargo\b/.test(userText)) requiredCategories.add('bottoms');
  if (/\bshoe(s)?\b|\bsneaker(s)?\b|\bboot(s)?\b|\bsandal(s)?\b|\bheel(s)?\b/.test(userText)) requiredCategories.add('shoes');
  if (/\bflannel(s)?\b|\bjacket(s)?\b|\bcoat(s)?\b|\bouterwear\b|\bblazer(s)?\b|\bcardigan(s)?\b|\bhoodie(s)?\b/.test(userText)) requiredCategories.add('outerwear');
  if (/\bdress(es)?\b/.test(userText)) requiredCategories.add('dress');
  if (/\baccessor|\bbag(s)?\b|\bhat(s)?\b|\bscarf|\bjewelr/.test(userText)) requiredCategories.add('accessories');

  // Build a rich occasion string from all relevant context keywords — used for
  // both buildOutfits naming AND season/occasion scoring in scoreProductMatch.
  const occasionPatterns = [
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
  const occasionWords = new Set();
  for (const [re, label] of occasionPatterns) {
    if (re.test(userText)) label.split(' ').forEach(w => occasionWords.add(w));
  }
  const occasion = occasionWords.size ? [...occasionWords].join(' ') : null;

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
    system:      buildSystemPrompt(userProfile, recentConversations),
    tools:       TOOLS,
    tool_choice: { type: 'auto' },
    messages,
  });

  // Agentic loop — run all tool calls per turn in parallel
  while (turns++ < MAX_TURNS && response.stop_reason === 'tool_use') {
    const toolUseBlocks = response.content.filter(b => b.type === 'tool_use');
    if (!toolUseBlocks.length) break;

    const toolResults = await Promise.all(
      toolUseBlocks.map(async (block) => {
        try {
          const result = await executeTool(block.name, block.input, userId, userProfile, excludeProductName, occasion);
          if (block.name === 'search_products' && Array.isArray(result) && result.length > 0) {
            hasSearchResults = true;
            const cat = block.input.category;
            // Strip products the user has explicitly disliked — exact name match (normalized).
            const dislikedNames = (userProfile.styleDna?.explicit_dislikes?.product_names ?? [])
              .map(n => n.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 50));
            const dedisliked = result.filter(p => {
              const key = (p.name ?? '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 50);
              return !dislikedNames.includes(key);
            });
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
          budget:             userProfile.wallet?.balance ?? 500,
          occasion,
          itemCounts,
          userRequest:        message,
          subtypeRequirements,
        });
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
      system:      buildSystemPrompt(userProfile, recentConversations),
      tools:       TOOLS,
      tool_choice: { type: 'auto' },
      messages,
    });
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
        budget:             userProfile.wallet?.balance ?? 500,
        occasion,
        itemCounts,
        userRequest:        message,
        subtypeRequirements,
      });
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
      system:     buildSystemPrompt(userProfile, recentConversations),
      messages,
    });
    const rawRecovery = recovery.content.find(b => b.type === 'text')?.text
      ?? "I hit a snag sourcing everything in one shot — try breaking the request into smaller pieces.";
    const { reply: recoveryText, choices: recoveryChoices } = parseChoices(rawRecovery);
    return { reply: recoveryText, history: messages, outfits: lastOutfits, choices: recoveryChoices };
  }

  const rawText   = response.content.find(b => b.type === 'text')?.text ?? '';
  const { reply: finalText, choices } = parseChoices(rawText);
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
