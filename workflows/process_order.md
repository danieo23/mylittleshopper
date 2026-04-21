# Workflow: process_order

**Trigger:** User confirms they want to purchase

## Steps

1. Fetch wallet balance from Supabase
2. **If balance insufficient:** inform user of shortfall, show current balance, link to wallet top-up. Do not proceed.
3. **If sufficient:** create order record in `orders` table with all item details, prices, stores, and outfit context
4. Deduct total from wallet balance
5. Write the approved outfit to user's history as a strong positive training signal via `tools/update_style_dna.js`
6. Schedule post-delivery follow-up: 7 days after order date, send a message asking how items landed
7. Return confirmation with order summary
