# Workflow: analyze_wardrobe

**Trigger:** User uploads one or more wardrobe photos

**Objective:** Extract style attributes from every image and update the Style DNA

## Steps

1. For each uploaded image call `tools/analyze_image_style.js`
2. Extract: dominant colors (hex), secondary colors, fit type, fabric if identifiable, formality level 1-10, style category, brand if visible, item type, occasion suitability
3. Store each analyzed item in `wardrobe_items` in Supabase with all extracted attributes
4. After all images are processed call `tools/synthesize_style_dna.js` to update the master Style DNA
5. Update confidence scores based on new sample size
6. Return a brief summary: how many items were analyzed, what patterns were detected, what the profile now understands about their style

## Edge Cases

- **Unclear/low-res image:** skip it, note it was skipped, do not guess
- **Multiple people:** analyze only the primary subject
- **Not clothing:** skip, notify user
- **Unidentifiable item:** record as "unclassified" rather than forcing a category
