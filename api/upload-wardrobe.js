import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method === 'DELETE') {
    const { itemId } = req.body;
    if (!itemId) return res.status(400).json({ error: 'itemId required' });
    const { error } = await supabase.from('wardrobe_items').delete().eq('id', itemId);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  if (req.method !== 'POST') return res.status(405).end();

  const { userId, category, dataUrl } = req.body;
  if (!userId || !dataUrl) return res.status(400).json({ error: 'userId and dataUrl required' });

  try {
    // Store the compressed JPEG data URL directly in the DB — no storage bucket needed
    const { data: item, error } = await supabase
      .from('wardrobe_items')
      .insert({ user_id: userId, image_url: dataUrl, category: category || 'wardrobe' })
      .select()
      .single();

    if (error) throw error;
    return res.status(200).json({ item });
  } catch (err) {
    console.error('[upload-wardrobe]', err);
    return res.status(500).json({ error: err.message });
  }
}
