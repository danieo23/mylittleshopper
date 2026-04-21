# Workflow: search_products

**Trigger:** Called after intent is parsed and Style DNA is loaded

**Objective:** Find real products that genuinely match this specific user

## Steps

1. Construct style-aware search queries using the Style DNA for specificity. Not "trousers" — "relaxed fit tapered earth tone trousers." The search terms should read like a description of something already in their wardrobe or boards.
2. Determine which categories to search based on the occasion and what they already own — use `tools/check_outfit_multiplier.js` to see if any existing items can anchor the look, reducing items to buy
3. Run searches via `tools/search_products.js` — one search per category needed
4. For each returned product run `tools/score_product_match.js`
5. Remove any product scoring below 60
6. Sort remaining products by score, keep top 10 per category
7. Pass to `generate_outfits.md`

## Edge Cases

- **Zero results:** broaden one search term (remove most specific modifier), retry once. If still empty, notify user and ask if they want to try a different direction or store.
- **All over budget:** check per-category price flexibility. If none, inform user honestly and suggest which category to prioritize spending on.
