import { getClient }            from '../lib/anthropic.js';
import { agentLog }             from '../lib/agent-logger.js';
import { checkOutfitMultiplier } from './check_outfit_multiplier.js';

const client = getClient();

/**
 * Takes scored products grouped by category and assembles 3-5 complete outfit sets.
 * Uses Claude to reason about combinations and generate style notes.
 */
export async function buildOutfits({ scoredProducts, styleDna, wardrobeItems, budget, occasion, itemCounts = {}, userRequest = null, subtypeRequirements = {} }) {
  const productSummary = Object.entries(scoredProducts)
    .map(([cat, products]) =>
      `${cat.toUpperCase()}:\n` +
      products.map(p =>
        `  - ${p.name} | $${p.price} | score:${p._score} | style:${p.style_category ?? 'unknown'} | fit:${p.fit_type ?? 'unknown'}`
      ).join('\n')
    ).join('\n\n');

  const dnaContext = styleDna ? `
User Style DNA:
- Primary style: ${styleDna.primary_style_category ?? 'unknown'}
- Secondary styles: ${styleDna.secondary_categories?.join(', ') || 'none'}
- Dominant fit: ${styleDna.dominant_fit ?? 'unknown'}
- Primary colors: ${styleDna.primary_colors?.join(', ') || 'unknown'}
- Formality range: ${styleDna.formality_range_min}–${styleDna.formality_range_max}/10
- Aspiration gap: ${styleDna.aspiration_gap?.join(', ') || 'none identified'}
` : 'No Style DNA available — use general fashion principles.';

  const hasSpecificRequest = Object.keys(itemCounts).length > 0 || Object.keys(subtypeRequirements).length > 0;
  const outfitCount = hasSpecificRequest ? 1 : 3;

  const countHints = Object.entries(itemCounts)
    .filter(([, n]) => n > 1)
    .map(([cat, n]) => `  - ${cat}: include exactly ${n} items`)
    .join('\n');

  const subtypeHints = Object.entries(subtypeRequirements)
    .map(([cat, subtypes]) =>
      `  - ${cat}: MUST include one item for each of these specific types: ${subtypes.join(' AND ')}`
    )
    .join('\n');

  const prompt = `You are a personal stylist AI. Assemble ${outfitCount} complete outfit combination${outfitCount > 1 ? 's' : ''} from these available products for a ${occasion ?? 'general'} occasion. Budget: $${budget}.
${userRequest ? `\nUSER ASKED FOR: "${userRequest}"\nOnly use products that match what the user asked for. If they asked for button-down shirts, only use items that are shirts/button-downs in the tops slot — never substitute hoodies or sweaters. If they asked for cargo pants, only cargo pants go in the bottoms slot. Honor the explicit request above all else.\n` : ''}
${subtypeHints ? `\nSUBTYPE REQUIREMENTS — the outfit MUST contain one item of each listed type (non-negotiable):\n${subtypeHints}\nDo not pick two of the same subtype. If "cargo jeans AND baggy jeans" are required, one item must be cargo and a different item must be baggy.\n` : ''}

${dnaContext}

AVAILABLE PRODUCTS:
${productSummary}

Rules:
1. Build outfits from ONLY the categories provided. If tops + bottoms are available but no shoes, a top + bottom is a complete valid outfit — do NOT invent a third slot or repeat items to fill it. If shoes are in the product list, include them. Work strictly with what was searched.
2. Total price of each outfit must be within $${budget}
3. Each outfit should have a distinct color story — don't make three identical-palette looks
4. Items must be internally coherent in formality
5. At least one outfit should address the user's aspiration gap if one exists
6. NEVER use the same product_name twice within a single outfit. Every item slot must be a unique product.
7. STRICT ROTATION — Each product may appear in AT MOST ONE outfit. Outfit 1 gets products [A, D], Outfit 2 gets [B, E], Outfit 3 gets [C, F]. NEVER put the same product in 2 or more outfits when alternatives exist. This is the highest-priority rule for visual variety.${countHints ? `\nSpecific counts requested (all items go in the SINGLE outfit):\n${countHints}` : ''}

Name each outfit after a specific lifestyle moment, vibe, or location — NOT generic aesthetic labels.
Good names: "Afternoon in Venice Beach", "Coffee Run on Abbot Kinney", "Rooftop at Golden Hour", "Saturday at the Farmer's Market"
Bad names: "Minimalist Look", "Smart Casual", "Classic Style"

Return a JSON array of outfit objects. Each object:
{
  "outfit_name": "specific lifestyle/location name",
  "items": [
    { "category": "top|bottom|shoes|outerwear|dress|accessory", "product_name": "exact name from the list above" }
  ],
  "total_price": number,
  "style_note": "one sentence referencing the user's actual profile — personal, not generic",
  "occasion_fit": "brief note on why this works for the occasion"
}

Only return the JSON array. No other text.`;

  const _t0 = Date.now();
  const response = await client.messages.create({
    model:      'claude-sonnet-4-6',
    max_tokens: 2048,
    messages:   [{ role: 'user', content: prompt }],
  });
  agentLog.agentTurn('build_outfits', response.stop_reason, response.usage);
  agentLog.toolResult('build_outfits', Date.now() - _t0, true, `${response.usage?.output_tokens ?? '?'} tokens`);

  const text      = response.content[0].text.trim();
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('No outfit JSON returned from build_outfits');

  const outfits = JSON.parse(jsonMatch[0]);

  // Enrich with multiplier scores and full product details
  const allProducts = Object.values(scoredProducts).flat();

  // Fuzzy match: check both directions (search title may be longer than Claude's name)
  // and fall back to significant word overlap so minor paraphrasing doesn't drop items.
  function matchProduct(searchName, claudeName) {
    const a = searchName.toLowerCase().replace(/[^a-z0-9\s]/g, '');
    const b = claudeName.toLowerCase().replace(/[^a-z0-9\s]/g, '');
    if (a.includes(b.slice(0, 30)) || b.includes(a.slice(0, 30))) return true;
    const words = b.split(/\s+/).filter(w => w.length > 3);
    return words.length > 0 && words.filter(w => a.includes(w)).length >= Math.min(2, words.length);
  }

  // Brand monoculture guard: if one brand covers >50% of an outfit's items, ask Claude
  // to regenerate once with a hard constraint. Log warning if still violated after regen.
  function detectBrandDominance(outfit) {
    const counts = {};
    let total = 0;
    for (const item of outfit.items ?? []) {
      const prod  = allProducts.find(p => matchProduct(p.name, item.product_name));
      const brand = prod?.brand ?? null;
      if (brand) { counts[brand] = (counts[brand] ?? 0) + 1; total++; }
    }
    if (!total) return null;
    const [topBrand, topCount] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0] ?? [];
    return topCount / total > 0.5 ? topBrand : null;
  }

  const violations = outfits
    .map((o, i) => ({ idx: i, brand: detectBrandDominance(o) }))
    .filter(x => x.brand);

  if (violations.length > 0) {
    const brandConstraints = violations
      .map(v => `Outfit ${v.idx + 1}: max 1 item from "${v.brand}" — spread across multiple brands`)
      .join('\n');
    const regenPrompt = `${prompt}\n\nCRITICAL — brand diversity violations in previous response. Fix only these outfits:\n${brandConstraints}\nNo single brand may account for more than 50% of any outfit's items.`;
    try {
      const regenRes = await client.messages.create({
        model:      'claude-sonnet-4-6',
        max_tokens: 2048,
        messages:   [{ role: 'user', content: regenPrompt }],
      });
      const regenText  = regenRes.content[0].text.trim();
      const regenMatch = regenText.match(/\[[\s\S]*\]/);
      if (regenMatch) {
        const regenOutfits = JSON.parse(regenMatch[0]);
        for (const { idx } of violations) {
          if (regenOutfits[idx]) outfits[idx] = regenOutfits[idx];
        }
        for (const { idx } of violations) {
          const stillBad = detectBrandDominance(outfits[idx]);
          if (stillBad) console.warn(`[brand-mono] outfit ${idx + 1} still monoculture after regen: ${stillBad}`);
        }
      }
    } catch (err) {
      console.warn('[brand-mono] regeneration failed:', err.message);
    }
  }

  // Track which products are used across ALL outfits for strict rotation enforcement
  const usedAcrossOutfits = new Set();

  return outfits.map(outfit => {
    const seenInThisOutfit = new Set();

    const resolvedItems = outfit.items.map(item => {
      const product = allProducts.find(p => matchProduct(p.name, item.product_name));
      return { ...item, product: product ?? null };
    }).filter(i => {
      if (!i.product) return false;
      // Deduplicate within this outfit — same product name cannot appear twice
      const key = (i.product.name ?? i.product_name ?? '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 50);
      if (seenInThisOutfit.has(key)) return false;
      seenInThisOutfit.add(key);
      return true;
    });

    // Mark these products as used so later outfits rotate to different items
    resolvedItems.forEach(i => {
      const key = (i.product.name ?? '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 50);
      usedAcrossOutfits.add(key);
    });

    const newProducts = resolvedItems.map(i => i.product);
    const multipliers = newProducts.map(p => checkOutfitMultiplier(p, wardrobeItems ?? []));
    const avgMultiplier = multipliers.reduce((s, m) => s + m.multiplier, 0) / (multipliers.length || 1);

    return {
      ...outfit,
      items:           resolvedItems,
      wardrobe_multiplier: Math.round(avgMultiplier),
    };
  });
}
