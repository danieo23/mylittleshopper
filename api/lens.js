import { createClient } from '@supabase/supabase-js';
import { reverseImageSearch } from '../tools/reverse_image_search.js';
import { searchProducts }     from '../tools/search_products.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Build a style-aware fallback query from the pin's stored style attributes
function buildFallbackQuery(pin) {
  const parts = [];
  if (pin.fit_type)        parts.push(pin.fit_type);
  if (pin.style_category)  parts.push(pin.style_category.replace(/_/g, ' '));
  if (pin.colors?.length)  parts.push(pin.colors[0]);
  parts.push('outfit');
  return parts.join(' ');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { imageUrl, pinId, userId } = req.body;
  if (!imageUrl || !userId) return res.status(400).json({ error: 'imageUrl and userId required' });

  try {
    let shopResults = null;

    // --- Try Google Lens first ---
    try {
      const lens = await reverseImageSearch(imageUrl);
      if (lens.shopping_results?.length > 0) {
        shopResults = {
          shopping: lens.shopping_results,
          visual:   lens.visual_matches,
        };
      }
    } catch (lensErr) {
      console.warn('[lens] Google Lens failed:', lensErr.message);
    }

    // --- Fallback: style-based product search ---
    if (!shopResults && pinId) {
      const { data: pin } = await supabase
        .from('aspiration_items')
        .select('style_category, fit_type, colors')
        .eq('id', pinId)
        .eq('user_id', userId)
        .single();

      if (pin) {
        const query    = buildFallbackQuery(pin);
        const products = await searchProducts({ query, category: 'tops' });
        // Run a few category searches in parallel for a fuller result set
        const [tops, bottoms, shoes] = await Promise.allSettled([
          searchProducts({ query: `${pin.fit_type ?? ''} ${pin.style_category?.replace(/_/g, ' ') ?? ''} top shirt`.trim() }),
          searchProducts({ query: `${pin.fit_type ?? ''} ${pin.style_category?.replace(/_/g, ' ') ?? ''} pants trousers`.trim() }),
          searchProducts({ query: `${pin.style_category?.replace(/_/g, ' ') ?? 'casual'} sneakers shoes`.trim() }),
        ]);

        const fallbackProducts = [
          ...(tops.status    === 'fulfilled' ? tops.value    : []),
          ...(bottoms.status === 'fulfilled' ? bottoms.value : []),
          ...(shoes.status   === 'fulfilled' ? shoes.value   : []),
        ].map(p => ({
          name:        p.name,
          price:       p.price,
          store:       p.store,
          product_url: p.product_url,
          image_url:   p.image_url,
          brand:       p.brand ?? null,
        }));

        if (fallbackProducts.length > 0) {
          shopResults = { shopping: fallbackProducts, visual: [], isFallback: true };
        }
      }
    }

    if (!shopResults) {
      return res.status(200).json({ shopping_results: { shopping: [], visual: [] } });
    }

    // Cache back to the pin row
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
