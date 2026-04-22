import Anthropic from '@anthropic-ai/sdk';
import { checkOutfitMultiplier } from './check_outfit_multiplier.js';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 25_000 });

/**
 * Takes scored products grouped by category and assembles 3-5 complete outfit sets.
 * Uses Claude to reason about combinations and generate style notes.
 */
export async function buildOutfits({ scoredProducts, styleDna, wardrobeItems, budget, occasion }) {
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

  const prompt = `You are a personal stylist AI. Assemble 3 complete outfit combinations from these available products for a ${occasion ?? 'general'} occasion. Budget: $${budget}.

${dnaContext}

AVAILABLE PRODUCTS:
${productSummary}

Rules:
1. Each outfit must include at minimum: a top + bottom + shoes (or a dress + shoes)
2. Total price of each outfit must be within $${budget}
3. Each outfit should have a distinct color story — don't make three identical-palette looks
4. Items must be internally coherent in formality (don't mix formalwear with athletic)
5. At least one outfit should address the user's aspiration gap if one exists

Return a JSON array of outfit objects. Each object:
{
  "outfit_name": "short evocative name",
  "items": [
    { "category": "top|bottom|shoes|outerwear|dress|accessory", "product_name": "exact name from the list above" }
  ],
  "total_price": number,
  "style_note": "one sentence referencing the user's actual profile — personal, not generic",
  "occasion_fit": "brief note on why this works for the occasion"
}

Only return the JSON array. No other text.`;

  const response = await client.messages.create({
    model:      'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    messages:   [{ role: 'user', content: prompt }],
  });

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

  return outfits.map(outfit => {
    const resolvedItems = outfit.items.map(item => {
      const product = allProducts.find(p => matchProduct(p.name, item.product_name));
      return { ...item, product: product ?? null };
    }).filter(i => i.product);

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
