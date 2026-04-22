/**
 * Downloads every accepted quiz image and crops it to a consistent 3:4 ratio
 * (matching the quiz card's CSS aspect-[3/4]), anchored by the item's objectPosition.
 *
 * Output: public/quiz-images/[id].jpg  (600×800px, JPEG 85%)
 * Also writes normalized-results.json with local-path URLs (/quiz-images/[id].jpg).
 * Run apply_quiz_images.js with that file to patch quizData.js.
 *
 * Requires: sharp  →  npm install --save-dev sharp
 *
 * Usage (run AFTER source_quiz_images.js + apply_quiz_images.js):
 *   node tools/normalize_quiz_images.js
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { QUIZ_IMAGE_META } from '../src/data/quizImageMeta.js';
import { QUIZ_CATEGORIES }  from '../src/data/quizData.js';

let sharp;
try {
  sharp = (await import('sharp')).default;
} catch {
  console.error('sharp is not installed. Run: npm install --save-dev sharp');
  process.exit(1);
}

const __dir   = dirname(fileURLToPath(import.meta.url));
const root    = join(__dir, '..');
const outDir  = join(root, 'public', 'quiz-images');
mkdirSync(outDir, { recursive: true });

const TARGET_W = 600;
const TARGET_H = 800;   // 3:4 ratio matching aspect-[3/4] in StyleCard

// Flatten all items
const ALL_ITEMS = QUIZ_CATEGORIES.flatMap(cat => cat.items);

function getAnchor(objectPosition) {
  // objectPosition is e.g. "center bottom", "center top", "center center"
  const parts = (objectPosition ?? 'center center').split(' ');
  return { h: parts[0] ?? 'center', v: parts[1] ?? 'center' };
}

function computeCrop(srcW, srcH, anchor) {
  const targetRatio = TARGET_W / TARGET_H;   // 0.75
  const srcRatio    = srcW / srcH;

  let cropW, cropH, cropX, cropY;

  if (srcRatio > targetRatio) {
    // Source is wider → crop left/right edges, keep full height
    cropH = srcH;
    cropW = Math.floor(srcH * targetRatio);
    cropY = 0;
    if      (anchor.h === 'left')  cropX = 0;
    else if (anchor.h === 'right') cropX = srcW - cropW;
    else                           cropX = Math.floor((srcW - cropW) / 2);
  } else {
    // Source is taller → crop top/bottom, keep full width
    cropW = srcW;
    cropH = Math.floor(srcW / targetRatio);
    cropX = 0;
    if      (anchor.v === 'top')    cropY = 0;
    else if (anchor.v === 'bottom') cropY = srcH - cropH;
    else                            cropY = Math.floor((srcH - cropH) / 2);
  }

  return { left: cropX, top: cropY, width: cropW, height: cropH };
}

async function processItem(item) {
  const meta      = QUIZ_IMAGE_META[item.id];
  const anchor    = getAnchor(meta?.objectPosition);
  const outPath   = join(outDir, `${item.id}.jpg`);
  const localPath = `/quiz-images/${item.id}.jpg`;

  if (!item.image) return { id: item.id, localPath: null, reason: 'no image url' };

  try {
    const res = await fetch(item.image, {
      signal: AbortSignal.timeout(15000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; quiz-normalizer/1.0)' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());

    const img      = sharp(buffer);
    const { width: srcW, height: srcH } = await img.metadata();
    const crop     = computeCrop(srcW, srcH, anchor);

    await img
      .extract(crop)
      .resize(TARGET_W, TARGET_H, { fit: 'fill' })
      .jpeg({ quality: 85, progressive: true })
      .toFile(outPath);

    return { id: item.id, localPath };
  } catch (err) {
    return { id: item.id, localPath: null, reason: err.message.slice(0, 80) };
  }
}

async function main() {
  console.log(`Normalizing ${ALL_ITEMS.length} images → public/quiz-images/ (${TARGET_W}×${TARGET_H})\n`);

  const normalized = {};
  const failures   = [];

  for (const item of ALL_ITEMS) {
    process.stdout.write(`  ${item.id.padEnd(22)} `);
    const result = await processItem(item);

    if (result.localPath) {
      normalized[item.id] = result.localPath;
      console.log(`✓  saved`);
    } else {
      normalized[item.id] = null;
      failures.push(item.id);
      console.log(`✗  ${result.reason}`);
    }

    await new Promise(r => setTimeout(r, 100));
  }

  // Write normalized-results.json so apply_quiz_images.js can patch quizData.js
  const normPath = join(root, 'normalized-results.json');
  writeFileSync(normPath, JSON.stringify(normalized, null, 2));

  const ok = Object.values(normalized).filter(Boolean).length;
  console.log(`\n✓  ${ok}/${ALL_ITEMS.length} normalized`);
  if (failures.length) console.log(`✗  Failed: ${failures.join(', ')}`);
  console.log(`\nSaved → normalized-results.json`);
  console.log(`Next  → node tools/apply_quiz_images.js normalized-results.json`);
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
