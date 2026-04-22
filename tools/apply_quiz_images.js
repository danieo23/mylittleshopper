/**
 * Reads quiz-image-results.json and patches every non-null URL into quizData.js.
 * Only items that have a new URL get updated; nulls are skipped (keeps current).
 *
 * Usage:
 *   node tools/apply_quiz_images.js
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir  = dirname(fileURLToPath(import.meta.url));
const root   = join(__dir, '..');
const results = JSON.parse(readFileSync(join(root, 'quiz-image-results.json'), 'utf8'));
const dataPath = join(root, 'src', 'data', 'quizData.js');

let src = readFileSync(dataPath, 'utf8');
let updated = 0;

for (const [id, url] of Object.entries(results)) {
  if (!url) continue;

  // Match: { id: 'some_id', ... image: 'OLD_URL' }
  // Replace just the image URL for this specific id
  const pattern = new RegExp(
    `(\\{ id: '${id}',[^}]+image: ')(https?://[^']+)(')`
  );
  const newSrc = src.replace(pattern, `$1${url}$3`);

  if (newSrc !== src) {
    src = newSrc;
    updated++;
    console.log(`  ✓ ${id}`);
  } else {
    console.log(`  - ${id} (pattern not matched — skipped)`);
  }
}

writeFileSync(dataPath, src);
console.log(`\nPatched ${updated} images in quizData.js`);
