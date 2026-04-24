import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * Uses Opus to parse user feedback into a concrete RefinementPlan.
 *
 * The plan captures:
 *   - interpretation:    One sentence of what the user actually wants
 *   - queryAdditions:    Style/descriptor terms to ADD to all search queries
 *   - queryRemovals:     Terms to REMOVE from queries (they're pulling the wrong aesthetic)
 *   - negativeKeywords:  Product title words that must NOT appear in results
 *   - fitOverride:       Override the DNA dominant fit for this search
 *   - colorOverride:     Shift the primary color query anchor to this word
 *   - avoidColors:       Color words to filter out of returned product titles
 *   - styleShift:        Directional style note (e.g. "more vintage", "less techwear")
 *   - priceDirection:    "lower" | "higher" | null
 *   - confidence:        How clearly Opus understood the intent
 */
export async function comprehendFeedback(feedback, dna, priorResultsText, searchContext) {
  const systemPrompt = `You are the style intelligence engine behind a personal shopping agent.
Your only job: convert user feedback about clothing search results into precise, actionable search parameter adjustments.

Think like a stylist who just heard a client say "these aren't right." You immediately know WHY they're wrong (too aggressive, wrong color story, wrong silhouette) and exactly what to change.

Return ONLY a valid JSON object — no explanation, no markdown — with exactly this structure:
{
  "interpretation": "One sentence: what the user actually wants, in concrete style/garment terms",
  "queryAdditions": ["terms to ADD to all search queries"],
  "queryRemovals": ["terms to REMOVE or avoid in queries — they're returning the wrong results"],
  "negativeKeywords": ["words that must NOT appear in product titles"],
  "fitOverride": "relaxed|slim|oversized|tailored|fitted|null",
  "colorOverride": "single color word to emphasize in queries, or null",
  "avoidColors": ["color words to filter out of product titles"],
  "styleShift": "directional style note or null",
  "priceDirection": "lower|higher|null",
  "confidence": "high|medium|low"
}

Examples of correct interpretation:
- "too dark" → avoidColors: ["black","charcoal","dark"], colorOverride: "white" or "navy", queryRemovals: ["black","dark"]
- "nothing with logos or graphics" → negativeKeywords: ["logo","graphic","print","branded","text"]
- "more vintage, less techwear" → queryAdditions: ["vintage","worn","washed"], queryRemovals: ["techwear","asymmetric","splatter"], negativeKeywords: ["asymmetric","drip","ink","splatter","tactical"]
- "more relaxed fit" → fitOverride: "relaxed", queryAdditions: ["loose","relaxed","baggy"]
- "cheaper options" → priceDirection: "lower"
- "more like what I already own" → queryAdditions from the DNA's dominant style signals

Be surgical. Change only what is wrong. Don't undo what is right.`;

  const userMsg = `Style DNA:
  Primary style: ${dna?.primary_style_category ?? 'unknown'}
  Secondary: ${(dna?.secondary_categories ?? []).join(', ') || 'none'}
  Colors: ${(dna?.primary_colors ?? []).join(', ') || 'none'}
  Fit: ${dna?.dominant_fit ?? 'unknown'}
  Formality: ${dna?.formality_range_min ?? '?'}–${dna?.formality_range_max ?? '?'}

Search context: ${searchContext ?? 'summer items'}

Previous results shown to user:
${priorResultsText.slice(0, 1200)}

User feedback: "${feedback}"`;

  const response = await client.messages.create({
    model:      'claude-opus-4-7',
    max_tokens: 512,
    system:     systemPrompt,
    messages:   [{ role: 'user', content: userMsg }],
  });

  const text  = response.content[0].text.trim();
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Opus comprehension returned no JSON');

  const plan = JSON.parse(match[0]);
  console.log('[refine] Opus plan:', JSON.stringify(plan));
  return plan;
}

/**
 * Deterministically verify that the new results actually address the plan.
 * Checks that:
 *   - negativeKeywords are not present in more than 20% of results
 *   - avoidColors are not present in more than 20% of results
 *   - colorOverride appears in at least some results (when specified)
 *
 * Returns { satisfied, gaps } where gaps are human-readable remaining issues.
 */
export function verifyRefinement(plan, newProducts) {
  if (!newProducts?.length) return { satisfied: false, gaps: ['no results returned'] };

  const TOLERANCE = 0.2; // allow up to 20% slip-through
  const names     = newProducts.map(p => (p.name ?? '').toLowerCase());
  const gaps      = [];

  for (const kw of plan.negativeKeywords ?? []) {
    const count = names.filter(n => n.includes(kw.toLowerCase())).length;
    if (count / names.length > TOLERANCE) {
      gaps.push(`still seeing items with "${kw}"`);
    }
  }

  for (const color of plan.avoidColors ?? []) {
    const count = names.filter(n => n.includes(color.toLowerCase())).length;
    if (count / names.length > TOLERANCE) {
      gaps.push(`still seeing ${color} items`);
    }
  }

  if (plan.colorOverride) {
    const present = names.some(n => n.includes(plan.colorOverride.toLowerCase()));
    if (!present) {
      gaps.push(`results don't reflect the ${plan.colorOverride} shift yet`);
    }
  }

  return { satisfied: gaps.length === 0, gaps };
}

/**
 * Build a human-readable summary of what the plan changed.
 * Used in the agent's reply so the user knows exactly what was adjusted.
 */
export function describePlan(plan) {
  const parts = [];
  if (plan.colorOverride)             parts.push(`shifted palette toward ${plan.colorOverride}`);
  if (plan.avoidColors?.length)       parts.push(`filtering out ${plan.avoidColors.join('/')} items`);
  if (plan.fitOverride)               parts.push(`fit locked to ${plan.fitOverride}`);
  if (plan.queryAdditions?.length)    parts.push(`searching for ${plan.queryAdditions.slice(0,3).join(', ')}`);
  if (plan.negativeKeywords?.length)  parts.push(`blocking "${plan.negativeKeywords.slice(0,3).join('", "')}" from titles`);
  if (plan.styleShift)                parts.push(plan.styleShift);
  if (plan.priceDirection)            parts.push(`${plan.priceDirection} price range`);
  return parts.join(' · ') || 'adjusted search parameters';
}
