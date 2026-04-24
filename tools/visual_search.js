import { createClient } from '@supabase/supabase-js';
import { reverseImageSearch } from './reverse_image_search.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Maps agent slot categories to the item_type values analyze_image_style returns
const SLOT_TO_ITEM_TYPES = {
  tops:        ['top'],
  bottoms:     ['bottom'],
  shoes:       ['shoes'],
  outerwear:   ['outerwear'],
  accessories: ['accessory'],
};

// Request-scoped Lens cache — prevents duplicate API calls when the same
// wardrobe photo is selected as anchor for multiple slots in one search
const _lensCache = new Map();

/**
 * Return a publicly accessible URL for a wardrobe item.
 * Wardrobe items are stored as base64 data URLs — this uploads them to
 * Supabase Storage once and caches the public URL back to the DB.
 * Aspiration items are already proxied to Supabase Storage during analysis.
 */
async function ensurePublicUrl(item) {
  if (item.public_url) return item.public_url;

  // Fetch image_url from DB — getUserProfile doesn't load it (too large for
  // the lean profile payload, so we fetch lazily only for chosen anchors)
  const table = item._fromAspiration ? 'aspiration_items' : 'wardrobe_items';
  const { data } = await supabase.from(table).select('image_url').eq('id', item.id).single();
  if (!data?.image_url) return null;

  const url = data.image_url;
  if (!url.startsWith('data:')) return url; // already a public URL (e.g. proxied aspiration pin)

  // Upload base64 to Supabase Storage
  const commaIdx = url.indexOf(',');
  if (commaIdx === -1) return null;
  const header      = url.slice(0, commaIdx);
  const base64      = url.slice(commaIdx + 1);
  const contentType = header.replace('data:', '').replace(';base64', '');
  const ext         = contentType.includes('png') ? 'png' : 'jpg';
  const path        = `anchors/${item.user_id ?? 'shared'}/${item.id}.${ext}`;

  try {
    const buffer = Buffer.from(base64, 'base64');
    const { error } = await supabase.storage
      .from('wardrobe')
      .upload(path, buffer, { contentType, upsert: true });
    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage.from('wardrobe').getPublicUrl(path);

    // Cache back to the wardrobe_items row (fire-and-forget)
    supabase.from('wardrobe_items')
      .update({ public_url: publicUrl })
      .eq('id', item.id)
      .then(() => {}).catch(() => {});

    return publicUrl;
  } catch (err) {
    console.warn('[visual_search] ensurePublicUrl upload failed:', err.message);
    return null;
  }
}

/**
 * Select the best wardrobe / aspiration photos as Lens query anchors.
 *
 * Tier 1 — wardrobe items where item_type exactly matches the slot category.
 *   These are single-item photos — the closest thing to "find more like this".
 *
 * Tier 2 — aspiration pins that contain an individual_item of the right type.
 *   Full outfit photos work surprisingly well: Lens returns items similar to
 *   the overall look, and we filter results to the target category.
 *
 * Tier 3 — any wardrobe item whose style_category matches the DNA primary.
 *   Aesthetic-only anchor. Captures color palette and vibe even if item type
 *   doesn't match — useful when item_type hasn't been populated yet.
 *
 * Within each tier, items are ranked by style_category match to DNA primary.
 */
export function selectAnchors(slotCategory, wardrobeItems, aspirationItems, dna) {
  const validTypes   = SLOT_TO_ITEM_TYPES[slotCategory] ?? [];
  const primaryStyle = dna?.primary_style_category;
  const secondary    = dna?.secondary_categories ?? [];

  const styleScore = (item) =>
    item.style_category === primaryStyle ? 2 :
    secondary.includes(item.style_category) ? 1 : 0;

  // Tier 1: exact item_type wardrobe matches
  const exactWardrobe = (wardrobeItems ?? [])
    .filter(i => i.item_type && validTypes.includes(i.item_type))
    .sort((a, b) => styleScore(b) - styleScore(a))
    .slice(0, 2);

  if (exactWardrobe.length >= 1) {
    return { anchors: exactWardrobe, source: 'wardrobe_exact' };
  }

  // Tier 2: aspiration pins that contain the right item type
  const aspirationAnchors = (aspirationItems ?? [])
    .filter(i => {
      if (i.source_type === 'pinterest_owned') return false;
      return (i.individual_items ?? []).some(sub => validTypes.includes(sub.item_type));
    })
    .map(i => ({ ...i, _fromAspiration: true }))
    .sort((a, b) => styleScore(b) - styleScore(a))
    .slice(0, 2);

  if (aspirationAnchors.length >= 1) {
    return { anchors: aspirationAnchors, source: 'aspiration' };
  }

  // Tier 3: aesthetic-only anchor (any wardrobe item matching primary style)
  const styleAnchors = (wardrobeItems ?? [])
    .filter(i => i.style_category && (
      i.style_category === primaryStyle || secondary.includes(i.style_category)
    ))
    .sort((a, b) => styleScore(b) - styleScore(a))
    .slice(0, 1);

  if (styleAnchors.length >= 1) {
    return { anchors: styleAnchors, source: 'style_only' };
  }

  return { anchors: [], source: 'none' };
}

/**
 * Run Google Lens on a single anchor and return normalized product objects.
 * Results are cached by anchor ID so the same photo is never queried twice.
 */
async function runLensOnAnchor(anchor, slotCategory, budget) {
  const cacheKey = `${anchor.id}:${slotCategory}`;
  if (_lensCache.has(cacheKey)) return _lensCache.get(cacheKey);

  const imageUrl = await ensurePublicUrl(anchor);
  if (!imageUrl) {
    console.warn('[visual_search] No accessible URL for anchor', anchor.id);
    _lensCache.set(cacheKey, []);
    return [];
  }

  let lensData;
  try {
    console.log(`[visual_search] Lens query | anchor=${anchor.id} source=${anchor._fromAspiration ? 'aspiration' : 'wardrobe'} url=${imageUrl.slice(0, 60)}...`);
    lensData = await reverseImageSearch(imageUrl);
  } catch (err) {
    console.warn('[visual_search] Lens failed for anchor', anchor.id, ':', err.message);
    _lensCache.set(cacheKey, []);
    return [];
  }

  const products = (lensData.shopping_results ?? [])
    .filter(p => p.name && p.product_url)
    .filter(p => !budget || !p.price || p.price <= budget)
    .map(p => ({
      id:             p.product_url,
      name:           p.name,
      price:          p.price ?? null,
      store:          p.store,
      image_url:      p.image_url,
      all_images:     p.image_url ? [p.image_url] : [],
      product_url:    p.product_url,
      brand:          p.brand ?? null,
      colors:         null,
      style_category: null,
      fit_type:       null,
      category:       slotCategory,
      _source:        'lens',
      _anchorId:      anchor.id,
    }));

  console.log(`[visual_search] Lens returned ${products.length} products for anchor ${anchor.id}`);
  _lensCache.set(cacheKey, products);
  return products;
}

/**
 * Full visual search pipeline for one slot:
 *   1. Select best anchor photos
 *   2. Run Lens on all anchors in parallel
 *   3. Deduplicate by product URL
 *   4. Return merged results tagged with _source: 'lens'
 *
 * Never throws — returns { products: [], source: 'none' } on any failure.
 */
export async function visualSearchForSlot(slotCategory, wardrobeItems, aspirationItems, dna, budget) {
  try {
    const { anchors, source } = selectAnchors(slotCategory, wardrobeItems, aspirationItems, dna);

    if (anchors.length === 0) {
      console.log(`[visual_search] No anchors for slot=${slotCategory}, will use text search only`);
      return { products: [], source: 'none' };
    }

    const allResults = await Promise.all(
      anchors.map(a => runLensOnAnchor(a, slotCategory, budget).catch(() => []))
    );

    // Deduplicate across anchors by product URL
    const seen   = new Set();
    const merged = allResults.flat().filter(p => {
      if (seen.has(p.product_url)) return false;
      seen.add(p.product_url);
      return true;
    });

    console.log(`[visual_search] slot=${slotCategory} source=${source} total_products=${merged.length}`);
    return { products: merged, source };
  } catch (err) {
    console.warn('[visual_search] visualSearchForSlot failed:', err.message);
    return { products: [], source: 'none' };
  }
}
