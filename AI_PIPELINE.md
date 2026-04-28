# mylilshopper — AI Pipeline Technical Analysis (Updated)

---

## Layer 1 — Simple (Non-Technical)

mylilshopper builds a detailed taste profile for each user by analyzing photos of their wardrobe and Pinterest boards using AI vision — extracting colors, fit preferences, style categories, and formality levels from every image. When a user asks for outfit recommendations, the system translates their taste profile into precise search queries, fetches real products, scores each one against their profile, and assembles outfit options. Every approval, rejection, and swap updates the profile in real time. The key insight is that the system doesn't wait for you to describe your style — it reads it directly from your photos.

As of April 2026, the core pipeline is functional end-to-end. Lychee can take a message like "find me a rooftop dinner fit," research what that event requires, and return scored, filtered product results. However, several subsystems are still stubs, undertested, or actively causing bad recommendations. This document captures both what works and what doesn't.

---

## Layer 2 — Technical Walkthrough

### Step 1: Data Ingestion

Sources:
- **Wardrobe photos** — uploaded via `StyleVault.jsx`, compressed client-side (HEIC→JPEG via heic2any), stored as base64 data URLs in `wardrobe_items.image_url`
- **Pinterest boards** — scraped via `tools/scrape_public_images.js` using three fallback strategies: RSS feed → HTML scrape with JSON-LD extraction → SerpAPI fallback. Pinterest images are proxied to Supabase Storage because the Pinterest CDN blocks bot requests.
- **Onboarding answers** — gender, age range, style tags, sizes, budget tier, store preferences — stored in `style_profiles`
- **Style quiz** — post-onboarding quiz that adds style tags and updates onboarding data
- **User messages** — chat input to `api/agent.js` via POST

**Why base64 everywhere:** Anthropic's inference servers can't reliably reach third-party CDNs (Pinterest, Shopify). `analyzeImageStyle()` always fetches the image itself and converts to base64 before sending to Claude.

---

### Step 2: Feature Extraction — `tools/analyze_image_style.js`

**Model:** Claude Haiku 4.5 (Vision)

Every image — wardrobe or aspiration — runs through a single structured Claude Vision call. The prompt demands a specific JSON schema and explicitly prohibits fabrication (`null` over guessing).

Extracted per image:

```
item_type       → top / bottom / shoes / outerwear / dress / accessory / full_outfit
dominant_colors → [hex, hex, hex]  (sampled from the actual image)
secondary_colors→ [hex, hex]
fit_type        → slim | relaxed | oversized | tailored | fitted | null
fabric          → string or null
formality_score → integer 1–10
style_category  → streetwear | minimalist | smart_casual | coastal | ... | null
brand           → string or null (only if visible)
occasion_suitability → [casual, work, evening, ...]
individual_items→ breakdown array if full_outfit photo
ocr_text        → text visible on garments (brand logos, graphics, slogans)
cultural_signals→ [inferred aesthetic signals, e.g. "anime", "band tee", "streetwear"]
confidence      → high | medium | low
```

Batched in groups of 3 via `Promise.allSettled` in `api/analyze.js`. Results written to `wardrobe_items` or `aspiration_items` in Supabase.

---

### Step 3: Style DNA Synthesis — `tools/synthesize_style_dna.js`

Triggered after every wardrobe or Pinterest analysis batch. Turns a bag of image attributes into a single coherent user profile.

**Algorithm: Recency-Weighted Frequency Counting**

```
weight(item) =
  2.0  if uploaded/analyzed within last 30 days
  1.0  if 30–180 days
  0.5  if older than 180 days
```

| Attribute | Method |
|---|---|
| `primary_colors` | Top 5 by weighted frequency, using `colors[0:2]` per item |
| `secondary_colors` | Top 3, using `colors[2:4]` per item |
| `dominant_fit` | Mode of the weighted fit distribution |
| `fit_consistency_score` | `max_weight / total_weight × 100` |
| `primary_style_category` | Mode of weighted style distribution |
| `formality_range_min/max` | Weighted mean ± 1.5, clamped to [1,10] |
| `brand_affinities` | Top 10 brands by weighted frequency |
| `aspiration_gap` | Style categories in `aspiration_items` NOT present in `wardrobe_items` |
| `overall_confidence_score` | < 20 images = low, 20–50 = medium, 50+ = high |

Result is upserted (not appended) to `style_dna` — one row per user, rebuilt fresh on every synthesis run.

---

### Step 4: Occasion Research — `api/agent.js` (OCCASION_BRIEFS)

**New since original doc.** Before searching, the agent runs the user's message through a static dress-code lookup table — zero latency, no API call.

14 event patterns are covered: rooftop dinner, date night, black tie/gala, cocktail party, wedding, beach/garden wedding, job interview, office/business casual, holiday party, graduation, music festival, golf tournament, red carpet, and art gallery opening.

Each entry contains:
- `formality` (1–10 scale)
- `dresscode` (plain English description)
- `typicalItems` (what to search for)
- `avoidItems` (hard exclusions — mapped to regexes in `fillSlots`)
- `searchTerms` (replaces the bare occasion keyword in search queries)
- `context` (stylist-level reasoning for that event)

When an occasion is recognized, the dress code overrides the user's everyday style defaults when they conflict, and the visual search bonus is zeroed so that wardrobe-lookalike results don't win over occasion-appropriate ones.

---

### Step 5: The Slot-Based Shopping Engine — `api/agent.js`

**New since original doc.** Replaces the old fully-agentic approach for specific item requests.

When a user names specific items ("2 graphic tees and a pair of chinos"), the message is parsed into typed **slots** by `parseRequestSlots()`. Each slot carries: a category, a label, slot-specific search keywords, and modifiers that shape the search query.

Defined slot types: graphic tee, band tee, short sleeve, button-down, polo, tank top, linen shirt, oversized tee, generic top, cargo pants, baggy jeans, straight jeans, slim jeans, chinos, shorts, trousers, sweatpants, generic jeans, sneakers, boots, sandals, loafers, flannel, hoodie, jacket, cardigan.

For vague/open requests ("find me a rooftop dinner fit"), the slot engine generates a full-coverage set via `buildWardrobeRedoSlots()` — one slot per major category, all in show_options mode.

`fillSlots()` then executes each slot group in parallel:

1. A style-aware query is built from DNA (fit + color + style + occasion research terms)
2. Visual search (SerpAPI Lens) and 1–3 text searches run simultaneously via `Promise.all`, each capped with hard timeouts (6s for visual, 12s for text)
3. Results are merged, deduplicated, hard-filtered for wrong categories, filtered for occasion avoidItems, and filtered against the wardrobe OCR blocklist
4. Products are scored and semantically deduped (no 4× Superman shirts)
5. The top pool is assigned to the slot for `buildShoppingBoard()` to pick from

---

### Step 6: Product Search — `tools/search_products.js`

**Significantly changed since original doc.** Now uses a brand-first pipeline instead of raw SerpAPI keyword search.

**Stage 1 — Style Brief:** Builds a compact text summary of the user's DNA (aesthetic, fit, palette, OCR signals, cultural signals, recommended brands).

**Stage 2 — Brand Selection:** Claude Haiku receives the style brief and selects 1–3 specific brands whose catalog would have the highest density of matching items. Formality is enforced here: if the occasion is elevated (≥6/10), streetwear/skate brands are excluded from selection even if they appear in wardrobe affinities.

**Stage 3 — Shopify Catalog:** For each selected brand, the pipeline tries to fetch directly from the brand's Shopify JSON endpoint (`/collections/{slug}/products.json`). Multiple collection slugs are tried in parallel; the first non-empty response wins. Returns structured product data including all images.

**Stage 4 — Brand Web Search Fallback:** If Shopify returns fewer than 3 products, a web search targeted at the brand's domain runs as a fallback. Capped at 9s.

**Stage 5 — Generic Web Search Fallback:** If the brand pipeline yields fewer than 5 products total, a generic web search runs against the full style-enriched query. Capped at 9s.

All sources feed through `hardCategoryFilter()` which blocks wrong-category items (pants in a tops slot, etc.) before returning.

---

### Step 7: Product Scoring — `tools/score_product_match.js`

Pure, synchronous, rule-based linear additive model. Baseline: **50**.

| Signal | Condition | Delta |
|---|---|---|
| Color | Primary palette match | +25 |
| Color | Secondary palette match | +15 |
| Color | Avoided color | −40 |
| Fit | Matches dominant fit | +20 |
| Fit | In rejected fits | −35 |
| Style | Primary category match | +20 |
| Style | Secondary category match | +10 |
| Brand | In affinity list | +10 |
| Brand | In rejection list | −20 |
| Price | Within 1.2× typical spend | +10 |
| Price | Over 2× typical spend | −20 |

Color comparison uses `hexToBucket()` (HSV-based, ~20 named color buckets) to compare DNA hex values against product title color words. Fit and style are inferred from product title via `inferFit()` / `inferStyle()` regex. Score ≥ 60 passes; score ≥ 85 = high-confidence. If fewer than 3 products pass 60, the top-scored are returned anyway.

---

### Step 8: Outfit Assembly — `tools/build_outfits.js`

**Model:** Claude Haiku 4.5 (text only)

Claude receives the user's Style DNA context and a text summary of scored products. It reasons about 3 outfit combinations subject to hard constraints: minimum top + bottom + shoes, total price ≤ budget, distinct color story per outfit, formality coherence, and at least one addressing the aspiration gap.

Claude returns a JSON array. The function does fuzzy product matching to re-link Claude's named items back to full product objects (which have `image_url`, `product_url`, etc.). Each resolved product is run through `checkOutfitMultiplier()` to compute how many existing wardrobe items it pairs with — becomes the `wardrobe_multiplier` score shown in the UI.

For slot-engine requests (specific item asks), outfit assembly is bypassed — `buildShoppingBoard()` constructs the card deterministically without Claude, which is faster and eliminates a full LLM round-trip.

---

### Step 9: The Agentic Loop — `api/agent.js`

**Model:** Claude Haiku 4.5
**Max turns:** 4

Available tools:
- `search_products` — calls SerpAPI brand pipeline + scorer
- `get_inspo_products` — retrieves shoppable matches from saved Pinterest pins via SerpAPI Lens
- `create_order` — wallet check + order record
- `update_style_dna` — logs feedback signal

The system prompt embeds the complete Style DNA as text — no tool call needed to fetch the profile. The slot engine runs before the agentic loop when specific items are detected; for vague/occasion-based requests, the agentic loop drives search.

Tool choice enforcement: after search results exist but before outfits are built, Claude is forced to call a tool (prevents text replies mid-pipeline).

**Refinement pipeline** (`tools/refine_search.js`): When the user rejects results and gives feedback ("too formal", "more color", "different fit"), `comprehendFeedback()` parses the feedback into a structured `RefinementPlan` with fit overrides, color overrides, query additions/removals, and negative keywords. The slots are re-searched with the plan applied. `verifyRefinement()` deterministically checks that the constraints were satisfied.

---

### Step 10: Feedback Loop — `tools/update_style_dna.js`

| Signal | What gets written |
|---|---|
| `approval` | Brand added to `brand_affinities`; price updates `per_category_price_sensitivity` via weighted average `(existing × 2 + new) / 3`; approved style added to secondary categories |
| `rejection` | Rejection frequency counted per brand/fit/style/color; after 2 dislikes on same attribute → promoted to `explicit_dislikes` / `avoided_colors`; after 3 brand dislikes → `brand_rejections` |
| `post_delivery_positive` | Same as approval (2× weight declared but not applied — see Known Issues) |
| `swap` | **No-op** (see Known Issues) |

`_promoteConfirmedPreferences()` scans all rejection/swap signals. Any fit rejected ≥ 3 times is promoted to `explicit_dislikes.fits` as a confirmed preference.

---

## Layer 3 — Algorithms and Design Decisions

### Slot engine vs. fully agentic loop

The original design used Claude to both decide what to search and execute the searches. This created two problems: Claude would sometimes choose the wrong categories, and tool calls were sequential (turn 1: decide; turn 2: search; turn 3: build outfits = 3 LLM round-trips minimum). The slot engine replaces Claude's "what to search" decision with deterministic regex parsing for explicit requests, cutting 1–2 round-trips from the hot path.

### Static occasion lookup vs. dynamic research

The first implementation called Claude Haiku for occasion research before searching. Latency: 2–6 seconds, synchronous, on every named-event request. The second implementation added a 6-second `Promise.race` cap — still caused timeouts because the cap itself consumed budget from the function's total time. The final implementation replaced everything with a static lookup table: zero latency, zero API cost, zero failure surface. 14 event types cover ~90% of real-world occasion requests.

### Brand-first search pipeline

Raw SerpAPI keyword search returns generic results from Amazon, Walmart, and discount retailers regardless of brand signal. The brand-first pipeline forces all search results to come from brands whose aesthetic actually matches the user's DNA — the brand selection step is the intelligence layer. Shopify catalog fetch is preferred over web search because it returns clean structured data with proper image arrays.

### Hard timeouts everywhere

Every external call now has a `Promise.race` cap:
- Visual search (SerpAPI Lens): 6s
- Text search (each `searchProducts` call): 12s
- Web search calls within `search_products.js`: 9s

Without these, a single slow Anthropic response or SerpAPI timeout would hang the entire `Promise.all` in `fillSlots`, causing Vercel to kill the function after 60s and return an HTML error page that the frontend's `JSON.parse` interprets as "The request timed out."

### Recency-weighted frequency counting (synthesize_style_dna)

Step-function decay (2.0 / 1.0 / 0.5) rather than exponential. Appropriate because data is sparse (<50 items for most users), step-functions are interpretable and debuggable, and the 30-day / 180-day boundaries map to seasonal fashion transitions.

Tradeoff: Step-functions create discontinuities. An item uploaded 29 days ago weights 4× more than one uploaded 31 days ago — DNA can shift sharply around boundaries if upload dates cluster at those edges.

### Linear additive scoring

Deliberately not a learned model. No labeled training data exists yet. The `breakdown` array provides full explainability for every score, which feeds the agent's natural-language justifications. Max theoretical: 150, clamped to 100. Baseline 50 keeps products in the "maybe" range even with zero attribute matches, preventing the fallback from triggering too aggressively.

---

## What Isn't Working — Known Issues

This section describes problems that exist in production today, ranked roughly by user impact.

### 1. Budget is never asked

**Impact:** High. Every recommendation.

Lychee uses the user's wallet balance as a budget proxy when no budget is stated. If the wallet has $0 (common for new users), `maxPrice` is `undefined` or 0, which causes the search and scoring pipeline to skip price filtering entirely — any price can be returned. If the wallet has $500, Lychee may search as if the user is willing to spend $500 on a single item.

The correct behavior: ask the user for a budget before searching if one isn't stated, and never assume wallet balance = intended spend.

**Root cause:** `runAgent()` parses `maxPrice` from the user message and falls back to `wallet.balance`. There is no gate that says "if budget is unknown, ask."

**Fix required:** Add budget to the intent-parsing checklist and ask for it when missing, regardless of confidence level.

---

### 2. Brand monoculture — all items from one store

**Impact:** High. Every multi-item recommendation.

The brand-first pipeline in `search_products.js` selects 1–3 brands per search call, and the agent makes one search call per category. With 3 categories (tops, bottoms, shoes) and 1–2 brands selected per category, the user can easily receive an entire outfit from Stüssy (or whatever brand is top of their `brand_affinities` list), even if they only own one Stüssy item.

The correct behavior: mix brands across categories. A shirt from one brand, trousers from another, shoes from a third.

**Root cause:** `selectBrands` selects independently per category with no cross-category deduplication. The agent has no instruction to diversify brands across categories.

**Fix required:** Pass previously selected brands as an exclusion list into each subsequent `selectBrands` call, or enforce brand diversity at the `buildShoppingBoard` / `buildOutfits` level.

---

### 3. Swap signal is a documented no-op

**Impact:** High. Every swap interaction.

`update_style_dna.js` has a `swap` handler that logs the signal and does nothing else. The comment in the original code literally says `// [nothing happens]`. A swap is the strongest signal in the system — the user simultaneously rejected one item and approved another, giving a precise directional preference vector.

**Root cause:** The handler was scaffolded but never implemented.

**Fix required:** When `signalType === 'swap'` and `swapTarget` is present, compute the attribute delta between the rejected item and the chosen item, and write the `swapTarget` attributes as positive signals (mirror the approval logic).

---

### 4. `post_delivery_positive` weight declared but not applied

**Impact:** Medium. Post-delivery feedback is the strongest signal and should carry 2× weight, but currently applies the same weight as a regular approval.

**Root cause:** In `update_style_dna.js`: `const weight = signalType === 'post_delivery_positive' ? 2 : 1;` — the `weight` variable is computed but never used in the writes that follow.

**Fix required:** Apply `weight` as a multiplier when updating `per_category_price_sensitivity` and when counting toward threshold promotions.

---

### 5. `selectBrands` has no timeout

**Impact:** Medium. Can cause pipeline hangs.

Every call to `searchProducts()` first calls `selectBrands()`, which is a full Anthropic API call with the Anthropic client's 60s timeout. With 3 parallel category searches, 3 simultaneous `selectBrands` calls can each hang for up to 60s before the 12s `cap()` wrapper in `fillSlots` applies — because `selectBrands` runs inside `searchProducts`, which is what `cap()` wraps. In practice, the 12s cap does catch this, but there's a window where Anthropic is slow and the cap doesn't fire in time.

**Fix required:** Add an explicit timeout to the `selectBrands` Anthropic call (e.g., `AbortSignal.timeout(8000)` on the request, or a `Promise.race` around the entire function).

---

### 6. Aspiration gap is a set membership check, not a magnitude check

**Impact:** Medium. A user with 50 coastal aspiration items and 1 coastal wardrobe item shows no coastal aspiration gap — the single wardrobe item closes the set membership check entirely, even though they clearly want much more coastal content.

**Root cause:** `synthesize_style_dna.js` computes `aspiration_gap` as style categories in `aspiration_items` that are NOT in `wardrobe_items` at all (set difference). Relative magnitude is ignored.

**Fix required:** Replace set difference with a ratio check: if aspiration frequency for a style is ≥ 3× its wardrobe frequency, include it in the gap even if the user owns one piece.

---

### 7. Product attributes are title-inferred, not image-analyzed

**Impact:** Medium. Every product scoring run.

SerpAPI products arrive with `colors: null`, `fit_type: null`, `style_category: null`. All three are inferred by regex from the product title. A product titled "Women's Item - Sand/Multi" defeats all inference and scores at baseline (50). A product titled "Men's Relaxed Fit Chino" scores correctly. This is the weakest link in the scoring pipeline — the quality of scoring is entirely dependent on how descriptive the product title is.

**Fix required:** Async background job: for each new product thumbnail, run `analyzeImageStyle()` and cache the result in a `product_embeddings` table with a 7-day TTL. Use real attributes for scoring on cache hit.

---

### 8. "Similar to previously approved / rejected" scoring factors are placeholder zeros

**Impact:** Medium. Two scoring factors that never fire.

The scoring table includes `+15` for "similar to previously approved items" and `−30` for "similar to previously rejected items." Neither has an implementation. The weights are in the table but the code that would compute visual or attribute similarity to prior approvals/rejections does not exist.

**Fix required:** Either implement CLIP embedding similarity (pgvector in Supabase) or implement attribute-level similarity against `feedback_signals` rows. The latter is simpler and delivers most of the value.

---

### 9. Wardrobe OCR blocklist uses generic word exclusion that may miss real proper nouns

**Impact:** Low-medium. Occasionally allows already-owned items into results.

The OCR blocklist extracts words ≥5 characters from wardrobe `ocr_text` and `cultural_signals` to block products whose names contain those terms. The `GENERIC_OCR_WORDS` exclusion set is static and may miss short proper nouns (e.g. a 4-character brand or character name) or allow short generic words through.

**Fix required:** Lower the character threshold to 4 and expand the generic word set, or switch to noun phrase extraction rather than word-by-word.

---

### 10. No budget asked after onboarding — wallet is not a budget

**Impact:** Structural. See Issue 1 for details.

This deserves a second mention because it affects every search. The profile has `per_category_price_sensitivity` (what the user typically spends per category, derived from approvals), but this is only populated after the user has approved priced items. For new users it's empty, so `maxPrice` defaults to the wallet balance or undefined. This means Lychee has no concept of what the user is willing to spend on *this specific request* until they've told it directly.

---

## Bottlenecks and Scaling Concerns

**1. Image analysis throughput**
`api/analyze.js` batches in groups of 3. With 50 wardrobe photos: 17 sequential batches × ~1.5s = ~25s latency. Haiku is the right model choice, but the sequential batch structure is the bottleneck at higher image counts.

**2. Brand selection per search category**
Each `searchProducts()` call makes one Anthropic API call for brand selection. With 3 parallel category searches, that's 3 simultaneous Haiku calls on top of the Lens call and the actual product fetch calls. At scale this amplifies API costs significantly.

**3. Vercel function limits**
`api/agent.js` has `maxDuration: 300`. The agentic loop with 4 turns, 3 parallel brand selections, 3 Shopify fetches, and 3 web search fallbacks can in theory take 120s+. The function is not approaching Vercel's limit today, but the chain of external calls creates meaningful timeout risk.

**4. SerpAPI rate limits and latency**
Google Shopping searches average 2–4s per query. SerpAPI Lens calls add another 2–3s. With 3 parallel category searches each potentially hitting Lens + 2 text queries, the search step alone is 3–5s. At scale, SerpAPI plan limits become a hard ceiling on concurrent users.

**5. Style DNA full recompute on every synthesis**
`synthesize_style_dna.js` fetches all wardrobe and aspiration items and recomputes everything. O(n) in item count, synchronous in `api/analyze.js` request path. At hundreds of items per user this becomes the primary latency in the analysis flow — should become a background job.

---

## Assumptions in the Pipeline

1. **Claude Vision hex codes are accurate.** Claude approximates colors — they are not ground-truth samples. The pipeline treats them as authoritative.

2. **Product titles contain style signals.** `inferFit` and `inferStyle` regex patterns assume descriptive English product titles. Ambiguous or coded titles ("Item #38291 - W") produce null inference and reduce scoring accuracy.

3. **SerpAPI products are in-stock.** The search tool filters on price validity but not stock availability. Out-of-stock items can reach the outfit builder.

4. **Aspiration gap is correctly computed.** As noted in Known Issues, the set-membership approach misses cases where the user aspires to much more of a category they already own a small amount of.

5. **Feedback signals are correctly attributed.** If the agent misidentifies which item was rejected, the wrong attributes get penalized permanently.

6. **Wallet balance approximates budget.** This assumption is wrong for most real users (see Known Issue 1).

---

## Potential Failure Points

| Failure | Impact | Current Mitigation |
|---|---|---|
| Claude returns malformed JSON from image analysis | Item skipped, no attributes written | `skip_reason` field + try/catch in analyze loop |
| SerpAPI returns no results | Empty outfit result | Agent instructed to broaden query and retry once |
| Pinterest board is private | Analysis fails silently | Scraper returns explicit error state, agent surfaces it |
| `build_outfits` fuzzy match fails | Item dropped from outfit (product shows as null) | `.filter(i => i.product)` removes unresolved items |
| MAX_TURNS hit mid-pipeline | User gets a partial/fallback response | Recovery call closes pending `tool_use` blocks, forces text reply |
| `selectBrands` Anthropic call hangs | `searchProducts` stalls up to 12s | 12s cap in `fillSlots` wrapping `searchProducts` |
| `webSearchForBrand` / `genericWebSearch` hangs | Search stalls | 9s `capWebSearch` wrapper in `search_products.js` |
| Visual search (SerpAPI Lens) hangs | Lens slot stalls | 6s cap in `fillSlots` wrapping `visualSearchForSlot` |
| base64→Supabase Storage upload hangs inside `ensurePublicUrl` | Visual search stalls | 6s cap catches the entire `visualSearchForSlot` call |
| Swap signal written but ignored | DNA doesn't learn from swaps | **None — known issue** |
| Budget unknown, wallet used as proxy | Wrong price filtering | **None — known issue** |
| Brand monoculture across categories | Entire outfit from one brand | Formality filtering removes worst cases; **full fix pending** |

---

## Improve This System — Ordered by ROI

### 1. Ask for budget always (High impact / Low effort — 1 hour)

The simplest and highest-impact fix. Add `budget` to the intent-parsing checklist in the system prompt. If the user's message doesn't contain a budget and `per_category_price_sensitivity` is empty, ask one budget question before searching. This affects every recommendation made to every user.

### 2. Enforce brand diversity across categories (High impact / Low effort — 2 hours)

In `fillSlots`, maintain a `usedBrands` set. After each slot group's brand selection, add the selected brands to `usedBrands` and pass it as an exclusion list to subsequent `selectBrands` calls. Prevents the entire outfit from coming from one store.

### 3. Fix the swap signal handler (High impact / Low effort — 4 hours)

The swap handler in `update_style_dna.js` is a documented no-op. A swap is the strongest signal in the system. Adding `swapTarget` attribute writes mirrors the approval logic and immediately improves recommendation quality for every user who has ever swapped.

### 4. CIE76 Delta-E color distance (High impact / Low effort — 1 day)

Replace `hexToBucket()` comparison with perceptual color distance. Current bucket system collapses hundreds of distinct shades into ~20 names. Delta-E < 5 = visually indistinguishable; > 25 = clearly different. Implementation is ~20 lines of pure math, no dependencies, no API calls.

### 5. Apply `post_delivery_positive` 2× weight (Medium impact / Low effort — 30 minutes)

The `weight` variable is computed but never used in `update_style_dna.js`. Applying it as a multiplier to the price sensitivity update and threshold promotion counts takes under an hour.

### 6. `selectBrands` timeout (Medium impact / Low effort — 30 minutes)

Add a `Promise.race` cap (e.g. 7s) around the `selectBrands` Anthropic call inside `searchProducts.js`. If it times out, fall back to returning an empty brand list and letting generic web search handle the slot.

### 7. Aspiration gap magnitude check (Medium impact / Low effort — 2 hours)

Replace the set difference check in `synthesize_style_dna.js` with a ratio check: if aspiration frequency ≥ 3× wardrobe frequency for a style category, include it in the gap. This makes the gap signal meaningful for users who own a little of something they want much more of.

### 8. Async product image re-analysis (High impact / Medium effort — 1 week)

SerpAPI products arrive with `colors: null`, `fit_type: null`, `style_category: null`. Build an async background job that for each new product seen: fetches the thumbnail, runs `analyzeImageStyle()`, caches the result in a `product_embeddings` table with a 7-day TTL. Cache hit rate will be high — Google Shopping frequently returns the same product across different queries.

### 9. CLIP embeddings + pgvector for visual similarity (Very high impact / High effort — 2 weeks)

The "similar to previously approved" and "similar to previously rejected" scoring factors (+15/−30) have no implementation. Implementing them requires: enabling pgvector in Supabase, generating CLIP embeddings for wardrobe items on analysis (`@xenova/transformers` runs in Vercel serverless at zero API cost), generating embeddings for product thumbnails at search time, and cosine similarity query for top-k wardrobe neighbors per product. This activates the most powerful potential signal in the system.

### 10. Temporal decay for negative signals (Medium impact / Medium effort — 1 day + schema migration)

Rejected colors and fits accumulate forever with no expiry. A color rejected in winter may be acceptable in summer. Add `signal_weight float` to `feedback_signals`. Recompute avoided attributes at write time using: `weight = max(0.1, 1.0 - days_since_signal / 180)`. This converts the hard binary penalty system into a continuous decay.

---

## Why Lychee Isn't Fully Functional Yet — Summary

Lychee can search, score, and return results. The pipeline runs end-to-end. But it doesn't yet behave like a personal shopper because three things are missing:

**1. It doesn't know your budget.** A personal shopper always knows what you can spend before showing you anything. Lychee guesses from your wallet, which is wrong. Until budget collection is in the intent-parsing flow, every recommendation is happening without the most basic constraint a shopper needs.

**2. It doesn't learn from swaps.** Swapping an item is the most signal-rich action a user can take — it's a simultaneous rejection and approval. The swap handler doesn't write anything to the DNA. Every swap is learning that's being thrown away.

**3. The brand diversity problem means outfits can look like a uniform.** If a user owns one Stüssy shirt, all three search results might come from Stüssy. A real stylist would never dress you head to toe in one brand without a specific reason.

Everything else — occasion research, slot engine, OCR blocklists, avoidItems filtering, formality-aware brand selection, hard timeouts — is working. The system is fast, it doesn't time out, and it understands dress codes. It just needs budget awareness, swap learning, and brand diversification before it can be called genuinely personal.
