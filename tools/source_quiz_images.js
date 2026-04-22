/**
 * Finds Depop-aesthetic images for every quiz card using the Pexels API.
 * Pexels is free (no search limits), returns clean portrait-style fashion
 * photography from diverse creators worldwide — not store catalogs.
 *
 * For each item:
 *   1. Search Pexels with aesthetic/product-focused terms
 *   2. Filter to portrait-orientation results
 *   3. Take top 3 candidates
 *   4. Use Claude Vision to pick the cleanest, most item-focused one
 *
 * Usage:
 *   ANTHROPIC_API_KEY="sk-ant-..." node tools/source_quiz_images.js
 *   (PEXELS_API_KEY read from .env.local automatically)
 *
 * Get a free Pexels API key at: https://www.pexels.com/api/
 *
 * Outputs: quiz-image-results.json
 */

import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));

// Load .env.local
try {
  const env = readFileSync(join(__dir, '..', '.env.local'), 'utf8');
  for (const line of env.split('\n')) {
    const [k, ...rest] = line.split('=');
    if (k && rest.length) {
      const v = rest.join('=').trim().replace(/^["']|["']$/g, '');
      if (v && !process.env[k.trim()]) process.env[k.trim()] = v;
    }
  }
} catch {}

const PEXELS_KEY    = process.env.PEXELS_API_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

if (!PEXELS_KEY)    { console.error('PEXELS_API_KEY not set — add it to .env.local or get a free key at pexels.com/api'); process.exit(1); }
if (!ANTHROPIC_KEY) { console.error('ANTHROPIC_API_KEY not set'); process.exit(1); }

const client = new Anthropic({ apiKey: ANTHROPIC_KEY });

// ── Search queries: written to find Depop/mirror/product-style shots ──────────
const ITEMS = [
  // BOTTOMS
  { id: 'skinny_jeans',    q: 'skinny jeans fashion outfit' },
  { id: 'straight_jeans',  q: 'straight leg jeans outfit fashion' },
  { id: 'wide_leg',        q: 'wide leg jeans flare pants fashion' },
  { id: 'mom_jeans',       q: 'mom jeans high waist outfit' },
  { id: 'baggy',           q: 'baggy jeans oversized fashion outfit' },
  { id: 'cargo',           q: 'cargo pants utility outfit fashion' },
  { id: 'leggings',        q: 'black leggings outfit fashion' },
  { id: 'trousers',        q: 'tailored trousers dress pants fashion' },
  { id: 'denim_shorts',    q: 'denim shorts fashion outfit summer' },
  { id: 'bike_shorts',     q: 'bike shorts biker shorts fashion outfit' },
  // TOPS
  { id: 'basic_tee',       q: 'white t-shirt basic tee fashion outfit' },
  { id: 'oversized_tee',   q: 'oversized t-shirt fashion outfit' },
  { id: 'crop_top',        q: 'crop top fashion outfit women' },
  { id: 'tank_cami',       q: 'camisole tank top fashion outfit' },
  { id: 'button_down',     q: 'button down shirt fashion outfit women' },
  { id: 'blouse',          q: 'blouse silk flowy fashion outfit women' },
  { id: 'bodysuit',        q: 'bodysuit fashion outfit women' },
  { id: 'off_shoulder',    q: 'off shoulder top fashion women outfit' },
  { id: 'graphic_tee',     q: 'graphic tee t-shirt fashion outfit' },
  { id: 'polo',            q: 'polo shirt collar shirt fashion women' },
  // DRESSES & SKIRTS
  { id: 'mini_dress',      q: 'mini dress fashion women outfit' },
  { id: 'midi_dress',      q: 'midi dress fashion women outfit' },
  { id: 'maxi_dress',      q: 'maxi dress long flowy fashion women' },
  { id: 'mini_skirt',      q: 'mini skirt fashion women outfit' },
  { id: 'midi_skirt',      q: 'midi skirt fashion women outfit' },
  { id: 'maxi_skirt',      q: 'maxi skirt long fashion women outfit' },
  { id: 'slip_dress',      q: 'slip dress satin fashion women outfit' },
  { id: 'wrap_dress',      q: 'wrap dress fashion women outfit' },
  { id: 'denim_skirt',     q: 'denim skirt fashion women outfit' },
  { id: 'tennis_skirt',    q: 'tennis skirt pleated mini fashion women' },
  // OUTERWEAR
  { id: 'oversized_blazer', q: 'oversized blazer fashion women outfit' },
  { id: 'fitted_blazer',   q: 'fitted blazer tailored jacket women fashion' },
  { id: 'leather_jacket',  q: 'leather jacket fashion women outfit' },
  { id: 'denim_jacket',    q: 'denim jacket women fashion outfit' },
  { id: 'trench_coat',     q: 'trench coat women fashion outfit' },
  { id: 'puffer',          q: 'puffer jacket women fashion outfit' },
  { id: 'chunky_cardigan', q: 'chunky knit cardigan oversized women fashion' },
  { id: 'knit_cardigan',   q: 'knit cardigan women fashion outfit' },
  { id: 'hoodie',          q: 'oversized hoodie women fashion outfit' },
  { id: 'bomber',          q: 'bomber jacket women fashion outfit' },
  // SHOES
  { id: 'white_sneakers',  q: 'white sneakers shoes fashion women' },
  { id: 'chunky_sneakers', q: 'chunky platform sneakers shoes fashion' },
  { id: 'athletic',        q: 'running athletic sneakers shoes fashion' },
  { id: 'heeled_boots',    q: 'heeled ankle boots shoes fashion women' },
  { id: 'flat_boots',      q: 'chelsea boots flat ankle boots fashion women' },
  { id: 'knee_high',       q: 'knee high boots fashion women outfit' },
  { id: 'block_heels',     q: 'block heel shoes fashion women' },
  { id: 'strappy_heels',   q: 'strappy heels sandals fashion women' },
  { id: 'loafers',         q: 'loafers ballet flats shoes fashion women' },
  { id: 'sandals',         q: 'sandals mules shoes fashion women' },
  // ACCESSORIES
  { id: 'dainty_jewelry',    q: 'dainty delicate jewelry necklace earrings fashion' },
  { id: 'statement_jewelry', q: 'statement bold jewelry earrings necklace fashion' },
  { id: 'layered_necklaces', q: 'layered necklaces gold jewelry fashion' },
  { id: 'hoop_earrings',     q: 'hoop earrings gold fashion jewelry' },
  { id: 'structured_bag',    q: 'structured handbag top handle satchel fashion' },
  { id: 'crossbody',         q: 'crossbody bag mini shoulder bag fashion' },
  { id: 'tote',              q: 'tote bag fashion women' },
  { id: 'baseball_cap',      q: 'baseball cap hat fashion women outfit' },
  { id: 'sunglasses',        q: 'sunglasses fashion women portrait' },
  { id: 'belt',              q: 'belt waist fashion women outfit' },
];

// ── Pexels search ─────────────────────────────────────────────────────────────
async function search(query) {
  const url = new URL('https://api.pexels.com/v1/search');
  url.searchParams.set('query',       query);
  url.searchParams.set('per_page',    '15');
  url.searchParams.set('orientation', 'portrait');

  const res  = await fetch(url.toString(), {
    headers: { Authorization: PEXELS_KEY },
    signal:  AbortSignal.timeout(10000),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data.photos ?? [];
}

// ── Claude Vision: pick the cleanest image from up to 3 candidates ───────────
async function visionPick(label, urls) {
  if (urls.length === 0) return null;
  if (urls.length === 1) return urls[0];

  const content = [];
  for (let i = 0; i < urls.length; i++) {
    content.push({ type: 'image', source: { type: 'url', url: urls[i] } });
    content.push({ type: 'text',  text: `Image ${i + 1}` });
  }
  content.push({
    type: 'text',
    text: `These are candidate images for a fashion quiz card labeled "${label}".

Pick the BEST one using these criteria in order:
1. "${label}" is unmistakably the HERO — it dominates the frame
2. Clean, simple, or indoor background (plain wall, mirror, studio) — NOT chaotic street or ugly setting
3. Good quality — NOT blurry, dark, or unflattering
4. If a person is shown, they look presentable and the shot is flattering
5. Authentic vibe preferred over generic stock — mirror selfie, flat lay, or editorial model shot is ideal

Reply ONLY with the number: 1, 2, or 3. Nothing else.`,
  });

  try {
    const res = await client.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 5,
      messages:   [{ role: 'user', content }],
    });
    const num = parseInt(res.content[0].text.trim());
    if (num >= 1 && num <= urls.length) return urls[num - 1];
    return urls[0];
  } catch {
    return urls[0];
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const results  = {};
  const failures = [];

  console.log(`Sourcing images for ${ITEMS.length} quiz items...\n`);

  for (const item of ITEMS) {
    process.stdout.write(`  ${item.id.padEnd(22)} `);

    try {
      const photos = await search(item.q);

      // Use src.large (940px wide) — good quality, not too heavy
      const urls = photos
        .filter(p => p.src?.large)
        .map(p => p.src.large)
        .slice(0, 3);

      if (urls.length === 0) {
        console.log(`✗  no results`);
        failures.push(item.id);
        results[item.id] = null;
        continue;
      }

      const best = await visionPick(item.id.replace(/_/g, ' '), urls);
      results[item.id] = best;
      console.log(`✓  picked from ${urls.length} candidates`);

    } catch (err) {
      console.log(`✗  ERROR: ${err.message.slice(0, 80)}`);
      failures.push(item.id);
      results[item.id] = null;
    }

    await new Promise(r => setTimeout(r, 400));
  }

  const outPath = join(__dir, '..', 'quiz-image-results.json');
  writeFileSync(outPath, JSON.stringify(results, null, 2));

  const found = Object.values(results).filter(Boolean).length;
  console.log(`\n✓  ${found}/${ITEMS.length} images found`);
  if (failures.length) console.log(`✗  Failed: ${failures.join(', ')}`);
  console.log(`\nResults saved to quiz-image-results.json`);
  console.log('Next: node tools/apply_quiz_images.js');
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
