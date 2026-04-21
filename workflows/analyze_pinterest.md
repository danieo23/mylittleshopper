# Workflow: analyze_pinterest

**Trigger:** User pastes a Pinterest board URL

**Objective:** Extract aspiration signals from every pin, identify the gap between what they have and what they want

## Steps

1. Call `tools/scrape_public_images.js` with the board URL
2. If board is private: stop immediately, ask user to make it public or upload screenshots instead
3. If fewer than 10 images fetched: flag low confidence, inform user, proceed but note Pinterest data is sparse
4. For each fetched image call `tools/analyze_image_style.js` — same attribute extraction as wardrobe but tagged as "aspiration" not "owned"
5. Identify recurring patterns: dominant style categories, colors, outfit structures, occasions
6. Identify brands that appear in 3+ pins — strong affinity signals
7. Call `tools/synthesize_style_dna.js` to integrate aspiration data alongside wardrobe data
8. Calculate aspiration gap: attributes present in pins but absent or rare in wardrobe — write to Style DNA as `aspiration_gap`
9. Return a summary: pins analyzed, dominant aesthetic, top colors, what the gap reveals

## Edge Cases

- **404 or failed images:** skip gracefully, note count of successful vs failed
- **Hundreds of pins:** analyze up to 100 most recent, note a sample was used
- **No clear pattern:** note low style consistency, inform user, ask if they want to identify a specific direction
