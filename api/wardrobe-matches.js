import { createClient } from '@supabase/supabase-js';
import { matchWardrobeProducts } from '../tools/match_wardrobe_products.js';

export const config = { maxDuration: 300 };

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * GET  /api/wardrobe-matches?userId=...
 *   Returns all product matches for a user, joined with wardrobe item details,
 *   plus the cached wardrobe profile and a catalog total.
 *
 * POST /api/wardrobe-matches
 *   Body: { userId }
 *   Triggers matchWardrobeProducts for the user. Can be called after analysis
 *   completes or when the user clicks "Find matches" on the results page.
 */
export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    try {
      const result = await matchWardrobeProducts(userId);
      return res.status(200).json({ success: true, ...result });
    } catch (err) {
      console.error('[wardrobe-matches POST]', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method !== 'GET') return res.status(405).end();

  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  try {
    // Load matches, wardrobe items (for thumbnails + type labels), and cached profile in parallel
    const [
      { data: matches },
      { data: wardrobeItems },
      { data: dna },
    ] = await Promise.all([
      supabase
        .from('product_matches')
        .select('*')
        .eq('user_id', userId)
        .order('match_score', { ascending: false }),
      supabase
        .from('wardrobe_items')
        .select('id, image_url, item_type, category')
        .eq('user_id', userId)
        .not('item_type', 'is', null),
      supabase
        .from('style_dna')
        .select('explicit_dislikes')
        .eq('user_id', userId)
        .single(),
    ]);

    const wardrobeMap = new Map((wardrobeItems ?? []).map(i => [i.id, i]));

    // Join each match with its wardrobe item thumbnail + type
    const itemMatches = (matches ?? []).map(m => {
      const wardrobeItem = wardrobeMap.get(m.wardrobe_item_id);
      return {
        wardrobe_item_id:    m.wardrobe_item_id,
        wardrobe_item_type:  wardrobeItem?.item_type  ?? null,
        wardrobe_image_url:  wardrobeItem?.image_url  ?? null,
        matched_product: {
          name:        m.product_name,
          brand:       m.brand_name,
          price:       m.price,
          currency:    m.currency,
          image_url:   m.image_url,
          product_url: m.product_url,
          store_url:   m.store_url,
        },
        match_score:  m.match_score,
        match_reason: m.match_reason,
        is_top_pick:  m.is_top_pick,
        scraped_at:   m.scraped_at,
      };
    });

    const topPicks      = itemMatches.filter(m => m.is_top_pick);
    const catalogTotal  = itemMatches.reduce((sum, m) => sum + (m.matched_product?.price ?? 0), 0);
    const wardrobeProfile = dna?.explicit_dislikes?.wardrobe_profile_cache ?? null;

    // Check if there are any unmatched analyzed items (so frontend can offer "Find matches")
    const matchedIds  = new Set((matches ?? []).map(m => m.wardrobe_item_id));
    const unmatched   = (wardrobeItems ?? []).filter(i => !matchedIds.has(i.id));

    return res.status(200).json({
      wardrobe_profile:  wardrobeProfile,
      item_matches:      itemMatches,
      top_picks:         topPicks,
      catalog_total:     Math.round(catalogTotal * 100) / 100,
      currency:          'USD',
      item_count:        itemMatches.length,
      unmatched_count:   unmatched.length,
      analysis_complete: unmatched.length === 0 && itemMatches.length > 0,
    });
  } catch (err) {
    console.error('[wardrobe-matches GET]', err.message);
    return res.status(500).json({ error: err.message });
  }
}
