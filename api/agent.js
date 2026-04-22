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

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 30_000 });

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
    name: 'build_outfits',
    description: 'Assemble 3 complete outfit combinations from the search results. Pass all searched categories together.',
    input_schema: {
      type: 'object',
      properties: {
        products_by_category: {
          type: 'object',
          description: 'Object keyed by category (tops/bottoms/shoes/etc), value is the array returned by search_products for that category',
        },
        budget:   { type: 'number' },
        occasion: { type: 'string' },
      },
      required: ['products_by_category', 'budget'],
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

// ── System prompt ──────────────────────────────────────────────────
function buildSystemPrompt(userProfile) {
  const { styleDna, confidenceLevel, imageCount, wallet,
          favoriteStores, sizes, styleTags, pinterestBoardUrls } = userProfile;

  const dna = styleDna ?? {};

  const sizeLine = sizes
    ? Object.entries(sizes).filter(([,v]) => v).map(([k, v]) => `${k}: ${v}`).join(', ')
    : 'not set — do not ask, tell the user to add them in Style Vault';

  const profileComplete = imageCount > 0;
  const dnaActive = !!(dna.primary_style_category || dna.dominant_fit || dna.primary_colors?.length);

  return `You are the mylilshopper AI — a personal shopping agent. Your job is to find exactly the right clothes for this specific person by deeply understanding their style profile and asking the right questions before searching.

USER PROFILE (do not call any tool to fetch this — it is complete):
- Confidence: ${confidenceLevel} (${imageCount} wardrobe/inspiration images analyzed)
- Wallet: $${wallet?.balance?.toFixed(2) ?? '0.00'}
- Style tags: ${styleTags?.length ? styleTags.join(', ') : 'none set'}
- Pinterest boards analyzed: ${pinterestBoardUrls?.length ? pinterestBoardUrls.join(', ') : 'none'}
- Primary style: ${dna.primary_style_category ?? 'not yet determined'}
- Secondary styles: ${dna.secondary_categories?.join(', ') || 'none'}
- Dominant fit: ${dna.dominant_fit ?? 'not yet determined'}
- Primary colors: ${dna.primary_colors?.join(', ') || 'not determined'}
- Secondary colors: ${dna.secondary_colors?.join(', ') || 'none'}
- Avoided colors: ${dna.avoided_colors?.join(', ') || 'none identified'}
- Formality range: ${dna.formality_range_min ?? '?'}–${dna.formality_range_max ?? '?'}/10
- Brand affinities: ${dna.brand_affinities?.join(', ') || 'none'}
- Brand rejections: ${dna.brand_rejections?.join(', ') || 'none'}
- Aspiration gap (from Pinterest/inspo): ${dna.aspiration_gap?.join(', ') || 'none identified'}
- Favorite stores: ${favoriteStores?.length ? favoriteStores.join(', ') : 'none set'}
- Sizes: ${sizeLine}
${!dnaActive ? '\n⚠ Style DNA has not been synthesized yet — wardrobe/Pinterest analysis may still be processing. Search broadly and lean on style tags and aspiration gap for guidance.' : ''}

━━━ CLARIFYING QUESTIONS — always ask before searching ━━━

Before running any search, you MUST understand exactly what to search for.
A vibe and a budget is NOT enough. You need to know the exact items.

ALWAYS ASK FIRST when you don't have ALL of these:
  1. Exact item types (dress? tops? pants? shoes? how many of each?)
  2. Occasions/use cases (beach days? dinners out? daytime exploring? all of the above?)
  3. Complete looks vs. fill-in pieces (building full outfits, or adding to what they have?)

Examples of requests that REQUIRE clarifying questions before searching:
  - "Italy trip, coastal vibes, $200-300" → missing: what items, how many, what occasions
  - "wardrobe refresh" → missing: everything
  - "something for a wedding" → missing: what items, dress code details
  - "I want new summer looks" → missing: what items, how many

Example of a request that does NOT need questions:
  - "I want a linen dress, 2 tops, and sandals for beach days, budget $250" → has items + count + occasion → search immediately

How to ask: combine everything into one short conversational message.
"Love the Italy inspo! To search right — what items are you looking to get: like full outfits (tops + bottoms + shoes), or specific pieces? And will you be dressing for beach days, dinners, daytime exploring, or a mix? That way I can pull exactly what you need."

Never ask more than one message worth of questions. After their answer, search immediately.

NEVER ask about:
- Their style or vibe — you have their DNA and Pinterest
- What stores they like — in the profile
- Their sizes — in the profile
- Budget — infer from context or style tier

━━━ PROFILE-DRIVEN SEARCH — use the DNA in every query ━━━

Every search query must embed the user's actual style attributes. Never search generically.
${dnaActive ? `
Build queries like this (combine ALL relevant attributes):
  Fit: "${dna.dominant_fit ?? 'relaxed'}"
  Colors: "${dna.primary_colors?.slice(0,2).join(', ') ?? 'neutral'}"
  Style: "${dna.primary_style_category ?? (styleTags?.[0] ?? 'minimal')}"
  → Example query: "${dna.dominant_fit ?? 'relaxed'} ${dna.primary_colors?.[0] ?? 'neutral'} ${dna.primary_style_category ?? 'minimal'} linen midi dress"
` : `
Profile is still building — use style tags (${styleTags?.join(', ') || 'none'}) and aspiration gap to guide queries.
`}
Cross-reference with wardrobe before building outfits — don't suggest items they likely already own based on their existing style.
Prioritize aspiration gap items — these are things they want but don't have yet.

━━━ SEARCH RULES ━━━

- ONLY search for item categories the user explicitly asked for. If they asked for tops and bottoms, do not add shoes or accessories unless they asked.
- Search ALL categories at once in a SINGLE turn (parallel execution).
- Search broadly — Google Shopping surfaces all stores naturally. Do not restrict to favorite stores.
- Use exact Style DNA attributes in every query.
- No category limit — if the user asked for 5 categories, search all 5.

PIPELINE (follow exactly, no deviations):
  STEP 1 — Call search_products for every requested category, ALL IN THE SAME TURN.
  STEP 2 — Call build_outfits with ALL results. No text between steps.
  STEP 3 — Short reply AFTER build_outfits returns. The UI shows products visually.

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
- If search returns an error, tell the user exactly what failed.`;
}

// ── Tool execution ─────────────────────────────────────────────────
async function executeTool(toolName, toolInput, userId, userProfile) {
  switch (toolName) {
    // search_products: fetch, score, return best matches.
    // If DNA isn't strong enough to push anything above the 60-pt threshold,
    // fall back to the top-scored results rather than returning nothing.
    case 'search_products': {
      const results = await searchProducts(toolInput);
      if (!results.length) return [];
      const scored = results.map(p => ({ ...p, ...scoreProductMatch(p, userProfile.styleDna) }));
      const passed = scored.filter(p => p.passes !== false);
      return (passed.length >= 3 ? passed : scored)
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
        .slice(0, 10);
    }

    case 'build_outfits':
      return buildOutfits({
        scoredProducts: toolInput.products_by_category ?? toolInput.scored_products ?? {},
        styleDna:       userProfile.styleDna,
        wardrobeItems:  userProfile.wardrobeItems,
        budget:         toolInput.budget,
        occasion:       toolInput.occasion,
      });

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

// ── Main handler (Vercel serverless function) ──────────────────────
export const config = { maxDuration: 120 };

async function runAgent(message, conversationHistory, userId) {
  // Fetch profile once — reused for system prompt and cached for tool calls
  const userProfile = await getUserProfile(userId);

  const messages = [
    ...conversationHistory,
    { role: 'user', content: message },
  ];

  const LOOP_MODEL  = 'claude-haiku-4-5-20251001';
  const LOOP_TOKENS = 4096;

  let lastOutfits      = null;
  let hasSearchResults = false;
  const MAX_TURNS      = 4;
  let turns            = 0;

  // Full product objects keyed by category — Claude only sees names/prices in
  // its context window; we keep the authoritative data here so build_outfits
  // always has image_url, product_url, etc. regardless of what Claude passes back.
  const productCache = {};

  const toolChoice = () =>
    hasSearchResults && !lastOutfits ? { type: 'any' } : { type: 'auto' };

  let response = await client.messages.create({
    model:        LOOP_MODEL,
    max_tokens:   LOOP_TOKENS,
    system:       buildSystemPrompt(userProfile),
    tools:        TOOLS,
    tool_choice:  toolChoice(),
    messages,
  });

  // Agentic loop — run all tool calls per turn in parallel
  while (turns++ < MAX_TURNS && response.stop_reason === 'tool_use') {
    const toolUseBlocks = response.content.filter(b => b.type === 'tool_use');
    if (!toolUseBlocks.length) break;

    const toolResults = await Promise.all(
      toolUseBlocks.map(async (block) => {
        try {
          let result;

          if (block.name === 'search_products') {
            result = await executeTool(block.name, block.input, userId, userProfile);
            if (Array.isArray(result) && result.length > 0) {
              hasSearchResults = true;
              productCache[block.input.category] = result; // cache full objects
            }

          } else if (block.name === 'build_outfits') {
            // Merge Claude's category list with our cached full product objects
            // so image_url/product_url survive even if Claude stripped them.
            const categories = Object.keys(block.input.products_by_category ?? {});
            const enriched = {};
            for (const cat of categories) {
              enriched[cat] = productCache[cat] ?? block.input.products_by_category[cat] ?? [];
            }
            result = await buildOutfits({
              scoredProducts: enriched,
              styleDna:       userProfile.styleDna,
              wardrobeItems:  userProfile.wardrobeItems,
              budget:         block.input.budget,
              occasion:       block.input.occasion,
            });
            lastOutfits = result;

          } else {
            result = await executeTool(block.name, block.input, userId, userProfile);
          }

          return { type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(result) };
        } catch (err) {
          console.error(`[agent] tool error (${block.name}):`, err.message);
          return { type: 'tool_result', tool_use_id: block.id, content: `Error: ${err.message}`, is_error: true };
        }
      })
    );

    messages.push({ role: 'assistant', content: response.content });
    messages.push({ role: 'user',      content: toolResults });

    response = await client.messages.create({
      model:       LOOP_MODEL,
      max_tokens:  LOOP_TOKENS,
      system:      buildSystemPrompt(userProfile),
      tools:       TOOLS,
      tool_choice: toolChoice(),
      messages,
    });
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
      system:     buildSystemPrompt(userProfile),
      messages,
    });
    const recoveryText = recovery.content.find(b => b.type === 'text')?.text
      ?? "I hit a snag sourcing everything in one shot — try breaking the request into smaller pieces.";
    return { reply: recoveryText, history: messages, outfits: lastOutfits };
  }

  const finalText = response.content.find(b => b.type === 'text')?.text ?? '';
  return { reply: finalText, history: messages, outfits: lastOutfits };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { message, conversationHistory = [], userId } = req.body;
  if (!message || !userId) return res.status(400).json({ error: 'message and userId are required' });

  // Race the agent against a 110s timeout — always returns JSON, never lets Vercel kill it silently
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('The stylist took too long to respond. Please try again.')), 110_000)
  );

  try {
    const result = await Promise.race([runAgent(message, conversationHistory, userId), timeout]);
    return res.status(200).json(result);
  } catch (err) {
    console.error('[agent] error:', err);
    return res.status(500).json({ error: err.message ?? 'Internal server error' });
  }
}
