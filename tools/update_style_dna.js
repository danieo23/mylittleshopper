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
    const weight = signalType === 'post_delivery_negative' ? 3 : 1;

    // Track avoided colors
    if (itemAttributes.colors?.length) {
      const avoided = [...(dna.avoided_colors ?? [])];
      for (const color of itemAttributes.colors) {
        avoided.push(color);
      }
      // Deduplicate but keep frequency implicitly by checking patterns
      updates.avoided_colors = [...new Set(avoided)].slice(0, 10);
    }

    // Track rejected fits
    if (itemAttributes.fit_type) {
      const dislikes = { ...(dna.explicit_dislikes ?? {}) };
      dislikes.fits  = [...new Set([...(dislikes.fits ?? []), itemAttributes.fit_type])];
      updates.explicit_dislikes = dislikes;
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
      // Weighted average — approvals nudge the typical spend toward this price
      sensitivity[itemAttributes.category] = Math.round((existing * 2 + itemAttributes.price) / 3);
      updates.per_category_price_sensitivity = sensitivity;
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
    .select('signal_type, item_attributes_json, inferred_reason')
    .eq('user_id', userId)
    .in('signal_type', ['rejection', 'swap']);

  if (!signals?.length) return;

  // Count fit rejections
  const fitRejections = {};
  for (const s of signals) {
    const fit = s.item_attributes_json?.fit_type;
    if (fit) fitRejections[fit] = (fitRejections[fit] ?? 0) + 1;
  }

  const confirmedRejectedFits = Object.entries(fitRejections)
    .filter(([, count]) => count >= 3)
    .map(([fit]) => fit);

  if (confirmedRejectedFits.length > 0) {
    const dislikes = { ...(dna.explicit_dislikes ?? {}), fits: confirmedRejectedFits };
    await supabase.from('style_dna').update({ explicit_dislikes: dislikes }).eq('user_id', userId);
  }
}
