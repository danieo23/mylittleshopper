/**
 * Audits every current quiz image against label correctness and presentation quality.
 *
 * For each of the 60 items it:
 *   - Loads the current image URL from quizData.js
 *   - Runs Claude Vision dual scoring (label_score, presentation_score, hard_rejects)
 *   - Flags whether a crop could fix the issue (presentation problem, no hard rejects)
 *
 * Output: sorted by presentation_score ascending (worst first).
 * Also writes audit-results.json for use by other tools.
 *
 * Usage:
 *   node tools/audit_quiz_images.js
 */

import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { QUIZ_CATEGORIES } from '../src/data/quizData.js';
import { QUIZ_IMAGE_META } from '../src/data/quizImageMeta.js';

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

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_KEY) { console.error('ANTHROPIC_API_KEY not set'); process.exit(1); }

const client = new Anthropic({ apiKey: ANTHROPIC_KEY });

// Flatten all items from all categories
const ALL_ITEMS = QUIZ_CATEGORIES.flatMap(cat =>
  cat.items.map(item => ({ ...item, category: cat.title }))
);

async function scoreImage(item) {
  const meta  = QUIZ_IMAGE_META[item.id];
  const label = item.id.replace(/_/g, ' ');

  const lifestyleRule = meta?.allowLifestyle
    ? ''
    : '  "LIFESTYLE"    street photography or outdoor editorial scene';

  const prompt = `You are auditing an image on a live women's fashion style quiz card.

ITEM LABEL: "${label}"
REQUIRED PRESENTATION MODE: "${meta?.imageMode ?? 'product-only'}"

Score on TWO dimensions:

LABEL_SCORE (0–10): Does this image show "${label}"?
  10 = unmistakably correct, fills the frame
   7 = clearly identifiable
   4 = present but not the main subject
   1 = wrong item or barely visible

PRESENTATION_SCORE (0–10): Is this suitable for a premium quiz UI?
  10 = clean/white/plain bg, item dominant, professional product shot, consistent
   7 = acceptable, minor issues
   4 = editorial/lifestyle, busy bg, poor crop or quality
   1 = clearly unsuitable

HARD_REJECTS — include any that apply:
  "WATERMARK"      visible watermark or stock text stamped on the image
  "TEXT_OVERLAY"   text printed over image (not garment graphic design)
  "COLLAGE"        multi-view composite, front+back dual layout
  "MALE_MODEL"     shows a man or boy
  "MOCKUP"         3-D print-on-demand or digital template
  "WRONG_ITEM"     clearly the wrong item for "${label}"
  "NOT_DOMINANT"   item occupies less than ${Math.round((meta?.minSubjectCoverage ?? 0.5) * 100)}% of the frame
${lifestyleRule}

CAN_FIX_WITH_CROP (true/false): Would cropping/reframing fix the main presentation issue?
  true = subject is correct and present, just poorly framed or off-center
  false = wrong item, watermark, male model, or fundamental quality problem

Return ONLY valid JSON on one line:
{"label_score":0,"presentation_score":0,"hard_rejects":[],"can_fix_with_crop":false}`;

  try {
    const res = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 150,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'url', url: item.image } },
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

async function main() {
  console.log(`Auditing ${ALL_ITEMS.length} quiz images...\n`);

  const auditResults = [];

  for (const item of ALL_ITEMS) {
    process.stdout.write(`  ${item.id.padEnd(22)} `);

    if (!item.image) {
      console.log('no image');
      auditResults.push({ id: item.id, category: item.category, label: item.label, url: null, label_score: 0, presentation_score: 0, hard_rejects: ['NO_IMAGE'], can_fix_with_crop: false });
      continue;
    }

    const score = await scoreImage(item);
    if (!score) {
      console.log('scoring failed');
      auditResults.push({ id: item.id, category: item.category, label: item.label, url: item.image, label_score: null, presentation_score: null, hard_rejects: ['SCORE_ERROR'], can_fix_with_crop: false });
      continue;
    }

    const overall = score.label_score >= 7 && score.presentation_score >= 7 && score.hard_rejects.length === 0;
    const status  = overall ? '✓' : '✗';
    const rejects = score.hard_rejects.length ? ` [${score.hard_rejects.join(',')}]` : '';

    console.log(`L:${score.label_score} P:${score.presentation_score}${rejects} ${status}${score.can_fix_with_crop && !overall ? ' (crop may help)' : ''}`);

    auditResults.push({
      id:                 item.id,
      category:           item.category,
      label:              item.label,
      url:                item.image,
      label_score:        score.label_score,
      presentation_score: score.presentation_score,
      hard_rejects:       score.hard_rejects,
      can_fix_with_crop:  score.can_fix_with_crop,
      passes:             overall,
    });

    await new Promise(r => setTimeout(r, 400));
  }

  // Sort: hard failures first, then by presentation_score ascending
  const sorted = [...auditResults].sort((a, b) => {
    const aFail = (a.hard_rejects?.length ?? 0) > 0;
    const bFail = (b.hard_rejects?.length ?? 0) > 0;
    if (aFail !== bFail) return aFail ? -1 : 1;
    return (a.presentation_score ?? 0) - (b.presentation_score ?? 0);
  });

  // Write JSON
  const outPath = join(__dir, '..', 'audit-results.json');
  writeFileSync(outPath, JSON.stringify(sorted, null, 2));

  // Print summary table
  const passing    = auditResults.filter(r => r.passes).length;
  const hardFails  = auditResults.filter(r => r.hard_rejects?.length > 0).length;
  const softFails  = auditResults.filter(r => !r.passes && (r.hard_rejects?.length ?? 0) === 0).length;
  const fixable    = auditResults.filter(r => !r.passes && r.can_fix_with_crop).length;

  console.log(`\n─── Audit Summary ───────────────────────────────────────`);
  console.log(`  Passing (L≥7 + P≥7, no rejects): ${passing}/${ALL_ITEMS.length}`);
  console.log(`  Hard failures (watermark/wrong item/male/etc.): ${hardFails}`);
  console.log(`  Soft failures (scores too low, no hard reject):  ${softFails}`);
  console.log(`  Fixable with crop:                              ${fixable}`);

  console.log(`\n─── Worst offenders ─────────────────────────────────────`);
  for (const r of sorted.slice(0, 15)) {
    if (r.passes) break;
    const rejects = r.hard_rejects?.length ? r.hard_rejects.join(',') : '—';
    console.log(`  ${r.id.padEnd(22)} L:${String(r.label_score ?? '?').padEnd(3)} P:${String(r.presentation_score ?? '?').padEnd(3)} rejects:${rejects}`);
  }

  console.log(`\nFull results saved → audit-results.json`);
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
