import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY  // service key for server-side tool access
);

/**
 * Fetches everything the agent needs in one parallel round-trip.
 * - wardrobe_items: includes item_type + public_url for visual search anchor selection.
 *   image_url is intentionally omitted (base64 — too large for the profile payload;
 *   visual_search.js fetches it lazily only for the 1-2 chosen anchor items).
 * - aspiration_items: fetched in full (limited to 20) for anchor selection.
 *   These are already Supabase Storage URLs so they're small.
 * - orders and feedbackSignals are omitted (not used in agent pipeline)
 */
export async function getUserProfile(userId) {
  const [
    { data: profile },
    { data: styleProfile },
    { data: styleDna },
    { data: wardrobeItems },
    { data: aspirationItems },
    { data: wallet },
  ] = await Promise.all([
    supabase.from('users').select('*').eq('id', userId).single(),
    supabase.from('style_profiles').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).single(),
    supabase.from('style_dna').select('*').eq('user_id', userId).single(),
    supabase.from('wardrobe_items')
      .select('id, user_id, category, style_category, formality_score, item_type, public_url')
      .eq('user_id', userId)
      .order('uploaded_at', { ascending: false }),
    supabase.from('aspiration_items')
      .select('id, source_type, image_url, style_category, individual_items')
      .eq('user_id', userId)
      .order('analyzed_at', { ascending: false })
      .limit(20),
    supabase.from('wallet').select('*').eq('user_id', userId).single(),
  ]);

  const wardrobeCount   = wardrobeItems?.length ?? 0;
  const aspirationTotal = aspirationItems?.length ?? 0;
  const totalImages     = wardrobeCount + aspirationTotal;

  const confidenceLevel =
    totalImages < 20 ? 'low' :
    totalImages < 50 ? 'medium' : 'high';

  return {
    profile,
    styleProfile,
    styleDna,
    wardrobeItems:      wardrobeItems  ?? [],
    aspirationItems:    aspirationItems ?? [],
    wallet:             wallet ?? { balance: 0 },
    // Flattened style-vault fields
    gender:              styleProfile?.gender               ?? null,
    ageRange:            styleProfile?.age_range            ?? null,
    sizes:               styleProfile?.sizes                ?? null,
    favoriteStores:      styleProfile?.favorite_stores     ?? [],
    storeOpennessTiers:  styleProfile?.store_openness_tiers ?? [],
    styleTags:           styleProfile?.style_tags           ?? [],
    pinterestBoardUrls: styleProfile?.pinterest_board_urls
                          ?? (styleProfile?.pinterest_board_url ? [styleProfile.pinterest_board_url] : []),
    countryCode:  profile?.country_code ?? 'us',
    location:     profile?.location     ?? null,
    confidenceLevel,
    imageCount: totalImages,
  };
}
