/**
 * Sources product-photography images for every quiz card using SerpAPI Google Images.
 * Google Images returns actual retailer product pages (ASOS, Zara, H&M, Nordstrom)
 * so the images are clean product shots — not stock photo mis-tags.
 *
 * Two-step Vision process:
 *   1. Pick the best candidate from top 5 results
 *   2. VERIFY: "Is this actually a [label]?" — YES/NO gate before saving
 *      Items that fail all candidates are flagged, never silently saved wrong.
 *
 * Usage:
 *   node tools/source_quiz_images.js
 *   (reads ANTHROPIC_API_KEY + SHOPPING_API_KEY from .env.local)
 *
 * Outputs: quiz-image-results.json
 * Credits used: ~60 SerpAPI searches (1 per item)
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

const SERP_KEY      = process.env.SHOPPING_API_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

if (!SERP_KEY)      { console.error('SHOPPING_API_KEY not set'); process.exit(1); }
if (!ANTHROPIC_KEY) { console.error('ANTHROPIC_API_KEY not set'); process.exit(1); }

const client = new Anthropic({ apiKey: ANTHROPIC_KEY });

// Queries optimised for retailer product photography results
const ITEMS = [
  // BOTTOMS
  { id: 'skinny_jeans',    q: 'women skinny jeans product photo white background' },
  { id: 'straight_jeans',  q: 'women straight leg jeans product photo white background' },
  { id: 'wide_leg',        q: 'women wide leg flare jeans product photo' },
  { id: 'mom_jeans',       q: 'women mom jeans high waist product photo' },
  { id: 'baggy',           q: 'women baggy relaxed jeans product photo' },
  { id: 'cargo',           q: 'women cargo pants utility trousers product photo' },
  { id: 'leggings',        q: 'women black leggings product photo white background' },
  { id: 'trousers',        q: 'women tailored dress trousers product photo white background' },
  { id: 'denim_shorts',    q: 'women denim shorts product photo white background' },
  { id: 'bike_shorts',     q: 'women bike shorts cycling shorts product photo' },
  // TOPS
  { id: 'basic_tee',       q: 'women plain white t-shirt basic tee product photo' },
  { id: 'oversized_tee',   q: 'women oversized t-shirt product photo white background' },
  { id: 'crop_top',        q: 'women crop top shirt product photo white background' },
  { id: 'tank_cami',       q: 'women camisole tank top spaghetti strap product photo' },
  { id: 'button_down',     q: 'women button down shirt blouse product photo white background' },
  { id: 'blouse',          q: 'women silk flowy blouse product photo white background' },
  { id: 'bodysuit',        q: 'women fashion bodysuit top product photo white background' },
  { id: 'off_shoulder',    q: 'women off shoulder top product photo white background' },
  { id: 'graphic_tee',     q: 'women graphic print t-shirt product photo white background' },
  { id: 'polo',            q: 'women polo shirt collar shirt product photo white background' },
  // DRESSES & SKIRTS
  { id: 'mini_dress',      q: 'women mini dress product photo white background' },
  { id: 'midi_dress',      q: 'women midi dress product photo white background' },
  { id: 'maxi_dress',      q: 'women maxi dress long product photo white background' },
  { id: 'mini_skirt',      q: 'women mini skirt product photo white background' },
  { id: 'midi_skirt',      q: 'women midi skirt product photo white background' },
  { id: 'maxi_skirt',      q: 'women maxi skirt long product photo white background' },
  { id: 'slip_dress',      q: 'women slip dress satin product photo white background' },
  { id: 'wrap_dress',      q: 'women wrap dress product photo white background' },
  { id: 'denim_skirt',     q: 'women denim skirt product photo white background' },
  { id: 'tennis_skirt',    q: 'women tennis skirt pleated mini product photo' },
  // OUTERWEAR
  { id: 'oversized_blazer', q: 'women oversized blazer jacket product photo white background' },
  { id: 'fitted_blazer',   q: 'women fitted tailored blazer product photo white background' },
  { id: 'leather_jacket',  q: 'women leather jacket product photo white background' },
  { id: 'denim_jacket',    q: 'women denim jacket product photo white background' },
  { id: 'trench_coat',     q: 'women trench coat product photo white background' },
  { id: 'puffer',          q: 'women puffer jacket product photo white background' },
  { id: 'chunky_cardigan', q: 'women chunky knit cardigan oversized product photo' },
  { id: 'knit_cardigan',   q: 'women knit cardigan sweater product photo white background' },
  { id: 'hoodie',          q: 'women hoodie sweatshirt product photo white background' },
  { id: 'bomber',          q: 'women bomber jacket product photo white background' },
  // SHOES
  { id: 'white_sneakers',  q: 'white sneakers shoes product photo white background' },
  { id: 'chunky_sneakers', q: 'chunky platform sneakers shoes product photo white background' },
  { id: 'athletic',        q: 'women running athletic sneakers shoes product photo' },
  { id: 'heeled_boots',    q: 'women heeled ankle boots shoes product photo white background' },
  { id: 'flat_boots',      q: 'women chelsea boots flat ankle boots product photo white background' },
  { id: 'knee_high',       q: 'women knee high boots shoes product photo white background' },
  { id: 'block_heels',     q: 'women block heel shoes product photo white background' },
  { id: 'strappy_heels',   q: 'women strappy heeled sandals shoes product photo white background' },
  { id: 'loafers',         q: 'women loafers shoes product photo white background' },
  { id: 'sandals',         q: 'women sandals mules shoes product photo white background' },
  // ACCESSORIES
  { id: 'dainty_jewelry',    q: 'dainty delicate gold necklace earrings jewelry product photo white' },
  { id: 'statement_jewelry', q: 'statement bold earrings jewelry product photo white background' },
  { id: 'layered_necklaces', q: 'layered gold necklaces jewelry product photo white background' },
  { id: 'hoop_earrings',     q: 'gold hoop earrings jewelry product photo white background' },
  { id: 'structured_bag',    q: 'structured handbag top handle satchel product photo white background' },
  { id: 'crossbody',         q: 'crossbody bag mini shoulder bag product photo white background' },
  { id: 'tote',              q: 'tote bag product photo white background' },
  { id: 'baseball_cap',      q: 'baseball cap hat product photo white background' },
  { id: 'sunglasses',        q: 'women sunglasses product photo white background' },
  { id: 'belt',              q: 'leather belt product photo white background' },
];

// ── SerpAPI Google Images search ──────────────────────────────────────────────
async function search(query) {
  const url = new URL('https://serpapi.com/search.json');
  url.searchParams.set('engine',  'google_images');
  url.searchParams.set('q',       query);
  url.searchParams.set('num',     '10');
  url.searchParams.set('tbs',     'itp:photo');   // photos only
  url.searchParams.set('api_key', SERP_KEY);

  const res  = await fetch(url.toString(), { signal: AbortSignal.timeout(15000) });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error ?? `HTTP ${res.status}`);

  // Return original (full-res CDN) URLs, skipping gstatic thumbnails
  return (data.images_results ?? [])
    .map(r => r.original)
    .filter(u => u && u.startsWith('http') && !u.includes('gstatic'));
}

// ── Step 1: pick the best candidate ──────────────────────────────────────────
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

Pick the BEST image. Criteria in order:
1. "${label}" is the clear subject — item fills the frame, immediately identifiable
2. Clean white, off-white, or very plain background (retailer product shot style)
3. No full person visible — ghost mannequin, flat lay, or item-on-hanger preferred
4. Sharp, well-lit, professional quality
5. If multiple are similar quality, prefer the one with the most neutral/white background

Reply ONLY with the number (1 through ${urls.length}). Nothing else.`,
  });

  try {
    const res = await client.messages.create({
      model: 'claude-haiku-4-5-20251001', max_tokens: 5,
      messages: [{ role: 'user', content }],
    });
    const num = parseInt(res.content[0].text.trim());
    if (num >= 1 && num <= urls.length) return urls[num - 1];
    return urls[0];
  } catch {
    return urls[0];
  }
}

// ── Step 2: verify the picked image actually shows the right item ─────────────
async function visionVerify(label, url) {
  try {
    const res = await client.messages.create({
      model: 'claude-haiku-4-5-20251001', max_tokens: 10,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'url', url } },
          {
            type: 'text',
            text: `Does this image clearly show "${label}" as the main subject?
A fashion quiz user should immediately recognize this as "${label}" without any doubt.
Reply ONLY with YES or NO.`,
          },
        ],
      }],
    });
    return res.content[0].text.trim().toUpperCase().startsWith('YES');
  } catch {
    return false;
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const results  = {};
  const failures = [];
  const verified = [];

  console.log(`Sourcing product images for ${ITEMS.length} quiz items...\n`);

  for (const item of ITEMS) {
    process.stdout.write(`  ${item.id.padEnd(22)} `);
    const label = item.id.replace(/_/g, ' ');

    try {
      const allUrls = await search(item.q);
      const candidates = allUrls.slice(0, 5);

      if (candidates.length === 0) {
        console.log(`✗  no results`);
        failures.push(item.id);
        results[item.id] = null;
        continue;
      }

      // Try each candidate in ranked order until one passes verification
      let saved = null;
      const picked = await visionPick(label, candidates);

      // Try picked first, then remaining in order
      const ordered = [picked, ...candidates.filter(u => u !== picked)];

      for (const url of ordered) {
        if (!url) continue;
        const ok = await visionVerify(label, url);
        if (ok) {
          saved = url;
          break;
        }
      }

      if (saved) {
        results[item.id] = saved;
        verified.push(item.id);
        console.log(`✓  verified`);
      } else {
        results[item.id] = null;
        failures.push(item.id);
        console.log(`✗  failed verification (all ${ordered.length} candidates rejected)`);
      }

    } catch (err) {
      console.log(`✗  ERROR: ${err.message.slice(0, 80)}`);
      failures.push(item.id);
      results[item.id] = null;
    }

    await new Promise(r => setTimeout(r, 500));
  }

  const outPath = join(__dir, '..', 'quiz-image-results.json');
  writeFileSync(outPath, JSON.stringify(results, null, 2));

  console.log(`\n✓  ${verified.length}/${ITEMS.length} verified and saved`);
  if (failures.length) {
    console.log(`✗  Failed (${failures.length}): ${failures.join(', ')}`);
    console.log(`   → These kept their existing images. Replace manually or re-run.`);
  }
  console.log(`\nResults saved to quiz-image-results.json`);
  console.log('Next: node tools/apply_quiz_images.js');
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
