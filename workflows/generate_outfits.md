# Workflow: generate_outfits

**Trigger:** Called after products are scored and filtered

**Objective:** Assemble complete, cohesive, personally relevant outfit sets

## Steps

1. Take top-scored products per category
2. Run outfit assembly via `tools/build_outfits.js`
3. Rules for every outfit:
   - Must include minimum: top + bottom + shoes
   - Total price must fit within budget
   - Items must be internally coherent — do not mix formality levels beyond what their Style DNA shows they actually do
   - Each outfit should have a different color story where possible
   - At least one outfit should directly address the aspiration gap if relevant
4. Run each completed outfit through `tools/check_outfit_multiplier.js` — verify each new item pairs with at least 2 things they already own. If not, flag it and consider swapping.
5. For each outfit write a one-sentence style note referencing their actual profile — never generic ("this matches the relaxed earth tone palette that runs through most of your wardrobe")
6. Build minimum 3 outfit options, maximum 5
7. Return structured outfit JSON for the frontend to render as cards
