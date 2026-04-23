// Image URLs sourced from Who What Wear editorial photography.
// To swap any image, replace just the URL string for that item.

export const QUIZ_CATEGORIES = [
  // ── 1. BOTTOMS ───────────────────────────────────────────────────
  {
    id: 'bottoms',
    title: 'Bottoms',
    subtitle: "Select every style you'd actually wear",
    items: [
      { id: 'skinny_jeans',   label: 'Skinny Jeans',      desc: 'Slim & fitted',           styleTags: ['casual', 'classic'],          fit: 'slim',      image: '/quiz-images/skinny_jeans.jpg' },
      { id: 'straight_jeans', label: 'Straight Leg',       desc: 'Relaxed & everyday',      styleTags: ['casual', 'minimal'],          fit: 'straight',  image: '/quiz-images/straight_jeans.jpg' },
      { id: 'wide_leg',       label: 'Wide Leg / Flare',   desc: 'Flowy & statement',       styleTags: ['bohemian', 'trendy'],         fit: 'wide',      image: '/quiz-images/wide_leg.jpg' },
      { id: 'mom_jeans',      label: 'Mom Jeans',          desc: 'High-waist, vintage feel', styleTags: ['vintage', 'casual'],         fit: 'relaxed',   image: '/quiz-images/mom_jeans.jpg' },
      { id: 'baggy',          label: 'Baggy / Relaxed',    desc: 'Oversized & street',      styleTags: ['streetwear'],                 fit: 'oversized', image: '/quiz-images/baggy.jpg' },
      { id: 'cargo',          label: 'Cargo Pants',        desc: 'Utilitarian with pockets', styleTags: ['streetwear', 'techwear'],   fit: 'relaxed',   image: '/quiz-images/cargo.jpg' },
      { id: 'leggings',       label: 'Leggings',           desc: 'Fitted & active',         styleTags: ['athleisure'],                 fit: 'slim',      image: '/quiz-images/leggings.jpg' },
      { id: 'trousers',       label: 'Dress Trousers',     desc: 'Tailored & polished',     styleTags: ['business casual', 'minimal'], fit: 'tailored',  image: '/quiz-images/trousers.jpg' },
      { id: 'denim_shorts',   label: 'Denim Shorts',       desc: 'Casual & summer-ready',   styleTags: ['casual', 'coastal'],          fit: 'relaxed',   image: '/quiz-images/denim_shorts.jpg' },
      { id: 'bike_shorts',    label: 'Bike Shorts',        desc: 'Sporty & Y2K',            styleTags: ['y2k', 'athleisure'],          fit: 'slim',      image: '/quiz-images/bike_shorts.jpg' },
    ],
  },

  // ── 2. TOPS ──────────────────────────────────────────────────────
  {
    id: 'tops',
    title: 'Tops',
    subtitle: 'Pick every top style that feels like you',
    items: [
      { id: 'basic_tee',       label: 'Basic Tee',          desc: 'Minimal & everyday',      styleTags: ['minimal', 'casual'],          fit: 'straight',  image: '/quiz-images/basic_tee.jpg' },
      { id: 'oversized_tee',   label: 'Oversized Tee',      desc: 'Relaxed & effortless',    styleTags: ['streetwear', 'casual'],       fit: 'oversized', image: '/quiz-images/oversized_tee.jpg' },
      { id: 'crop_top',        label: 'Crop Top',           desc: 'Fitted & trendy',         styleTags: ['y2k', 'trendy'],              fit: 'slim',      image: '/quiz-images/crop_top.jpg' },
      { id: 'tank_cami',       label: 'Tank / Cami',        desc: 'Sleek & layerable',       styleTags: ['minimal', 'coastal'],         fit: 'slim',      image: '/quiz-images/tank_cami.jpg' },
      { id: 'button_down',     label: 'Button-Down',        desc: 'Preppy & clean',          styleTags: ['preppy', 'business casual'],  fit: 'straight',  image: '/quiz-images/button_down.jpg' },
      { id: 'blouse',          label: 'Blouse',             desc: 'Feminine & flowy',        styleTags: ['bohemian', 'minimal'],        fit: 'relaxed',   image: '/quiz-images/blouse.jpg' },
      { id: 'bodysuit',        label: 'Bodysuit',           desc: 'Sleek & polished',        styleTags: ['minimal', 'old money'],       fit: 'slim',      image: '/quiz-images/bodysuit.jpg' },
      { id: 'off_shoulder',    label: 'Off-Shoulder',       desc: 'Feminine & flirty',       styleTags: ['coastal', 'resort / vacation'], fit: 'relaxed', image: '/quiz-images/off_shoulder.jpg' },
      { id: 'graphic_tee',     label: 'Graphic Tee',        desc: 'Expressive & casual',     styleTags: ['streetwear', 'vintage'],      fit: 'relaxed',   image: '/quiz-images/graphic_tee.jpg' },
      { id: 'polo',            label: 'Polo / Collar Shirt', desc: 'Preppy & classic',       styleTags: ['preppy', 'old money'],        fit: 'straight',  image: '/quiz-images/polo.jpg' },
    ],
  },

  // ── 3. DRESSES & SKIRTS ──────────────────────────────────────────
  {
    id: 'dresses',
    title: 'Dresses & Skirts',
    subtitle: 'Select everything you gravitate toward',
    items: [
      { id: 'mini_dress',      label: 'Mini Dress',         desc: 'Playful & flirty',        styleTags: ['y2k', 'date night'],          fit: 'slim',      image: '/quiz-images/mini_dress.jpg' },
      { id: 'midi_dress',      label: 'Midi Dress',         desc: 'Versatile & elegant',     styleTags: ['minimal', 'smart casual'],    fit: 'straight',  image: '/quiz-images/midi_dress.jpg' },
      { id: 'maxi_dress',      label: 'Maxi Dress',         desc: 'Flowy & bohemian',        styleTags: ['bohemian', 'resort / vacation'], fit: 'relaxed', image: '/quiz-images/maxi_dress.jpg' },
      { id: 'mini_skirt',      label: 'Mini Skirt',         desc: 'Bold & playful',          styleTags: ['y2k', 'trendy'],              fit: 'slim',      image: '/quiz-images/mini_skirt.jpg' },
      { id: 'midi_skirt',      label: 'Midi Skirt',         desc: 'Sophisticated & polished', styleTags: ['minimal', 'old money'],      fit: 'straight',  image: '/quiz-images/midi_skirt.jpg' },
      { id: 'maxi_skirt',      label: 'Maxi Skirt',         desc: 'Dramatic & bohemian',     styleTags: ['bohemian', 'cottagecore'],    fit: 'relaxed',   image: '/quiz-images/maxi_skirt.jpg' },
      { id: 'slip_dress',      label: 'Slip Dress',         desc: 'Minimal & sleek',         styleTags: ['minimal', 'quiet luxury'],    fit: 'slim',      image: '/quiz-images/slip_dress.jpg' },
      { id: 'wrap_dress',      label: 'Wrap Dress',         desc: 'Flattering & feminine',   styleTags: ['smart casual', 'date night'], fit: 'tailored',  image: '/quiz-images/wrap_dress.jpg' },
      { id: 'denim_skirt',     label: 'Denim Skirt',        desc: 'Casual & classic',        styleTags: ['casual', 'vintage'],          fit: 'straight',  image: '/quiz-images/denim_skirt.jpg' },
      { id: 'tennis_skirt',    label: 'Tennis Skirt',       desc: 'Sporty & flirty',         styleTags: ['y2k', 'preppy'],              fit: 'relaxed',   image: '/quiz-images/tennis_skirt.jpg' },
    ],
  },

  // ── 4. OUTERWEAR ─────────────────────────────────────────────────
  {
    id: 'outerwear',
    title: 'Outerwear',
    subtitle: 'What do you reach for when it gets cold?',
    items: [
      { id: 'oversized_blazer', label: 'Oversized Blazer',  desc: 'Power & minimal',         styleTags: ['old money', 'smart casual'],  fit: 'oversized', image: '/quiz-images/oversized_blazer.jpg' },
      { id: 'fitted_blazer',   label: 'Fitted Blazer',      desc: 'Tailored & polished',     styleTags: ['business casual', 'minimal'], fit: 'tailored',  image: '/quiz-images/fitted_blazer.jpg' },
      { id: 'leather_jacket',  label: 'Leather Jacket',     desc: 'Edgy & cool',             styleTags: ['rockstar', 'streetwear'],     fit: 'fitted',    image: '/quiz-images/leather_jacket.jpg' },
      { id: 'denim_jacket',    label: 'Denim Jacket',       desc: 'Casual & classic',        styleTags: ['casual', 'vintage'],          fit: 'straight',  image: '/quiz-images/denim_jacket.jpg' },
      { id: 'trench_coat',     label: 'Trench Coat',        desc: 'Classic & elegant',       styleTags: ['old money', 'minimal'],       fit: 'straight',  image: '/quiz-images/trench_coat.jpg' },
      { id: 'varsity',          label: 'Varsity Jacket',     desc: 'Sporty & retro-cool',     styleTags: ['streetwear', 'y2k'],          fit: 'relaxed',   image: '/quiz-images/varsity.jpg' },
      { id: 'chunky_cardigan', label: 'Chunky Cardigan',    desc: 'Cozy & oversized',        styleTags: ['cottagecore', 'casual'],      fit: 'oversized', image: '/quiz-images/chunky_cardigan.jpg' },
      { id: 'knit_cardigan',   label: 'Fine Knit Cardigan', desc: 'Minimal & sleek',         styleTags: ['minimal', 'preppy'],          fit: 'relaxed',   image: '/quiz-images/knit_cardigan.jpg' },
      { id: 'hoodie',          label: 'Hoodie',             desc: 'Relaxed & everyday',      styleTags: ['streetwear', 'casual'],       fit: 'oversized', image: '/quiz-images/hoodie.jpg' },
      { id: 'bomber',          label: 'Bomber Jacket',      desc: 'Streetwear & cool',       styleTags: ['streetwear', 'y2k'],          fit: 'relaxed',   image: '/quiz-images/bomber.jpg' },
    ],
  },

  // ── 5. SHOES ─────────────────────────────────────────────────────
  {
    id: 'shoes',
    title: 'Shoes',
    subtitle: 'Pick every pair that belongs in your closet',
    items: [
      { id: 'white_sneakers',  label: 'White Sneakers',     desc: 'Minimal & clean',         styleTags: ['minimal', 'casual'],          fit: null, image: '/quiz-images/white_sneakers.jpg' },
      { id: 'chunky_sneakers', label: 'Chunky Sneakers',    desc: 'Bold & Y2K',              styleTags: ['y2k', 'streetwear'],          fit: null, image: '/quiz-images/chunky_sneakers.jpg' },
      { id: 'mary_janes',      label: 'Mary Janes',         desc: 'Cute & feminine',         styleTags: ['preppy', 'vintage'],          fit: null, image: '/quiz-images/mary_janes.jpg' },
      { id: 'heeled_boots',    label: 'Heeled Boots',       desc: 'Edgy & elevated',         styleTags: ['rockstar', 'dark academia'],  fit: null, image: '/quiz-images/heeled_boots.jpg' },
      { id: 'combat_boots',    label: 'Combat / Lace-Up Boots', desc: 'Edgy & grunge',      styleTags: ['rockstar', 'dark academia'],   fit: null, image: '/quiz-images/combat_boots.jpg' },
      { id: 'knee_high',       label: 'Knee-High Boots',    desc: 'Statement & bold',        styleTags: ['old money', 'dark academia'], fit: null, image: '/quiz-images/knee_high.jpg' },
      { id: 'block_heels',     label: 'Block Heels',        desc: 'Comfortable & elevated',  styleTags: ['smart casual', 'date night'], fit: null, image: '/quiz-images/block_heels.jpg' },
      { id: 'strappy_heels',   label: 'Strappy Heels',      desc: 'Feminine & dressy',       styleTags: ['date night', 'resort / vacation'], fit: null, image: '/quiz-images/strappy_heels.jpg' },
      { id: 'loafers',         label: 'Loafers / Ballet Flats', desc: 'Preppy & minimal',    styleTags: ['preppy', 'old money'],        fit: null, image: '/quiz-images/loafers.jpg' },
      { id: 'sandals',         label: 'Sandals / Mules',    desc: 'Casual & effortless',     styleTags: ['coastal', 'bohemian'],        fit: null, image: '/quiz-images/sandals.jpg' },
    ],
  },

  // ── 6. ACCESSORIES ───────────────────────────────────────────────
  {
    id: 'accessories',
    title: 'Accessories',
    subtitle: 'The finishing touches that say the most',
    items: [
      { id: 'dainty_jewelry',    label: 'Dainty Jewelry',     desc: 'Subtle & elegant',        styleTags: ['minimal', 'quiet luxury'],    fit: null, image: '/quiz-images/dainty_jewelry.jpg' },
      { id: 'statement_jewelry', label: 'Statement Jewelry',  desc: 'Bold & expressive',       styleTags: ['avant-garde', 'rockstar'],    fit: null, image: '/quiz-images/statement_jewelry.jpg' },
      { id: 'layered_necklaces', label: 'Layered Necklaces',  desc: 'Boho & trendy',           styleTags: ['bohemian', 'vintage'],        fit: null, image: '/quiz-images/layered_necklaces.jpg' },
      { id: 'hoop_earrings',     label: 'Hoop Earrings',      desc: 'Classic & versatile',     styleTags: ['casual', 'streetwear'],       fit: null, image: '/quiz-images/hoop_earrings.jpg' },
      { id: 'structured_bag',    label: 'Structured Bag',     desc: 'Polished & elevated',     styleTags: ['old money', 'business casual'], fit: null, image: '/quiz-images/structured_bag.jpg' },
      { id: 'crossbody',         label: 'Mini Crossbody',     desc: 'Casual & practical',      styleTags: ['casual', 'y2k'],              fit: null, image: '/quiz-images/crossbody.jpg' },
      { id: 'tote',              label: 'Tote Bag',           desc: 'Practical & minimal',     styleTags: ['minimal', 'normcore'],        fit: null, image: '/quiz-images/tote.jpg' },
      { id: 'baseball_cap',      label: 'Baseball Cap',       desc: 'Streetwear & casual',     styleTags: ['streetwear', 'athleisure'],   fit: null, image: '/quiz-images/baseball_cap.jpg' },
      { id: 'sunglasses',        label: 'Sunglasses',         desc: 'Effortless cool',         styleTags: ['coastal', 'minimal'],         fit: null, image: '/quiz-images/sunglasses.jpg' },
      { id: 'belt',              label: 'Belt',               desc: 'Defining & polished',     styleTags: ['old money', 'minimal'],       fit: null, image: '/quiz-images/belt.jpg' },
    ],
  },
];

// Maps quiz selections → style tags + dominant fit for Style DNA
export function mapSelectionsToStyleDna(selections) {
  const tagCounts = {};
  const fitCounts = {};

  for (const items of Object.values(selections)) {
    for (const item of items) {
      for (const tag of item.styleTags ?? []) {
        tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
      }
      if (item.fit) {
        fitCounts[item.fit] = (fitCounts[item.fit] ?? 0) + 1;
      }
    }
  }

  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([tag]) => tag.charAt(0).toUpperCase() + tag.slice(1));

  const dominantFit = Object.entries(fitCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  return { style_tags: topTags, dominant_fit: dominantFit };
}
