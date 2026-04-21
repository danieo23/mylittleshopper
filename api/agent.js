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

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Tool definitions (passed to Claude) ───────────────────────────
const TOOLS = [
  {
    name: 'get_user_profile',
    description: 'Fetch the user\'s complete profile: Style DNA, wardrobe, aspiration items, order history, wallet balance. Call this first before any recommendation.',
    input_schema: {
      type: 'object',
      properties: { user_id: { type: 'string' } },
      required: ['user_id'],
    },
  },
  {
    name: 'search_products',
    description: 'Search for products matching style-aware search terms. Use specific descriptive queries derived from the Style DNA.',
    input_schema: {
      type: 'object',
      properties: {
        query:     { type: 'string', description: 'Style-aware search string e.g. "relaxed tapered earth tone trousers"' },
        category:  { type: 'string', enum: ['tops', 'bottoms', 'shoes', 'outerwear', 'accessories', 'dress'] },
        maxPrice:  { type: 'number' },
        stores:    { type: 'array', items: { type: 'string' }, description: 'Preferred stores to filter by' },
      },
      required: ['query', 'category'],
    },
  },
  {
    name: 'score_products',
    description: 'Score a list of products against the user\'s Style DNA. Returns each product with a score 0-100. Only products scoring 60+ should go to the outfit builder.',
    input_schema: {
      type: 'object',
      properties: {
        products: { type: 'array', description: 'Products returned from search_products' },
        style_dna: { type: 'object', description: 'User\'s Style DNA object from get_user_profile' },
      },
      required: ['products', 'style_dna'],
    },
  },
  {
    name: 'build_outfits',
    description: 'Assemble 3-5 complete outfit combinations from scored products. Returns structured outfit cards with style notes personalized to the user.',
    input_schema: {
      type: 'object',
      properties: {
        scored_products: { type: 'object', description: 'Products grouped by category, each with a _score field' },
        budget:          { type: 'number' },
        occasion:        { type: 'string' },
      },
      required: ['scored_products', 'budget'],
    },
  },
  {
    name: 'create_order',
    description: 'Process a confirmed purchase. Checks wallet balance, creates order record, deducts from wallet.',
    input_schema: {
      type: 'object',
      properties: {
        items:         { type: 'array', description: 'Items to purchase with their product details' },
        total_price:   { type: 'number' },
        occasion:      { type: 'string' },
      },
      required: ['items', 'total_price'],
    },
  },
  {
    name: 'update_style_dna',
    description: 'Log a feedback signal (approval/rejection/swap) and update the Style DNA accordingly.',
    input_schema: {
      type: 'object',
      properties: {
        signal_type:      { type: 'string', enum: ['approval', 'rejection', 'swap', 'post_delivery_positive', 'post_delivery_negative'] },
        item_attributes:  { type: 'object', description: 'Style attributes of the item that was approved/rejected' },
        swap_target:      { type: 'object', description: 'For swap signals: what they chose instead' },
        inferred_reason:  { type: 'string' },
      },
      required: ['signal_type', 'item_attributes'],
    },
  },
];

// ── System prompt ──────────────────────────────────────────────────
function buildSystemPrompt(userProfile) {
  const { styleDna, confidenceLevel, imageCount, wallet } = userProfile;

  return `You are the mylilshopper AI — a personal shopping agent. Your one job: understand this person's style deeply and find them exactly the right clothes.

CURRENT USER CONTEXT:
- Profile confidence: ${confidenceLevel} (${imageCount} images analyzed)
- Wallet balance: $${wallet?.balance?.toFixed(2) ?? '0.00'}
- Primary style: ${styleDna?.primary_style_category ?? 'not yet determined'}
- Dominant fit: ${styleDna?.dominant_fit ?? 'not yet determined'}
- Top colors: ${styleDna?.primary_colors?.join(', ') || 'not yet determined'}
- Aspiration gap: ${styleDna?.aspiration_gap?.join(', ') || 'none identified'}
- Formality range: ${styleDna ? `${styleDna.formality_range_min}–${styleDna.formality_range_max}/10` : 'not determined'}

OPERATING RULES:
1. Always call get_user_profile first — never skip this
2. Confidence ${confidenceLevel === 'low' ? 'is LOW — ask up to 2 clarifying questions, offer more options, be collaborative' : confidenceLevel === 'medium' ? 'is MEDIUM — mostly assertive, check in occasionally' : 'is HIGH — be direct and assertive, minimal questions'}
3. Never ask more than one question at a time
4. Never ask something already known from the Style DNA
5. Always reference the user's specific profile when explaining a recommendation — never use generic language
6. When you make an inference, state it briefly so they can correct you
7. Short responses after the user makes a choice — "Love it, I'm on it" not paragraphs
8. If wallet is insufficient for an order, state the shortfall clearly and stop`;
}

// ── Tool execution ─────────────────────────────────────────────────
async function executeTool(toolName, toolInput, userId, userProfile) {
  switch (toolName) {
    case 'get_user_profile':
      return getUserProfile(userId);

    case 'search_products':
      return searchProducts(toolInput);

    case 'score_products': {
      const scored = toolInput.products.map(p => ({
        ...p,
        ...scoreProductMatch(p, toolInput.style_dna),
      }));
      return scored;
    }

    case 'build_outfits':
      return buildOutfits({
        scoredProducts: toolInput.scored_products,
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
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { message, conversationHistory = [], userId } = req.body;
  if (!message || !userId) return res.status(400).json({ error: 'message and userId are required' });

  try {
  // Load user profile upfront so the system prompt has context
  const userProfile = await getUserProfile(userId);

  const messages = [
    ...conversationHistory,
    { role: 'user', content: message },
  ];

  let response = await client.messages.create({
    model:      'claude-opus-4-7',
    max_tokens: 4096,
    system:     buildSystemPrompt(userProfile),
    tools:      TOOLS,
    messages,
  });

  // Agentic loop — keep executing tool calls until Claude produces a final text response
  while (response.stop_reason === 'tool_use') {
    const toolUseBlocks = response.content.filter(b => b.type === 'tool_use');
    const toolResults   = [];

    for (const block of toolUseBlocks) {
      try {
        const result = await executeTool(block.name, block.input, userId, userProfile);
        toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(result) });
      } catch (err) {
        toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: `Error: ${err.message}`, is_error: true });
      }
    }

    messages.push({ role: 'assistant', content: response.content });
    messages.push({ role: 'user',      content: toolResults });

    response = await client.messages.create({
      model:      'claude-opus-4-7',
      max_tokens: 4096,
      system:     buildSystemPrompt(userProfile),
      tools:      TOOLS,
      messages,
    });
  }

  const finalText = response.content.find(b => b.type === 'text')?.text ?? '';

  return res.status(200).json({
    reply:   finalText,
    history: messages,
  });
  } catch (err) {
    console.error('[agent] fatal error:', err);
    return res.status(500).json({ error: err.message ?? 'Internal server error' });
  }
}
