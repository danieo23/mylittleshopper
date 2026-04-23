import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY  // service key for server-side tool access
);

/**
 * Fetches everything the agent needs in one parallel round-trip.
 * Intentionally lean: only fetches what's actually used downstream.
 * - orders and feedbackSignals are omitted (not used in agent pipeline)
 * - aspiration_items: count only (confidence level needs count, not rows)
 * - wardrobe_items: minimal columns only (checkOutfitMultiplier needs
 *   category + style_category + formality_score, not image data or extras)
 */
export async function getUserProfile(userId) {
  const [
    { data: profile },
    { data: styleProfile },
    { data: styleDna },
    { data: wardrobeItems },
    { count: aspirationCount },
    { data: wallet },
  ] = await Promise.all([
    supabase.from('users').select('*').eq('id', userId).single(),
    supabase.from('style_profiles').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).single(),
    supabase.from('style_dna').select('*').eq('user_id', userId).single(),
    supabase.from('wardrobe_items')
      .select('id, category, style_category, formality_score')
      .eq('user_id', userId)
      .order('uploaded_at', { ascending: false }),
    supabase.from('aspiration_items')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId),
    supabase.from('wallet').select('*').eq('user_id', userId).single(),
  ]);

  const wardrobeCount   = wardrobeItems?.length ?? 0;
  const aspirationTotal = aspirationCount ?? 0;
  const totalImages     = wardrobeCount + aspirationTotal;

  const confidenceLevel =
    totalImages < 20 ? 'low' :
    totalImages < 50 ? 'medium' : 'high';

  return {
    profile,
    styleProfile,
    styleDna,
    wardrobeItems:      wardrobeItems ?? [],
    wallet:             wallet ?? { balance: 0 },
    // Flattened style-vault fields
    gender:             styleProfile?.gender            ?? null,
    ageRange:           styleProfile?.age_range         ?? null,
    sizes:              styleProfile?.sizes             ?? null,
    favoriteStores:     styleProfile?.favorite_stores  ?? [],
    styleTags:          styleProfile?.style_tags       ?? [],
    pinterestBoardUrls: styleProfile?.pinterest_board_urls
                          ?? (styleProfile?.pinterest_board_url ? [styleProfile.pinterest_board_url] : []),
    confidenceLevel,
    imageCount: totalImages,
  };
}
