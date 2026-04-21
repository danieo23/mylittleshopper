/**
 * Checks how many existing wardrobe items a new product pairs with.
 * High multiplier = high priority recommendation.
 * Also used in reverse for gap analysis: find the missing piece
 * that would pair with the most existing wardrobe items.
 */

const COMPATIBLE_PAIRS = {
  tops:       ['bottoms', 'shoes', 'outerwear', 'accessories'],
  bottoms:    ['tops', 'shoes', 'outerwear', 'accessories'],
  shoes:      ['tops', 'bottoms', 'dress'],
  outerwear:  ['tops', 'bottoms', 'dress', 'shoes'],
  dress:      ['shoes', 'outerwear', 'accessories'],
  accessories:['tops', 'bottoms', 'dress', 'outerwear'],
};

function stylesAreCompatible(styleA, styleB) {
  if (!styleA || !styleB) return true; // unknown = assume compatible
  const COMPATIBLE_GROUPS = [
    ['minimalist', 'smart_casual', 'euro_casual', 'old_money'],
    ['streetwear', 'hypebeast', 'techwear', 'y2k'],
    ['coastal', 'bohemian', 'preppy'],
    ['dark_academia', 'preppy', 'smart_casual'],
    ['athleisure', 'streetwear'],
  ];
  if (styleA === styleB) return true;
  return COMPATIBLE_GROUPS.some(g => g.includes(styleA) && g.includes(styleB));
}

function formalityCompatible(scoreA, scoreB) {
  if (scoreA == null || scoreB == null) return true;
  return Math.abs(scoreA - scoreB) <= 3; // within 3 points on the 1-10 scale
}

/**
 * @param {object}   newProduct    - The product being evaluated
 * @param {object[]} wardrobeItems - User's existing wardrobe items
 * @returns {{ multiplier: number, pairingItems: object[] }}
 */
export function checkOutfitMultiplier(newProduct, wardrobeItems) {
  if (!wardrobeItems?.length) return { multiplier: 0, pairingItems: [] };

  const compatibleCategories = COMPATIBLE_PAIRS[newProduct.category] ?? [];
  const pairingItems = wardrobeItems.filter(item => {
    if (!compatibleCategories.includes(item.category)) return false;
    if (!stylesAreCompatible(newProduct.style_category, item.style_category)) return false;
    if (!formalityCompatible(newProduct.formality_score, item.formality_score)) return false;
    return true;
  });

  return {
    multiplier:   pairingItems.length,
    pairingItems: pairingItems.slice(0, 5), // return top 5 for context
  };
}

/**
 * Gap analysis: find the category of item that would unlock the most
 * new outfit combinations from what the user already owns.
 */
export function findGapCategory(wardrobeItems) {
  const categoryCounts = {};
  for (const item of wardrobeItems) {
    categoryCounts[item.category] = (categoryCounts[item.category] ?? 0) + 1;
  }

  let bestCategory = null;
  let bestScore    = -1;

  for (const [candidate, compatibleWith] of Object.entries(COMPATIBLE_PAIRS)) {
    if (categoryCounts[candidate]) continue; // already have this category
    const potentialPairs = compatibleWith
      .reduce((sum, cat) => sum + (categoryCounts[cat] ?? 0), 0);
    if (potentialPairs > bestScore) {
      bestScore    = potentialPairs;
      bestCategory = candidate;
    }
  }

  return { gapCategory: bestCategory, potentialNewOutfits: bestScore };
}
