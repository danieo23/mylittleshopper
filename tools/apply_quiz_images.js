/**
 * Patches image URLs from a results JSON into quizData.js.
 * Only items with a non-null URL get updated; nulls keep their current value.
 *
 * Usage:
 *   node tools/apply_quiz_images.js                        # uses quiz-image-results.json
 *   node tools/apply_quiz_images.js normalized-results.json  # uses a custom file
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir    = dirname(fileURLToPath(import.meta.url));
const root     = join(__dir, '..');
const fileName = process.argv[2] ?? 'quiz-image-results.json';
const results  = JSON.parse(readFileSync(join(root, fileName), 'utf8'));
const dataPath = join(root, 'src', 'data', 'quizData.js');

let src     = readFileSync(dataPath, 'utf8');
let updated = 0;

for (const [id, url] of Object.entries(results)) {
  if (!url) continue;

  // Match the image field for this specific item id
  // Works for both http:// CDN URLs and /local-path URLs
  const pattern = new RegExp(
    `(\\{ id: '${id}',[^}]+image: ')((?:https?://|/)[^']+)(')`
  );
  const newSrc = src.replace(pattern, `$1${url}$3`);

  if (newSrc !== src) {
    src = newSrc;
    updated++;
    console.log(`  ✓ ${id}`);
  } else {
    console.log(`  - ${id} (no change)`);
  }
}

writeFileSync(dataPath, src);
console.log(`\nPatched ${updated} images in quizData.js  (source: ${fileName})`);
