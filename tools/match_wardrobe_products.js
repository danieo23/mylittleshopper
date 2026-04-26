import { createClient } from '@supabase/supabase-js';
import { searchProducts } from './search_products.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Reused from other tools — maps hex → readable color name for query building
function hexToBucket(hex) {
  if (!hex || typeof hex !== 'string') return null;
  const h = hex.replace('#', '').padEnd(6, '0');
  const r = parseInt(h.slice(0,2), 16) || 0;
  const g = parseInt(h.slice(2,4), 16) || 0;
  const b = parseInt(h.slice(4,6), 16) || 0;
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  const max = Math.max(r, g, b);
  const sat = max === 0 ? 0 : (max - Math.min(r, g, b)) / max;
  if (brightness < 35) return 'black';
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

// Maps item_type string to the category key used by searchProducts
function itemTypeToCategory(itemType) {
  if (!itemType) return 'tops';
  const t = itemType.toLowerCase();
  if (/\b(hoodie|t-?shirt|tee|sweatshirt|shirt|blouse|top|pullover|sweater|cardigan|polo|henley|jersey|tank|crop)\b/.test(t)) return 'tops';
  if (/\b(pants?|jeans?|shorts?|trousers?|chinos?|skirt|leggings?|denim)\b/.test(t)) return 'bottoms';
  if (/\b(shoes?|sneakers?|boots?|sandals?|loafers?|heels?|footwear|kicks)\b/.test(t)) return 'shoes';
  if (/\b(jacket|coat|blazer|outerwear|parka|windbreaker|bomber|trench|vest)\b/.test(t)) return 'outerwear';
  if (/\b(dress|gown|romper|jumpsuit)\b/.test(t)) return 'dress';
  if (/\b(accessory|accessories|hat|cap|bag|belt|scarf|socks|glasses)\b/.test(t)) return 'accessories';
  return 'tops';
}

// Build a style-aware search query from a wardrobe item's extracted attributes
function buildMatchQuery(item) {
  const color = (item.colors ?? []).slice(0, 1).map(hexToBucket).filter(Boolean)[0] ?? '';
  const fit   = item.fit_type    ?? '';
  const type  = item.item_type   ?? '';
  const style = item.style_category ?? '';
  const wash  = item.wash_treatment ?? '';
  return [wash, color, fit, type, style].filter(Boolean).join(' ').trim();
}

// Score how well a product matches a wardrobe item (0–100)
function scoreMatch(product, item, styleDna) {
  let score = 60;
  const name = (product.name ?? '').toLowerCase();

  const type = (item.item_type ?? '').toLowerCase();
  if (type && name.includes(type)) score += 15;

  const color = (item.colors ?? []).slice(0, 1).map(hexToBucket).filter(Boolean)[0] ?? '';
  if (color && name.includes(color)) score += 15;

  const profileBrands = [
    ...(styleDna?.explicit_dislikes?.profile_recommended_brands ?? []),
    ...(styleDna?.brand_affinities ?? []),
  ].map(b => b.toLowerCase());
  const productBrand = (product.brand ?? product.store ?? '').toLowerCase();
  if (productBrand && profileBrands.some(b => productBrand.includes(b) || b.includes(productBrand))) {
    score += 10;
  }
  return Math.min(score, 100);
}

// Generate a one-sentence match reason from item attributes — no extra API call
function buildMatchReason(item) {
  const color = (item.colors ?? []).slice(0, 1).map(hexToBucket).filter(Boolean)[0] ?? '';
  const fit   = item.fit_type ?? '';
  const type  = item.item_type ?? 'piece';
  const parts = [fit, color, type].filter(Boolean).join(' ');
  return `Matches your ${parts} — similar aesthetic, silhouette, and color palette.`;
}

// Run async tasks in parallel batches (same pattern as analyze.js)
async function inBatches(items, fn, size = 3) {
  const results = [];
  for (let i = 0; i < items.length; i += size) {
    const batch = await Promise.allSettled(items.slice(i, i + size).map(fn));
    results.push(...batch);
  }
  return results;
}

/**
 * Finds and stores a matching real product for every analyzed wardrobe item.
 * Uses the existing brand-first search pipeline from search_products.js.
 * Skips items whose match was scraped within the last 24 hours (cache).
 * After matching, marks the top 5 highest-scoring matches as is_top_pick.
 *
 * @param {string} userId
 * @returns {{ matched: number, skipped: number, total: number }}
 */
export async function matchWardrobeProducts(userId) {
  const [
    { data: items },
    { data: existingMatches },
    { data: dna },
  ] = await Promise.all([
    supabase
      .from('wardrobe_items')
      .select('id, item_type, colors, fit_type, style_category, brand, ocr_text, cultural_signals, wash_treatment')
      .eq('user_id', userId)
      .not('item_type', 'is', null),
    supabase
      .from('product_matches')
      .select('wardrobe_item_id, scraped_at')
      .eq('user_id', userId),
    supabase
      .from('style_dna')
      .select('*')
      .eq('user_id', userId)
      .single(),
  ]);

  if (!items?.length) return { matched: 0, skipped: 0, total: 0 };

  const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
  const now = Date.now();
  const cacheMap = new Map((existingMatches ?? []).map(m => [m.wardrobe_item_id, m.scraped_at]));

  const toProcess = items.filter(item => {
    const scrapedAt = cacheMap.get(item.id);
    if (!scrapedAt) return true;
    return now - new Date(scrapedAt).getTime() > CACHE_TTL_MS;
  });

  let matched = 0;
  const skipped = items.length - toProcess.length;

  await inBatches(toProcess, async (item) => {
    try {
      const query    = buildMatchQuery(item);
      const category = itemTypeToCategory(item.item_type);
      const products = await searchProducts({ query, category, styleDna: dna ?? null });

      if (!products?.length) return;

      const best   = products[0];
      const score  = scoreMatch(best, item, dna);
      const reason = buildMatchReason(item);

      await supabase.from('product_matches').upsert({
        wardrobe_item_id: item.id,
        user_id:          userId,
        product_name:     best.name ?? null,
        brand_name:       best.brand ?? best.store ?? null,
        price:            best.price ?? null,
        currency:         'USD',
        image_url:        best.image_url ?? null,
        product_url:      best.product_url ?? null,
        store_url:        best.store ? `https://${best.store}.com` : null,
        match_score:      score,
        match_reason:     reason,
        is_top_pick:      false,
        scraped_at:       new Date().toISOString(),
      }, { onConflict: 'wardrobe_item_id' });

      matched++;
    } catch (err) {
      console.error(`[match-wardrobe] item ${item.id}:`, err.message);
    }
  }, 3);

  // Recalculate top 5 picks across all matches for this user
  const { data: allMatches } = await supabase
    .from('product_matches')
    .select('id, match_score')
    .eq('user_id', userId)
    .order('match_score', { ascending: false });

  if (allMatches?.length) {
    const topIds   = allMatches.slice(0, 5).map(m => m.id);
    const otherIds = allMatches.slice(5).map(m => m.id);
    if (topIds.length)   await supabase.from('product_matches').update({ is_top_pick: true  }).in('id', topIds);
    if (otherIds.length) await supabase.from('product_matches').update({ is_top_pick: false }).in('id', otherIds);
  }

  return { matched, skipped, total: items.length };
}
