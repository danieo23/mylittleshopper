/**
 * Runs Claude Vision over every quiz card image and reports pass/fail.
 * A card PASSES if a user seeing the image with no label would immediately
 * identify the labeled garment as the primary subject.
 *
 * Usage:
 *   node tools/verify_quiz_images.js
 *
 * Requires ANTHROPIC_API_KEY in .env.local
 */

import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load .env.local manually (no dotenv dependency)
const __dir = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dir, '..', '.env.local');
try {
  const envText = readFileSync(envPath, 'utf8');
  for (const line of envText.split('\n')) {
    const [key, ...rest] = line.split('=');
    if (key && rest.length) {
      const raw = rest.join('=').trim().replace(/^["']|["']$/g, '');
      if (raw && !process.env[key.trim()]) process.env[key.trim()] = raw;
    }
  }
} catch {}

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('ANTHROPIC_API_KEY not set in .env.local');
  process.exit(1);
}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Inline the quiz data so this script has no Vite alias dependency
const QUIZ_CATEGORIES = [
  {
    id: 'bottoms', title: 'Bottoms',
    items: [
      { id: 'skinny_jeans',   label: 'Skinny Jeans',         image: 'https://cdn.mos.cms.futurecdn.net/PqqfnEWnX7e5k34QGXjf9A.jpg' },
      { id: 'straight_jeans', label: 'Straight Leg',          image: 'https://cdn.mos.cms.futurecdn.net/vp2kUv35nGbkTS5XM4tybB.jpg' },
      { id: 'wide_leg',       label: 'Wide Leg / Flare',      image: 'https://cdn.mos.cms.futurecdn.net/whowhatwear/posts/241750/how-to-wear-wide-jeans-241750-1605148677967-image.jpg' },
      { id: 'mom_jeans',      label: 'Mom Jeans',             image: 'https://cdn.mos.cms.futurecdn.net/whowhatwear/posts/211633/-2021753-1481825148.jpg' },
      { id: 'baggy',          label: 'Baggy / Relaxed',       image: 'https://cdn.mos.cms.futurecdn.net/whowhatwear/posts/278197/outfits-with-baggy-jeans-278197-1682460013669-fb.jpg' },
      { id: 'cargo',          label: 'Cargo Pants',           image: 'https://cdn.mos.cms.futurecdn.net/whowhatwear/posts/299504/cargo-pants-outfits-299504-1651080879588-fb.jpg' },
      { id: 'leggings',       label: 'Leggings',              image: 'https://cdn.mos.cms.futurecdn.net/eMawKYRt24bUJwaVP828hG.jpg' },
      { id: 'trousers',       label: 'Dress Trousers',        image: 'https://cdn.mos.cms.futurecdn.net/5virkxgxaJhYbdiTzGhpw4.jpg' },
      { id: 'denim_shorts',   label: 'Denim Shorts',          image: 'https://cdn.mos.cms.futurecdn.net/yHxgbrRvNjieW5M6VRfJJC.jpg' },
      { id: 'bike_shorts',    label: 'Bike Shorts',           image: 'https://cdn.mos.cms.futurecdn.net/whowhatwear/posts/287669/how-to-style-biker-shorts-287669-1591721458947-image.jpg' },
    ],
  },
  {
    id: 'tops', title: 'Tops',
    items: [
      { id: 'basic_tee',       label: 'Basic Tee',            image: 'https://cdn.mos.cms.futurecdn.net/whowhatwear/posts/220336/white-t-shirt-outfit-ideas-220336-1631107063752-main.jpg' },
      { id: 'oversized_tee',   label: 'Oversized Tee',        image: 'https://cdn.mos.cms.futurecdn.net/KzzGfiKFLCTVGTAxETRs6m.jpg' },
      { id: 'crop_top',        label: 'Crop Top',             image: 'https://cdn.mos.cms.futurecdn.net/whowhatwear/posts/255369/crop-top-outfits-255369-1591915524619-main.jpg' },
      { id: 'tank_cami',       label: 'Tank / Cami',          image: 'https://cdn.mos.cms.futurecdn.net/iSANNAu2ZmfiQPRsZkvpXc.jpg' },
      { id: 'button_down',     label: 'Button-Down',          image: 'https://cdn.mos.cms.futurecdn.net/whowhatwear/posts/299981/button-down-shirt-outfits-299981-1682049633490-main.jpg' },
      { id: 'blouse',          label: 'Blouse',               image: 'https://cdn.mos.cms.futurecdn.net/utUUtFjpoZn4YqRSXW7PqA.png' },
      { id: 'bodysuit',        label: 'Bodysuit',             image: 'https://cdn.mos.cms.futurecdn.net/whowhatwear/posts/295467/bodysuit-and-jeans-outfits-295467-1632936364928-image.jpg' },
      { id: 'off_shoulder',    label: 'Off-Shoulder',         image: 'https://cdn.mos.cms.futurecdn.net/whowhatwear/posts/290902/off-the-shoulder-outfits-290902-1608578626403-image.jpg' },
      { id: 'graphic_tee',     label: 'Graphic Tee',          image: 'https://cdn.mos.cms.futurecdn.net/iwUst2xrdDwDxa8JjjNU7G.jpg' },
      { id: 'polo',            label: 'Polo / Collar Shirt',  image: 'https://cdn.mos.cms.futurecdn.net/pEJ2topMFQxVXKTygDQY2e.jpg' },
    ],
  },
  {
    id: 'dresses', title: 'Dresses & Skirts',
    items: [
      { id: 'mini_dress',      label: 'Mini Dress',           image: 'https://cdn.mos.cms.futurecdn.net/tv9BBmmZ6vm7rcEYYmZoR6.jpg' },
      { id: 'midi_dress',      label: 'Midi Dress',           image: 'https://cdn.mos.cms.futurecdn.net/fiBCJ2d7oKiPXThcBx4D4Q.jpg' },
      { id: 'maxi_dress',      label: 'Maxi Dress',           image: 'https://cdn.mos.cms.futurecdn.net/whowhatwear/posts/287689/maxi-dress-outfits-287689-1591801537282-main.jpg' },
      { id: 'mini_skirt',      label: 'Mini Skirt',           image: 'https://cdn.mos.cms.futurecdn.net/fZqHkQEur57Cp57XMJ7GjJ.jpg' },
      { id: 'midi_skirt',      label: 'Midi Skirt',           image: 'https://cdn.mos.cms.futurecdn.net/uHkfW92tvqGBaUbEwi4coj.jpg' },
      { id: 'maxi_skirt',      label: 'Maxi Skirt',           image: 'https://cdn.mos.cms.futurecdn.net/JhEjC9CDjUuMHdh9zzjANg.jpg' },
      { id: 'slip_dress',      label: 'Slip Dress',           image: 'https://cdn.mos.cms.futurecdn.net/whowhatwear/posts/297688/slip-dress-outfits-297688-1643915647636-image.jpg' },
      { id: 'wrap_dress',      label: 'Wrap Dress',           image: 'https://cdn.mos.cms.futurecdn.net/whowhatwear/posts/262799/ways-to-wear-a-wrap-dress-262799-1531407688797-image.png' },
      { id: 'denim_skirt',     label: 'Denim Skirt',          image: 'https://cdn.mos.cms.futurecdn.net/N7uQ4G57iPybzvWw7uNf3N.jpg' },
      { id: 'tennis_skirt',    label: 'Tennis Skirt',         image: 'https://cdn.mos.cms.futurecdn.net/whowhatwear/posts/289804/tennis-skirt-outfits-289804-1603834073871-image.jpg' },
    ],
  },
  {
    id: 'outerwear', title: 'Outerwear',
    items: [
      { id: 'oversized_blazer', label: 'Oversized Blazer',   image: 'https://cdn.mos.cms.futurecdn.net/whowhatwear/posts/270565/oversized-blazer-outfits-270565-1678643431157-image.jpg' },
      { id: 'fitted_blazer',   label: 'Fitted Blazer',        image: 'https://cdn.mos.cms.futurecdn.net/z3NvPCP2LEMrSANKE82tqj.jpg' },
      { id: 'leather_jacket',  label: 'Leather Jacket',       image: 'https://cdn.mos.cms.futurecdn.net/gDa4FkPnf5QCZWV8F5Zohg.jpg' },
      { id: 'denim_jacket',    label: 'Denim Jacket',         image: 'https://cdn.mos.cms.futurecdn.net/iQCjnpgfctfqmAfn8ES76J.jpg' },
      { id: 'trench_coat',     label: 'Trench Coat',          image: 'https://cdn.mos.cms.futurecdn.net/F2pBXovZCgpQGJkSBRzTcj.jpg' },
      { id: 'puffer',          label: 'Puffer Jacket',        image: 'https://cdn.mos.cms.futurecdn.net/whowhatwear/posts/272874/puffer-jacket-outfits-272874-1705502387188-main.jpg' },
      { id: 'chunky_cardigan', label: 'Chunky Cardigan',      image: 'https://cdn.mos.cms.futurecdn.net/KdjxqWoEg6Y5wvVpwboskA.jpg' },
      { id: 'knit_cardigan',   label: 'Fine Knit Cardigan',   image: 'https://cdn.mos.cms.futurecdn.net/z3ooVFzqXJZYacorGBwW3M.jpg' },
      { id: 'hoodie',          label: 'Hoodie',               image: 'https://cdn.mos.cms.futurecdn.net/UrHAVT2TWtg98WESRLi5zA.jpg' },
      { id: 'bomber',          label: 'Bomber Jacket',        image: 'https://cdn.mos.cms.futurecdn.net/Y4CTjQvtFsy9gjtvNQEdBG.jpg' },
    ],
  },
  {
    id: 'shoes', title: 'Shoes',
    items: [
      { id: 'white_sneakers',  label: 'White Sneakers',       image: 'https://cdn.mos.cms.futurecdn.net/whowhatwear/posts/263663/white-sneakers-outfits-263663-1683292916474-main.jpg' },
      { id: 'chunky_sneakers', label: 'Chunky Sneakers',      image: 'https://cdn.mos.cms.futurecdn.net/7CCQScZHP9WuqSNMsoeBfF.jpg' },
      { id: 'athletic',        label: 'Running / Athletic',   image: 'https://cdn.mos.cms.futurecdn.net/whowhatwear/posts/268684/fall-outfits-with-running-shoes-268684-1537980439983-main.png' },
      { id: 'heeled_boots',    label: 'Heeled Boots',         image: 'https://cdn.mos.cms.futurecdn.net/DC9VEkK9vCYvcPxWMceJDL.jpg' },
      { id: 'flat_boots',      label: 'Chelsea / Flat Boots', image: 'https://cdn.mos.cms.futurecdn.net/whowhatwear/posts/274558/chelsea-boot-outfits-274558-1603817192406-image.jpg' },
      { id: 'knee_high',       label: 'Knee-High Boots',      image: 'https://cdn.mos.cms.futurecdn.net/fVSiSgWT6CoepvMZu6EZKn.jpg' },
      { id: 'block_heels',     label: 'Block Heels',          image: 'https://cdn.mos.cms.futurecdn.net/H4gjKW4uKMiYjvkJhz3r6M.jpg' },
      { id: 'strappy_heels',   label: 'Strappy Heels',        image: 'https://cdn.mos.cms.futurecdn.net/woF3VJyFjqqrczfNKpD9MM.jpg' },
      { id: 'loafers',         label: 'Loafers / Ballet Flats', image: 'https://cdn.mos.cms.futurecdn.net/47aKaKWibXKAyFrdpSm2nn.jpg' },
      { id: 'sandals',         label: 'Sandals / Mules',      image: 'https://cdn.mos.cms.futurecdn.net/yWzAB984uPS5RhD8oEkDF3.jpg' },
    ],
  },
  {
    id: 'accessories', title: 'Accessories',
    items: [
      { id: 'dainty_jewelry',    label: 'Dainty Jewelry',     image: 'https://cdn.mos.cms.futurecdn.net/iRXzKcoa4ccyfJoLkTAYv8.jpg' },
      { id: 'statement_jewelry', label: 'Statement Jewelry',  image: 'https://cdn.mos.cms.futurecdn.net/mT5WTJdXTuiR98HG8cmLT9.jpg' },
      { id: 'layered_necklaces', label: 'Layered Necklaces',  image: 'https://cdn.mos.cms.futurecdn.net/whowhatwear/posts/84104/how-to-layer-necklaces-jewelry-84104-1529014525700-image.jpg' },
      { id: 'hoop_earrings',     label: 'Hoop Earrings',      image: 'https://cdn.mos.cms.futurecdn.net/whowhatwear/posts/238270/hoop-earrings-238270-1622682433204-main.jpg' },
      { id: 'structured_bag',    label: 'Structured Bag',     image: 'https://cdn.mos.cms.futurecdn.net/whowhatwear/posts/242385/top-handle-satchel-handbags-242385-1510866443270-square.jpg' },
      { id: 'crossbody',         label: 'Mini Crossbody',     image: 'https://cdn.mos.cms.futurecdn.net/37NcTP8qcPhr8Ssy2gxFUc.jpg' },
      { id: 'tote',              label: 'Tote Bag',           image: 'https://cdn.mos.cms.futurecdn.net/oSVTPvo8zCUEPvTtHPyhdF.jpg' },
      { id: 'baseball_cap',      label: 'Baseball Cap',       image: 'https://cdn.mos.cms.futurecdn.net/whowhatwear/posts/295659/baseball-hat-outfits-295659-1698349074080-main.jpg' },
      { id: 'sunglasses',        label: 'Sunglasses',         image: 'https://cdn.mos.cms.futurecdn.net/SQPSDZRSgZ5YYc4b2mnDSW.png' },
      { id: 'belt',              label: 'Belt',               image: 'https://cdn.mos.cms.futurecdn.net/tFGBvKP5tWe4NC9kR47HjP.jpg' },
    ],
  },
];

async function verify(item, categoryTitle) {
  const prompt = `You are checking a fashion quiz card image. The card label is: "${item.label}"

Look at this image carefully and answer:

1. What is the single most visually dominant subject in this image? (10 words max)
2. Is "${item.label}" clearly the primary garment/accessory shown — not incidental background detail?
3. If someone saw this image with NO label, would they immediately think "${item.label}"?

Answer in strict JSON only, no extra text:
{
  "primary_subject": "...",
  "is_primary": true/false,
  "would_guess_correctly": true/false,
  "verdict": "PASS" or "FAIL",
  "reason": "one sentence"
}

PASS = the item is obviously the hero of the image.
FAIL = the item is wrong, tiny, incidental, or a user would not immediately identify it.`;

  try {
    const res = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'url', url: item.image } },
          { type: 'text', text: prompt },
        ],
      }],
    });

    const raw = res.content[0].text.trim();
    const json = JSON.parse(raw.match(/\{[\s\S]*\}/)[0]);
    return { ...json, item, category: categoryTitle, error: null };
  } catch (err) {
    return {
      item, category: categoryTitle,
      primary_subject: 'error', is_primary: false,
      would_guess_correctly: false, verdict: 'ERROR',
      reason: err.message, error: err.message,
    };
  }
}

async function main() {
  const failures = [];
  const passes = [];
  let total = 0;

  for (const cat of QUIZ_CATEGORIES) {
    console.log(`\n── ${cat.title} ──`);
    for (const item of cat.items) {
      total++;
      process.stdout.write(`  ${item.label.padEnd(28)}`);
      const result = await verify(item, cat.title);

      if (result.verdict === 'PASS') {
        passes.push(result);
        console.log(`✓  ${result.primary_subject}`);
      } else {
        failures.push(result);
        console.log(`✗  ${result.verdict} — shows: "${result.primary_subject}" — ${result.reason}`);
      }

      // Avoid rate-limit bursts
      await new Promise(r => setTimeout(r, 400));
    }
  }

  console.log('\n\n══════════════════════════════════════════');
  console.log(`RESULTS: ${passes.length} passed, ${failures.length} failed out of ${total}`);
  console.log('══════════════════════════════════════════');

  if (failures.length === 0) {
    console.log('\nAll images passed. Quiz is clean.');
    return;
  }

  console.log('\nFAILED CARDS (copy these IDs for fixing):\n');
  for (const f of failures) {
    console.log(`[${f.category}]  id: ${f.item.id}`);
    console.log(`  label:   ${f.item.label}`);
    console.log(`  shows:   ${f.primary_subject}`);
    console.log(`  reason:  ${f.reason}`);
    console.log(`  url:     ${f.item.image}`);
    console.log();
  }

  // Machine-readable summary for easy copy-paste into a fix prompt
  console.log('── JSON summary of failures ──');
  console.log(JSON.stringify(failures.map(f => ({
    id: f.item.id,
    label: f.item.label,
    category: f.category,
    shows: f.primary_subject,
    reason: f.reason,
  })), null, 2));
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
