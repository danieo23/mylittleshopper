import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY  // service key for server-side tool access
);

/**
 * Fetches everything about the user in a single call.
 * Always the first tool called before any recommendation workflow.
 */
export async function getUserProfile(userId) {
  const [
    { data: profile },
    { data: styleProfile },
    { data: styleDna },
    { data: wardrobeItems },
    { data: aspirationItems },
    { data: orders },
    { data: wallet },
    { data: feedbackSignals },
  ] = await Promise.all([
    supabase.from('users').select('*').eq('id', userId).single(),
    supabase.from('style_profiles').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).single(),
    supabase.from('style_dna').select('*').eq('user_id', userId).single(),
    supabase.from('wardrobe_items').select('*').eq('user_id', userId).order('uploaded_at', { ascending: false }),
    supabase.from('aspiration_items').select('*').eq('user_id', userId).order('analyzed_at', { ascending: false }),
    supabase.from('orders').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(10),
    supabase.from('wallet').select('*').eq('user_id', userId).single(),
    supabase.from('feedback_signals').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50),
  ]);

  const confidenceLevel =
    (wardrobeItems?.length ?? 0) + (aspirationItems?.length ?? 0) < 20 ? 'low' :
    (wardrobeItems?.length ?? 0) + (aspirationItems?.length ?? 0) < 50 ? 'medium' : 'high';

  // Strip image data (data URLs) — agent needs style attributes, not pixel data
  const stripImageData = (item) => {
    const { image_url, ...rest } = item;
    return rest;
  };

  return {
    profile,
    styleProfile,
    styleDna,
    wardrobeItems:       (wardrobeItems   ?? []).map(stripImageData),
    aspirationItems:     (aspirationItems ?? []).map(stripImageData),
    recentOrders:        orders           ?? [],
    wallet:              wallet           ?? { balance: 0 },
    feedbackSignals:     feedbackSignals  ?? [],
    // Flattened style-vault fields for convenient access
    sizes:               styleProfile?.sizes            ?? null,
    favoriteStores:      styleProfile?.favorite_stores  ?? [],
    styleTags:           styleProfile?.style_tags       ?? [],
    pinterestBoardUrls:  styleProfile?.pinterest_board_urls ?? (styleProfile?.pinterest_board_url ? [styleProfile.pinterest_board_url] : []),
    confidenceLevel,
    imageCount: (wardrobeItems?.length ?? 0) + (aspirationItems?.length ?? 0),
  };
}
