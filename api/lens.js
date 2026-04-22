import { createClient } from '@supabase/supabase-js';
import { reverseImageSearch } from '../tools/reverse_image_search.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { imageUrl, pinId, userId } = req.body;
  if (!imageUrl || !userId) return res.status(400).json({ error: 'imageUrl and userId required' });

  try {
    const results    = await reverseImageSearch(imageUrl);
    const shopResults = {
      shopping: results.shopping_results,
      visual:   results.visual_matches,
    };

    // Cache results back on the pin row so next open is instant
    if (pinId) {
      await supabase
        .from('aspiration_items')
        .update({ shopping_results: shopResults })
        .eq('id', pinId)
        .eq('user_id', userId);
    }

    return res.status(200).json({ shopping_results: shopResults });
  } catch (err) {
    console.error('[lens]', err);
    return res.status(500).json({ error: err.message });
  }
}
