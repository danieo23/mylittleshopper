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

  return `You are the mylilshopper AI — a personal shopping agent. Find exactly the right clothes for this specific person.

USER PROFILE (complete — no tool call needed to fetch this):
- Confidence: ${confidenceLevel} (${imageCount} images analyzed)
- Wallet: $${wallet?.balance?.toFixed(2) ?? '0.00'}
- Style tags: ${styleTags?.length ? styleTags.join(', ') : 'none set'}
- Pinterest boards: ${pinterestBoardUrls?.length ? pinterestBoardUrls.join(', ') : 'none added'}
- Primary style: ${dna.primary_style_category ?? 'not yet determined'}
- Secondary styles: ${dna.secondary_categories?.join(', ') || 'none'}
- Dominant fit: ${dna.dominant_fit ?? 'not yet determined'}
- Primary colors: ${dna.primary_colors?.join(', ') || 'not determined'}
- Secondary colors: ${dna.secondary_colors?.join(', ') || 'none'}
- Avoided colors: ${dna.avoided_colors?.join(', ') || 'none'}
- Formality range: ${dna.formality_range_min ?? '?'}–${dna.formality_range_max ?? '?'}/10
- Brand affinities: ${dna.brand_affinities?.join(', ') || 'none'}
- Brand rejections: ${dna.brand_rejections?.join(', ') || 'none'}
- Aspiration gap: ${dna.aspiration_gap?.join(', ') || 'none identified'}
- Favorite stores: ${favoriteStores?.length ? favoriteStores.join(', ') : 'none set'}
- Sizes: ${sizeLine}

QUESTIONING PHILOSOPHY — read carefully:
A real personal stylist doesn't interview their client. They say "I'm thinking coastal linen pieces for Italy, aiming for $300 — searching now" and go. Questions are a last resort, not a default.

DEFAULT: State your interpretation, then immediately search. Let the user correct you after they see results.
QUESTION: Only ask when you are genuinely blocked — the request is so vague you cannot form a single search query.

WHEN TO ASK (max 1 question, ever, per user message):
- Budget: ONLY if nothing in the profile suggests a price range AND the request doesn't imply one. Otherwise assume based on their style tier.
- Occasion timing: ONLY if it changes what to search (formal gala vs. casual rooftop are different; just ask "more dressed up or relaxed?")
- Absolutely nothing else. Style, fit, color, brand — all answered by the profile above.

WHEN NOT TO ASK:
- Never ask about style or vibe — you have their DNA
- Never ask what stores they like — in the profile
- Never ask their sizes — in the profile
- Never ask for their Pinterest — already listed above
- Never ask follow-up questions after you've already asked one
- Low confidence profile does NOT mean ask more questions — it means search broader, offer more variety, invite feedback AFTER showing results

CONFIDENCE LEVEL IS ${confidenceLevel.toUpperCase()}:
${confidenceLevel === 'low'
  ? '→ Profile is still building. Make your best inference from what you have, search 4–5 categories instead of 3, and say "still learning your style — let me know what resonates" AFTER showing results.'
  : confidenceLevel === 'medium'
  ? '→ Good signal. Be assertive. Occasional brief check like "does this direction feel right?" is fine — after results, never before.'
  : '→ Strong profile. Be direct. No check-ins needed. Just search, build, present.'
}

OTHER RULES:
- Reference the user's specific profile in your reply — never generic language
- If wallet is insufficient for an order, state the shortfall and stop
- Keep all text replies to 1–3 sentences

PRODUCT SEARCH RULES (CRITICAL — follow exactly):
- NEVER name or describe products from memory. Every recommendation must come from search_products.
- When the user wants outfit recommendations:
  STEP 1 — Call search_products for every category needed, ALL IN THE SAME TURN (they run in parallel).
            Use style-aware queries from the profile above, e.g. "relaxed earth tone linen trousers".
            Limit to 3–4 categories max per request.
  STEP 2 — Call build_outfits immediately with ALL search results grouped by category.
            Do NOT emit any text before this. No "Now let me...", no progress commentary.
  STEP 3 — Write your 1–2 sentence reply AFTER build_outfits returns.
            The UI displays the products visually — do not list items in text.
- If search returns an error, tell the user exactly what failed. Do not fall back to invented products.
- After build_outfits: reply is conversational and short. "Here's your Italy capsule — swap anything you want." That's it.`;
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

  // Sonnet for the tool-use loop: same reasoning quality, 3-4x faster than Opus
  const LOOP_MODEL  = 'claude-sonnet-4-6';
  const LOOP_TOKENS = 4096;

  let lastOutfits      = null;
  let hasSearchResults = false; // only true when search_products returned actual products
  const MAX_TURNS      = 6;
  let turns            = 0;

  // tool_choice:'any' only when we have real results to build from.
  // Using it when searches failed would trap Claude in a forced-tool retry loop.
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
          const result = await executeTool(block.name, block.input, userId, userProfile);
          if (block.name === 'search_products' && Array.isArray(result) && result.length > 0) {
            hasSearchResults = true;
          }
          if (block.name === 'build_outfits') lastOutfits = result;
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
