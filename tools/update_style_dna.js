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
    const weight = signalType === 'post_delivery_negative' ? 2 : 1;
    Object.assign(updates, _applyRejection(dna, itemAttributes, weight));
  }

  if (signalType === 'approval' || signalType === 'post_delivery_positive') {
    const weight = signalType === 'post_delivery_positive' ? 2 : 1;
    Object.assign(updates, _applyApproval(dna, itemAttributes, weight));
  }

  if (signalType === 'swap' && swapTarget) {
    // Apply rejection on the original item, approval (1.5×) on what they chose instead
    Object.assign(updates, _applyRejection(dna, itemAttributes, 1));
    Object.assign(updates, _applyApproval(dna, swapTarget, 1.5));

    // Log per-attribute deltas to directional_preferences for trend analysis
    const deltaRows = [];
    for (const attr of ['fit_type', 'style_category', 'brand']) {
      if (itemAttributes[attr] && swapTarget[attr] && itemAttributes[attr] !== swapTarget[attr]) {
        deltaRows.push({ user_id: userId, attribute_name: attr, from_value: itemAttributes[attr], to_value: swapTarget[attr] });
      }
    }
    // Capture dominant color delta if both items have hex colors
    if (itemAttributes.colors?.[0] && swapTarget.colors?.[0] && itemAttributes.colors[0] !== swapTarget.colors[0]) {
      deltaRows.push({ user_id: userId, attribute_name: 'color', from_value: itemAttributes.colors[0], to_value: swapTarget.colors[0] });
    }
    if (deltaRows.length > 0) {
      await supabase.from('directional_preferences').insert(deltaRows);
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

// Applies rejection signal to the dna snapshot, returns partial updates object.
// weight > 1 makes counts accumulate faster (e.g. post_delivery_negative = 2).
function _applyRejection(dna, item, weight = 1) {
  const updates  = {};
  const dislikes = { ...(dna.explicit_dislikes ?? {}) };
  const counts   = {
    brands: { ...(dislikes.counts?.brands ?? {}) },
    colors: { ...(dislikes.counts?.colors ?? {}) },
    fits:   { ...(dislikes.counts?.fits   ?? {}) },
    styles: { ...(dislikes.counts?.styles ?? {}) },
  };

  if (item.brand) {
    counts.brands[item.brand] = (counts.brands[item.brand] ?? 0) + weight;
    if (counts.brands[item.brand] >= 3) {
      const rejections = dna.brand_rejections ?? [];
      if (!rejections.includes(item.brand)) {
        updates.brand_rejections = [...rejections, item.brand].slice(0, 20);
      }
    }
  }
  if (item.fit_type) {
    counts.fits[item.fit_type] = (counts.fits[item.fit_type] ?? 0) + weight;
    if (counts.fits[item.fit_type] >= 2) {
      dislikes.fits = [...new Set([...(dislikes.fits ?? []), item.fit_type])];
    }
  }
  if (item.style_category) {
    counts.styles[item.style_category] = (counts.styles[item.style_category] ?? 0) + weight;
    if (counts.styles[item.style_category] >= 2) {
      dislikes.styles = [...new Set([...(dislikes.styles ?? []), item.style_category])];
    }
  }
  for (const color of (item.colors ?? [])) {
    counts.colors[color] = (counts.colors[color] ?? 0) + weight;
    if (counts.colors[color] >= 2) {
      const avoided = [...(dna.avoided_colors ?? [])];
      if (!avoided.includes(color)) avoided.push(color);
      updates.avoided_colors = [...new Set(avoided)].slice(0, 10);
    }
  }
  if (item.name) {
    const dislikedNames = [...(dislikes.product_names ?? []), item.name];
    dislikes.product_names = [...new Set(dislikedNames)].slice(0, 100);
  }

  dislikes.counts = counts;
  updates.explicit_dislikes = dislikes;
  return updates;
}

// Applies approval signal to the dna snapshot, returns partial updates object.
// weight > 1 makes the signal carry more influence (e.g. post_delivery_positive = 2).
function _applyApproval(dna, item, weight = 1) {
  const updates = {};

  if (item.brand) {
    const affinities = dna.brand_affinities ?? [];
    if (!affinities.includes(item.brand)) {
      updates.brand_affinities = [...affinities, item.brand].slice(0, 20);
    }
  }

  if (item.category && item.price) {
    const sensitivity = { ...(dna.per_category_price_sensitivity ?? {}) };
    const existing    = sensitivity[item.category] ?? item.price;
    // Weighted moving average — higher weight tilts toward the new price point faster
    sensitivity[item.category] = Math.round((existing + item.price * weight) / (1 + weight));
    updates.per_category_price_sensitivity = sensitivity;
  }

  if (item.style_category) {
    const primary   = dna.primary_style_category;
    const secondary = [...(dna.secondary_categories ?? [])];
    if (item.style_category !== primary && !secondary.includes(item.style_category)) {
      secondary.push(item.style_category);
      updates.secondary_categories = secondary.slice(-2);
    }
  }

  if (item.colors?.length) {
    const primary   = [...(dna.primary_colors   ?? [])];
    const secondary = [...(dna.secondary_colors ?? [])];
    for (const color of item.colors) {
      if (!primary.includes(color) && !secondary.includes(color)) {
        secondary.push(color);
      }
    }
    updates.secondary_colors = [...new Set(secondary)].slice(0, 8);
  }

  return updates;
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
