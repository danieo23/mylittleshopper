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

  // Move an item to a different category tab.
  // fromAspiration=true: converts a pinterest_owned aspiration_item into a wardrobe_item.
  if (req.method === 'PATCH') {
    const { itemId, category, fromAspiration = false,
            userId, imageUrl, colors, fitType, formalityScore, styleCategory, brand } = req.body;
    if (!itemId || !category) return res.status(400).json({ error: 'itemId and category required' });

    try {
      if (fromAspiration) {
        // Copy the pin into wardrobe_items then remove from aspiration_items
        const { data: item, error: insertErr } = await supabase
          .from('wardrobe_items')
          .insert({
            user_id:         userId,
            image_url:       imageUrl,
            category,
            colors:          colors          ?? null,
            fit_type:        fitType         ?? null,
            formality_score: formalityScore  ?? null,
            style_category:  styleCategory   ?? null,
            brand:           brand           ?? null,
          })
          .select()
          .single();
        if (insertErr) throw insertErr;
        await supabase.from('aspiration_items').delete().eq('id', itemId);
        return res.status(200).json({ item });
      } else {
        // Simple category change within wardrobe_items
        const { error } = await supabase
          .from('wardrobe_items')
          .update({ category })
          .eq('id', itemId);
        if (error) throw error;
        return res.status(200).json({ ok: true });
      }
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
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
