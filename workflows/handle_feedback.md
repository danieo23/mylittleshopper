# Workflow: handle_feedback

**Trigger:** User says "swap X", "I don't like X", or "find something different"

**Objective:** Replace the specific item with something better, learn from the rejection

## Steps

1. Identify which item is being rejected
2. Analyze the probable rejection reason by comparing the item's attributes to the Style DNA — color? fit? price? brand? Make an informed inference.
3. Call `tools/search_products.js` with modified search terms addressing the inferred rejection reason
4. Score new results via `score_products.md`
5. Present 2-3 alternatives — briefly note what is different ("this one is more relaxed in the fit" / "this one is closer to the earth tones in your wardrobe")
6. Call `tools/update_style_dna.js` to log the rejection signal
