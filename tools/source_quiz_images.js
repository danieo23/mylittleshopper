/**
 * Sources quiz card images via SerpAPI Google Images.
 *
 * Pipeline per item:
 *   1. Build query = base + imageMode presentation suffix + shared negative terms
 *   2. Fetch top 10 results from Google Images
 *   3. For each candidate (up to 5), run dual Vision scoring:
 *        label_score       0–10  (does the image show the right item?)
 *        presentation_score 0–10  (does it look right for a premium quiz?)
 *        hard_rejects       []    (watermark, collage, male model, mockup, etc.)
 *   4. Accept first candidate where label >= 7, presentation >= 7, no hard_rejects
 *   5. Track all accepted URLs to prevent duplicates across items
 *
 * Usage:
 *   node tools/source_quiz_images.js           # source all 60 items
 *   node tools/source_quiz_images.js --fix      # re-source only items that failed audit
 *   (reads ANTHROPIC_API_KEY + SHOPPING_API_KEY from .env.local)
 *
 * Outputs: quiz-image-results.json
 */

import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import {
  QUIZ_IMAGE_META,
  HARD_REJECT_FLAGS,
  MODE_SEARCH_SUFFIX,
  NEGATIVE_TERMS,
  ITEM_BASE_QUERY,
} from '../src/data/quizImageMeta.js';

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

// --fix mode: only re-source items that failed audit, preserve passing ones
const FIX_MODE = process.argv.includes('--fix');

let ITEM_IDS = Object.keys(ITEM_BASE_QUERY);
let existingResults = {};

if (FIX_MODE) {
  const auditPath   = join(__dir, '..', 'audit-results.json');
  const resultsPath = join(__dir, '..', 'quiz-image-results.json');
  const audit = JSON.parse(readFileSync(auditPath, 'utf8'));
  const failingIds = new Set(audit.filter(r => !r.passes).map(r => r.id));
  ITEM_IDS = ITEM_IDS.filter(id => failingIds.has(id));
  try { existingResults = JSON.parse(readFileSync(resultsPath, 'utf8')); } catch {}
  console.log(`--fix mode: re-sourcing ${ITEM_IDS.length} failing items\n`);
}

// ── Google Images search ───────────────────────────────────────────────────────
async function search(itemId) {
  const meta   = QUIZ_IMAGE_META[itemId];
  const base   = ITEM_BASE_QUERY[itemId];
  const suffix = MODE_SEARCH_SUFFIX[meta.imageMode];
  const query  = `${base} ${suffix} ${NEGATIVE_TERMS}`;

  const url = new URL('https://serpapi.com/search.json');
  url.searchParams.set('engine',  'google_images');
  url.searchParams.set('q',       query);
  url.searchParams.set('num',     '10');
  url.searchParams.set('tbs',     'itp:photo');
  url.searchParams.set('api_key', SERP_KEY);

  const res  = await fetch(url.toString(), { signal: AbortSignal.timeout(15000) });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error ?? `HTTP ${res.status}`);

  return (data.images_results ?? [])
    .map(r => r.original)
    .filter(u => u && u.startsWith('http') && !u.includes('gstatic'));
}

// ── Dual Vision scoring ────────────────────────────────────────────────────────
async function scoreImage(itemId, url) {
  const meta  = QUIZ_IMAGE_META[itemId];
  const label = itemId.replace(/_/g, ' ');

  const lifestyleRule = meta.allowLifestyle
    ? ''
    : '- LIFESTYLE: street photography or outdoor editorial scene';

  const prompt = `You are evaluating an image for a women's fashion style quiz card.

ITEM LABEL: "${label}"
REQUIRED PRESENTATION MODE: "${meta.imageMode}"
  - lower-body-on-model = woman's lower body clearly wearing the item, waist to below knee minimum
  - torso-on-model = woman's torso wearing the item, shoulders to waist minimum
  - full-body-on-model = full-length model shot head to toe
  - pair-isolated = both shoes/boots centered on a clean background
  - accessory-closeup = single accessory item, macro or close shot, clean bg
  - product-only = item alone on clean/white background, no model required

Score on TWO dimensions:

LABEL_SCORE (0–10): Does this image show "${label}" clearly?
  10 = unmistakably ${label}, immediately obvious, fills the frame
   7 = clearly identifiable as ${label}
   4 = ${label} is present but not the clear subject
   1 = wrong item, or ${label} barely visible

PRESENTATION_SCORE (0–10): Is this suitable for a polished style-quiz UI?
  10 = clean/white/plain background, item dominant, professional product shot
   7 = mostly clean, minor distraction, acceptable quality
   4 = editorial/lifestyle elements, busy background, poor framing or quality
   1 = clearly unsuitable

HARD_REJECTS — include any that apply as strings in the array:
  "WATERMARK"      visible watermark or stock photo stamp/text overlay ON the image
  "TEXT_OVERLAY"   text printed over the image (not part of a garment's graphic design)
  "COLLAGE"        front+back dual view, multi-angle composite, or grid layout
  "MALE_MODEL"     image shows a man or boy wearing the item
  "MOCKUP"         3-D print-on-demand template or digital mockup feel
  "WRONG_ITEM"     item shown is clearly not "${label}"
  "NOT_DOMINANT"   target item occupies less than ${Math.round(meta.minSubjectCoverage * 100)}% of the frame
${lifestyleRule}

Return ONLY valid JSON on a single line, nothing else:
{"label_score":0,"presentation_score":0,"hard_rejects":[]}`;

  try {
    const res = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 120,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'url', url } },
          { type: 'text',  text: prompt },
        ],
      }],
    });

    const text = res.content[0].text.trim();
    const json = text.match(/\{[\s\S]*\}/)?.[0];
    if (!json) return null;
    return JSON.parse(json);
  } catch {
    return null;
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const results   = { ...existingResults };  // seed with existing so dedup works
  const failures  = [];
  const usedUrls  = new Set(Object.values(existingResults).filter(Boolean));
  const scores    = {};          // saved for reporting

  console.log(`Sourcing images for ${ITEM_IDS.length} items...\n`);
  console.log(`  ${'ITEM'.padEnd(22)} ${'LABEL'.padEnd(7)} ${'PRES'.padEnd(6)} STATUS`);
  console.log(`  ${'─'.repeat(55)}`);

  for (const id of ITEM_IDS) {
    process.stdout.write(`  ${id.padEnd(22)} `);

    try {
      const candidates = (await search(id)).slice(0, 5);

      if (candidates.length === 0) {
        console.log(`no results`.padStart(20));
        failures.push({ id, reason: 'no results' });
        results[id] = null;
        continue;
      }

      let accepted = null;
      let lastScore = null;

      for (const url of candidates) {
        if (usedUrls.has(url)) continue;   // skip duplicates

        const score = await scoreImage(id, url);
        if (!score) continue;

        lastScore = score;
        const pass =
          score.label_score        >= 7 &&
          score.presentation_score >= 7 &&
          score.hard_rejects.length === 0;

        if (pass) {
          accepted = url;
          scores[id] = score;
          usedUrls.add(url);
          break;
        }
      }

      if (accepted) {
        results[id] = accepted;
        const s = scores[id];
        console.log(`${String(s.label_score).padEnd(7)} ${String(s.presentation_score).padEnd(6)} ✓ verified`);
      } else {
        results[id] = null;
        const reason = lastScore
          ? `label=${lastScore.label_score} pres=${lastScore.presentation_score} rejects=[${lastScore.hard_rejects.join(',')}]`
          : 'scoring failed';
        failures.push({ id, reason });
        console.log(`${'—'.padEnd(7)} ${'—'.padEnd(6)} ✗ ${reason}`);
      }

    } catch (err) {
      console.log(`ERROR: ${err.message.slice(0, 50)}`);
      failures.push({ id, reason: err.message });
      results[id] = null;
    }

    await new Promise(r => setTimeout(r, 600));
  }

  const outPath = join(__dir, '..', 'quiz-image-results.json');
  writeFileSync(outPath, JSON.stringify(results, null, 2));

  const found = Object.values(results).filter(Boolean).length;
  console.log(`\n─── Results ─────────────────────────────────────────────`);
  console.log(`✓  ${found}/${ITEM_IDS.length} images verified and saved`);

  if (failures.length) {
    console.log(`✗  ${failures.length} failed:`);
    for (const f of failures) console.log(`     ${f.id.padEnd(22)} ${f.reason}`);
  }

  console.log(`\nSaved → quiz-image-results.json`);
  console.log(`Next  → node tools/apply_quiz_images.js`);
  console.log(`Then  → node tools/normalize_quiz_images.js`);
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
