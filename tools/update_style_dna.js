import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Logs a feedback signal and updates the Style DNA accordingly.
 *
 * @param {string} userId
 * @param {'approval'|'rejection'|'swap'|'post_delivery_positive'|'post_delivery_negative'} signalType
 * @param {object} itemAttributes  - The item's style attributes (colors, fit, style_category, brand, etc.)
 * @param {object} [swapTarget]    - For swap signals: what they chose instead
 * @param {string} [inferredReason]- Why the signal happened (inferred by agent)
 */
export async function updateStyleDna(userId, signalType, itemAttributes, swapTarget = null, inferredReason = null) {
  // 1. Log the raw feedback signal
  await supabase.from('feedback_signals').insert({
    user_id:               userId,
    signal_type:           signalType,
    item_attributes_json:  itemAttributes,
    inferred_reason:       inferredReason,
  });

  // 2. Load current Style DNA
  const { data: dna } = await supabase
    .from('style_dna')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (!dna) return; // profile not yet synthesized — signals will be picked up next synthesis

  const updates = {};

  // 3. Apply signal logic
  if (signalType === 'rejection' || signalType === 'post_delivery_negative') {
    const dislikes = { ...(dna.explicit_dislikes ?? {}) };

    // Track avoided colors
    if (itemAttributes.colors?.length) {
      const avoided = [...(dna.avoided_colors ?? [])];
      for (const color of itemAttributes.colors) avoided.push(color);
      updates.avoided_colors = [...new Set(avoided)].slice(0, 10);
    }

    // Track rejected fits
    if (itemAttributes.fit_type) {
      dislikes.fits = [...new Set([...(dislikes.fits ?? []), itemAttributes.fit_type])];
    }

    // Track rejected style categories
    if (itemAttributes.style_category) {
      dislikes.styles = [...new Set([...(dislikes.styles ?? []), itemAttributes.style_category])];
    }

    updates.explicit_dislikes = dislikes;

    // Track rejected brands
    if (itemAttributes.brand) {
      const rejections = dna.brand_rejections ?? [];
      if (!rejections.includes(itemAttributes.brand)) {
        updates.brand_rejections = [...rejections, itemAttributes.brand].slice(0, 20);
      }
    }
  }

  if (signalType === 'approval' || signalType === 'post_delivery_positive') {
    const weight = signalType === 'post_delivery_positive' ? 2 : 1;

    // Reinforce brand affinities
    if (itemAttributes.brand) {
      const affinities = dna.brand_affinities ?? [];
      if (!affinities.includes(itemAttributes.brand)) {
        updates.brand_affinities = [...affinities, itemAttributes.brand].slice(0, 20);
      }
    }

    // Reinforce per-category price sensitivity
    if (itemAttributes.category && itemAttributes.price) {
      const sensitivity = { ...(dna.per_category_price_sensitivity ?? {}) };
      const existing    = sensitivity[itemAttributes.category] ?? itemAttributes.price;
      sensitivity[itemAttributes.category] = Math.round((existing * 2 + itemAttributes.price) / 3);
      updates.per_category_price_sensitivity = sensitivity;
    }

    // Reinforce style category — nudge toward approved aesthetic
    if (itemAttributes.style_category) {
      const primary    = dna.primary_style_category;
      const secondary  = [...(dna.secondary_categories ?? [])];
      if (itemAttributes.style_category === primary) {
        // Already primary — no change needed, DNA synthesis will handle weight
      } else if (!secondary.includes(itemAttributes.style_category)) {
        // New style being approved — add to secondary (capped at 2)
        secondary.push(itemAttributes.style_category);
        updates.secondary_categories = secondary.slice(-2);
      }
    }

    // Reinforce primary colors from approved item
    if (itemAttributes.colors?.length) {
      const primary   = [...(dna.primary_colors ?? [])];
      const secondary = [...(dna.secondary_colors ?? [])];
      for (const color of itemAttributes.colors) {
        if (!primary.includes(color) && !secondary.includes(color)) {
          // New color being approved — add to secondary palette
          secondary.push(color);
        }
      }
      updates.secondary_colors = [...new Set(secondary)].slice(0, 8);
    }
  }

  if (signalType === 'swap' && swapTarget) {
    // The delta between rejected and chosen = strong directional signal
    if (swapTarget.fit_type && itemAttributes.fit_type && swapTarget.fit_type !== itemAttributes.fit_type) {
      // They moved toward swapTarget.fit_type — note this preference direction
      // Will be picked up by the next synthesize_style_dna run
    }
  }

  // 4. Write updates if any
  if (Object.keys(updates).length > 0) {
    await supabase
      .from('style_dna')
      .update({ ...updates, last_synthesized_at: new Date().toISOString() })
      .eq('user_id', userId);
  }

  // 5. Check if any attribute has crossed the 3-signal threshold
  await _promoteConfirmedPreferences(userId, dna);
}

async function _promoteConfirmedPreferences(userId, dna) {
  const { data: signals } = await supabase
    .from('feedback_signals')
    .select('signal_type, item_attributes_json')
    .eq('user_id', userId)
    .in('signal_type', ['rejection', 'swap']);

  if (!signals?.length) return;

  const fitCounts   = {};
  const styleCounts = {};
  const brandCounts = {};

  for (const s of signals) {
    const attr = s.item_attributes_json ?? {};
    if (attr.fit_type)       fitCounts[attr.fit_type]         = (fitCounts[attr.fit_type]         ?? 0) + 1;
    if (attr.style_category) styleCounts[attr.style_category] = (styleCounts[attr.style_category] ?? 0) + 1;
    if (attr.brand)          brandCounts[attr.brand]          = (brandCounts[attr.brand]          ?? 0) + 1;
  }

  const dnaUpdates = {};

  // Promote confirmed rejected fits (3+ signals)
  const confirmedFits = Object.entries(fitCounts).filter(([, n]) => n >= 3).map(([f]) => f);
  if (confirmedFits.length) {
    const dislikes = { ...(dna.explicit_dislikes ?? {}), fits: confirmedFits };
    dnaUpdates.explicit_dislikes = dislikes;
  }

  // Promote confirmed rejected styles (3+ signals)
  const confirmedStyles = Object.entries(styleCounts).filter(([, n]) => n >= 3).map(([s]) => s);
  if (confirmedStyles.length) {
    const dislikes = dnaUpdates.explicit_dislikes ?? { ...(dna.explicit_dislikes ?? {}) };
    dislikes.styles = confirmedStyles;
    dnaUpdates.explicit_dislikes = dislikes;
  }

  // Promote confirmed rejected brands (3+ signals)
  const confirmedBrandRejections = Object.entries(brandCounts).filter(([, n]) => n >= 3).map(([b]) => b);
  if (confirmedBrandRejections.length) {
    const existing = dna.brand_rejections ?? [];
    const merged   = [...new Set([...existing, ...confirmedBrandRejections])].slice(0, 20);
    dnaUpdates.brand_rejections = merged;
  }

  if (Object.keys(dnaUpdates).length > 0) {
    await supabase.from('style_dna').update(dnaUpdates).eq('user_id', userId);
  }
}
