import { createClient } from '@supabase/supabase-js';
import { scoreProductMatch } from './score_product_match.js';

const NON_SHOPPING_DOMAINS = [
  'youtube.com', 'youtu.be', 'vimeo.com', 'dailymotion.com',
  'pinterest.com', 'pinterest.co',
  'instagram.com', 'tiktok.com', 'twitter.com', 'x.com',
  'threads.net',
  'facebook.com', 'reddit.com', 'tumblr.com', 'snapchat.com',
];

function isShoppableUrl(url) {
  if (!url) return false;
  try {
    const host = new URL(url).hostname.replace(/^www\./, '').toLowerCase();
    return !NON_SHOPPING_DOMAINS.some(d => host === d || host.endsWith('.' + d));
  } catch { return false; }
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Maps Claude's item_type labels → the categories buildOutfits/productCache use
function inferCategory(itemType) {
  const t = (itemType ?? '').toLowerCase();
  if (/top|shirt|blouse|tee|tank|cami|bodysuit|sweater|knit/.test(t)) return 'tops';
  if (/bottom|pant|jean|trouser|skirt|short/.test(t))                   return 'bottoms';
  if (/shoe|sneaker|boot|sandal|heel|flat|loafer|mule/.test(t))         return 'shoes';
  if (/jacket|coat|outerwear|flannel|blazer|cardigan|hoodie/.test(t))   return 'outerwear';
  if (/dress/.test(t))                                                   return 'dress';
  if (/bag|purse|accessory|hat|scarf|jewel|belt|watch/.test(t))         return 'accessories';
  return null;
}

function parsePrice(raw) {
  if (!raw) return null;
  const n = parseFloat(String(raw).replace(/[^0-9.]/g, ''));
  return isNaN(n) ? null : n;
}

/**
 * Pulls shoppable products from the user's analyzed aspiration pins (Pinterest +
 * uploaded inspo). Each pin already has shopping_results cached from Google Lens.
 * Groups products by item category, scores them against the Style DNA, and returns
 * them in the same format productCache expects so buildOutfits can use them directly.
 *
 * @param {string} userId
 * @param {object|null} styleDna  — from userProfile.styleDna
 * @param {string|null} categoryFilter — optional: restrict to one category
 */
export async function getInspoProducts(userId, styleDna = null, categoryFilter = null) {
  const { data: pins, error } = await supabase
    .from('aspiration_items')
    .select('id, image_url, individual_items, style_category, shopping_results, analyzed_at')
    .eq('user_id', userId)
    .not('shopping_results', 'is', null)
    .order('analyzed_at', { ascending: false })
    .limit(30);

  if (error) throw error;
  if (!pins?.length) return { products_by_category: {}, pin_count: 0, has_results: false };

  const byCategory = {};

  for (const pin of pins) {
    const shopItems = (pin.shopping_results?.shopping ?? [])
      .filter(p => p.product_url && isShoppableUrl(p.product_url));
    if (!shopItems.length) continue;

    // Determine which item types Claude found in this image
    const individualTypes = (pin.individual_items ?? [])
      .map(i => inferCategory(i.item_type))
      .filter(Boolean);

    // If Claude found specific items in the image, assign products to those categories.
    // If not, fall back to the overall style_category, then to 'tops' as a safe default.
    const categories = individualTypes.length > 0
      ? [...new Set(individualTypes)]
      : [inferCategory(pin.style_category) ?? 'tops'];

    // Apply category filter if requested
    const activeCats = categoryFilter
      ? categories.filter(c => c === categoryFilter)
      : categories;
    if (!activeCats.length) continue;

    for (const product of shopItems.slice(0, 10)) {
      const name  = product.title ?? product.name ?? '';
      const price = parsePrice(product.price);

      for (const cat of activeCats) {
        const normalized = {
          id:             product.product_id ?? `lens-${pin.id}-${name.slice(0, 20)}`,
          name,
          price,
          store:          product.source ?? product.store ?? null,
          image_url:      product.thumbnail ?? product.image_url ?? null,
          all_images:     product.thumbnail ? [product.thumbnail] : [],
          product_url:    product.link ?? product.product_url ?? null,
          colors:         null,
          style_category: pin.style_category ?? null,
          fit_type:       null,
          brand:          product.brand ?? null,
          category:       cat,
          _from_inspo:    true,
          _pin_id:        pin.id,
          _pin_image:     pin.image_url,
        };

        const { score = 50, passes = true } = scoreProductMatch(normalized, styleDna) ?? {};
        // Inspo-sourced products get a base score boost — the user literally saved this image
        normalized.score  = Math.min(100, score + 15);
        normalized._score = normalized.score;
        normalized.passes = normalized.score >= 50;

        if (!byCategory[cat]) byCategory[cat] = [];
        byCategory[cat].push(normalized);
      }
    }
  }

  // Deduplicate by name, sort by score, cap at 10 per category
  for (const cat of Object.keys(byCategory)) {
    const seen = new Set();
    byCategory[cat] = byCategory[cat]
      .filter(p => {
        if (!p.name) return false;
        const key = p.name.toLowerCase().slice(0, 50);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, 10);
  }

  const hasResults = Object.values(byCategory).some(arr => arr.length > 0);
  return {
    products_by_category: byCategory,
    pin_count:   pins.length,
    has_results: hasResults,
    category_summary: Object.fromEntries(
      Object.entries(byCategory).map(([cat, arr]) => [cat, arr.length])
    ),
  };
}
