# Workflow: parse_user_intent

**Trigger:** User sends any message in the chat

**Objective:** Understand exactly what they need before doing anything else

## Steps

1. Fetch the user's full Style DNA and profile via `tools/get_user_profile.js`
2. Parse the message for: occasion, style direction, specific items, budget (fall back to their default if not stated), timeframe, constraints (weather, dress code, existing item to build around)
3. Assess prompt clarity:
   - **Clear** (occasion + style + budget): proceed directly to `search_products.md`
   - **Partially clear** (occasion but no style): use Style DNA to fill the gap, proceed
   - **Vague** ("I need something to wear"): ask ONE targeted clarifying question based on their profile — not generic, specific. ("You've got an Italy trip coming up — is that what this is for, or something else?")
   - **Impossible budget**: go to `handle_edge_cases.md`
   - **Contradictory signals**: use Style DNA as tiebreaker, state your interpretation before searching

## Rules

- Never ask more than one clarifying question at a time
- Never ask something that can be inferred from their Style DNA
