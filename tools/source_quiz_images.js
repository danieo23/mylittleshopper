/**
 * Sources flat-lay / product-photography images for every quiz card using Pexels.
 * Goal: item-only shots on clean/white/minimal backgrounds — no people, no street,
 * no lifestyle. Think ASOS product page or a clean flat lay.
 *
 * For each item:
 *   1. Search Pexels with flat-lay / product-photography focused terms
 *   2. Take top 5 candidates (any orientation — flat lays are often square)
 *   3. Use Claude Vision to pick the one with NO person, cleanest background,
 *      item filling the frame
 *
 * Usage:
 *   node tools/source_quiz_images.js
 *   (reads ANTHROPIC_API_KEY + PEXELS_API_KEY from .env.local)
 *
 * Outputs: quiz-image-results.json
 */

import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));

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

if (!PEXELS_KEY)    { console.error('PEXELS_API_KEY not set'); process.exit(1); }
if (!ANTHROPIC_KEY) { console.error('ANTHROPIC_API_KEY not set'); process.exit(1); }

const client = new Anthropic({ apiKey: ANTHROPIC_KEY });

// Queries written to find flat-lay / product-only shots, not lifestyle/model photos
const ITEMS = [
  // BOTTOMS
  { id: 'skinny_jeans',    q: 'skinny jeans flat lay white background denim' },
  { id: 'straight_jeans',  q: 'straight leg jeans flat lay white background denim' },
  { id: 'wide_leg',        q: 'wide leg flare jeans flat lay white background' },
  { id: 'mom_jeans',       q: 'mom jeans high waist flat lay denim' },
  { id: 'baggy',           q: 'baggy jeans flat lay white background denim' },
  { id: 'cargo',           q: 'cargo pants flat lay white background' },
  { id: 'leggings',        q: 'black leggings flat lay product photography' },
  { id: 'trousers',        q: 'tailored trousers flat lay white background' },
  { id: 'denim_shorts',    q: 'denim shorts flat lay white background' },
  { id: 'bike_shorts',     q: 'bike shorts flat lay product photography' },
  // TOPS
  { id: 'basic_tee',       q: 'white t-shirt flat lay product photography minimal' },
  { id: 'oversized_tee',   q: 'oversized t-shirt flat lay white background' },
  { id: 'crop_top',        q: 'crop top flat lay white background fashion' },
  { id: 'tank_cami',       q: 'camisole tank top flat lay white background' },
  { id: 'button_down',     q: 'button down shirt flat lay white background' },
  { id: 'blouse',          q: 'silk blouse flat lay white background fashion' },
  { id: 'bodysuit',        q: 'bodysuit flat lay white background fashion' },
  { id: 'off_shoulder',    q: 'off shoulder top flat lay white background' },
  { id: 'graphic_tee',     q: 'graphic t-shirt flat lay white background' },
  { id: 'polo',            q: 'polo shirt flat lay product photography white background' },
  // DRESSES & SKIRTS
  { id: 'mini_dress',      q: 'mini dress flat lay white background fashion' },
  { id: 'midi_dress',      q: 'midi dress flat lay product photography' },
  { id: 'maxi_dress',      q: 'maxi dress long flat lay white background' },
  { id: 'mini_skirt',      q: 'mini skirt flat lay white background' },
  { id: 'midi_skirt',      q: 'midi skirt flat lay white background fashion' },
  { id: 'maxi_skirt',      q: 'maxi skirt long flat lay product' },
  { id: 'slip_dress',      q: 'slip dress satin flat lay white background' },
  { id: 'wrap_dress',      q: 'wrap dress flat lay white background fashion' },
  { id: 'denim_skirt',     q: 'denim skirt flat lay white background' },
  { id: 'tennis_skirt',    q: 'tennis skirt pleated flat lay white background' },
  // OUTERWEAR
  { id: 'oversized_blazer', q: 'oversized blazer flat lay white background fashion' },
  { id: 'fitted_blazer',   q: 'fitted blazer jacket flat lay white background' },
  { id: 'leather_jacket',  q: 'leather jacket flat lay white background' },
  { id: 'denim_jacket',    q: 'denim jacket flat lay white background' },
  { id: 'trench_coat',     q: 'trench coat flat lay white background fashion' },
  { id: 'puffer',          q: 'puffer jacket flat lay white background' },
  { id: 'chunky_cardigan', q: 'chunky knit cardigan flat lay white background' },
  { id: 'knit_cardigan',   q: 'knit cardigan flat lay white background fashion' },
  { id: 'hoodie',          q: 'hoodie sweatshirt flat lay white background' },
  { id: 'bomber',          q: 'bomber jacket flat lay white background' },
  // SHOES
  { id: 'white_sneakers',  q: 'white sneakers shoes product photography white background' },
  { id: 'chunky_sneakers', q: 'chunky platform sneakers shoes product photography' },
  { id: 'athletic',        q: 'running athletic sneakers shoes product photography white' },
  { id: 'heeled_boots',    q: 'heeled ankle boots shoes product photography white background' },
  { id: 'flat_boots',      q: 'chelsea boots ankle boots shoes product photography' },
  { id: 'knee_high',       q: 'knee high boots shoes product photography white background' },
  { id: 'block_heels',     q: 'block heel shoes product photography white background' },
  { id: 'strappy_heels',   q: 'strappy heels sandals shoes product photography white' },
  { id: 'loafers',         q: 'loafers shoes product photography white background' },
  { id: 'sandals',         q: 'sandals mules shoes product photography white background' },
  // ACCESSORIES
  { id: 'dainty_jewelry',    q: 'dainty delicate jewelry necklace earrings flat lay white' },
  { id: 'statement_jewelry', q: 'statement bold jewelry earrings flat lay white background' },
  { id: 'layered_necklaces', q: 'layered gold necklaces jewelry flat lay white background' },
  { id: 'hoop_earrings',     q: 'hoop earrings gold jewelry flat lay white background' },
  { id: 'structured_bag',    q: 'structured handbag satchel product photography white background' },
  { id: 'crossbody',         q: 'crossbody bag mini shoulder bag product photography white' },
  { id: 'tote',              q: 'tote bag product photography white background' },
  { id: 'baseball_cap',      q: 'baseball cap hat product photography white background' },
  { id: 'sunglasses',        q: 'sunglasses product photography white background minimal' },
  { id: 'belt',              q: 'leather belt product photography white background' },
];

async function search(query) {
  const url = new URL('https://api.pexels.com/v1/search');
  url.searchParams.set('query',    query);
  url.searchParams.set('per_page', '20');

  const res  = await fetch(url.toString(), {
    headers: { Authorization: PEXELS_KEY },
    signal:  AbortSignal.timeout(10000),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data.photos ?? [];
}

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
    text: `These are candidate images for a fashion style quiz card labeled "${label}".

The quiz is trying to look like a clean, professional product-photography style quiz (think ASOS product page or a styled flat lay).

Pick the BEST image using these criteria strictly in order:

1. NO FULL PERSON visible — item only, flat lay, on a hanger, ghost mannequin, or just hands/partial detail. A photo showing a complete person's face or body in a real-world setting is the WORST choice.
2. White, off-white, or very minimal/clean background — no street scenes, no outdoor locations, no busy environments.
3. "${label}" is the clear hero — it fills the frame and is immediately identifiable.
4. Sharp, well-lit, high-quality — not dark, blurry, or low-res.
5. Looks like professional product or editorial photography — not a casual snapshot.

If ALL images show full people, pick the one with the cleanest background and most item-focused composition.

Reply ONLY with the number (1 through ${urls.length}). Nothing else.`,
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

async function main() {
  const results  = {};
  const failures = [];

  console.log(`Sourcing flat-lay / product images for ${ITEMS.length} quiz items...\n`);

  for (const item of ITEMS) {
    process.stdout.write(`  ${item.id.padEnd(22)} `);

    try {
      const photos = await search(item.q);

      const urls = photos
        .filter(p => p.src?.large)
        .map(p => p.src.large)
        .slice(0, 5);

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
