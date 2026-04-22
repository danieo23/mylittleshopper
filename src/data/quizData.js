// Image URLs sourced from Who What Wear editorial photography.
// To swap any image, replace just the URL string for that item.

export const QUIZ_CATEGORIES = [
  // ── 1. BOTTOMS ───────────────────────────────────────────────────
  {
    id: 'bottoms',
    title: 'Bottoms',
    subtitle: "Select every style you'd actually wear",
    items: [
      { id: 'skinny_jeans',   label: 'Skinny Jeans',      desc: 'Slim & fitted',           styleTags: ['casual', 'classic'],          fit: 'slim',      image: 'https://images.pexels.com/photos/7514149/pexels-photo-7514149.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'straight_jeans', label: 'Straight Leg',       desc: 'Relaxed & everyday',      styleTags: ['casual', 'minimal'],          fit: 'straight',  image: 'https://images.pexels.com/photos/7716953/pexels-photo-7716953.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'wide_leg',       label: 'Wide Leg / Flare',   desc: 'Flowy & statement',       styleTags: ['bohemian', 'trendy'],         fit: 'wide',      image: 'https://images.pexels.com/photos/31464201/pexels-photo-31464201.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'mom_jeans',      label: 'Mom Jeans',          desc: 'High-waist, vintage feel', styleTags: ['vintage', 'casual'],         fit: 'relaxed',   image: 'https://images.pexels.com/photos/8053690/pexels-photo-8053690.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'baggy',          label: 'Baggy / Relaxed',    desc: 'Oversized & street',      styleTags: ['streetwear'],                 fit: 'oversized', image: 'https://images.pexels.com/photos/29738018/pexels-photo-29738018.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'cargo',          label: 'Cargo Pants',        desc: 'Utilitarian with pockets', styleTags: ['streetwear', 'techwear'],   fit: 'relaxed',   image: 'https://images.pexels.com/photos/16983205/pexels-photo-16983205.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'leggings',       label: 'Leggings',           desc: 'Fitted & active',         styleTags: ['athleisure'],                 fit: 'slim',      image: 'https://images.pexels.com/photos/9770484/pexels-photo-9770484.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'trousers',       label: 'Dress Trousers',     desc: 'Tailored & polished',     styleTags: ['business casual', 'minimal'], fit: 'tailored',  image: 'https://images.pexels.com/photos/9634249/pexels-photo-9634249.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'denim_shorts',   label: 'Denim Shorts',       desc: 'Casual & summer-ready',   styleTags: ['casual', 'coastal'],          fit: 'relaxed',   image: 'https://images.pexels.com/photos/4725152/pexels-photo-4725152.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'bike_shorts',    label: 'Bike Shorts',        desc: 'Sporty & Y2K',            styleTags: ['y2k', 'athleisure'],          fit: 'slim',      image: 'https://images.pexels.com/photos/4821355/pexels-photo-4821355.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
    ],
  },

  // ── 2. TOPS ──────────────────────────────────────────────────────
  {
    id: 'tops',
    title: 'Tops',
    subtitle: 'Pick every top style that feels like you',
    items: [
      { id: 'basic_tee',       label: 'Basic Tee',          desc: 'Minimal & everyday',      styleTags: ['minimal', 'casual'],          fit: 'straight',  image: 'https://images.pexels.com/photos/8217291/pexels-photo-8217291.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'oversized_tee',   label: 'Oversized Tee',      desc: 'Relaxed & effortless',    styleTags: ['streetwear', 'casual'],       fit: 'oversized', image: 'https://images.pexels.com/photos/36908588/pexels-photo-36908588.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'crop_top',        label: 'Crop Top',           desc: 'Fitted & trendy',         styleTags: ['y2k', 'trendy'],              fit: 'slim',      image: 'https://images.pexels.com/photos/13966449/pexels-photo-13966449.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'tank_cami',       label: 'Tank / Cami',        desc: 'Sleek & layerable',       styleTags: ['minimal', 'coastal'],         fit: 'slim',      image: 'https://images.pexels.com/photos/11403456/pexels-photo-11403456.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'button_down',     label: 'Button-Down',        desc: 'Preppy & clean',          styleTags: ['preppy', 'business casual'],  fit: 'straight',  image: 'https://images.pexels.com/photos/6746965/pexels-photo-6746965.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'blouse',          label: 'Blouse',             desc: 'Feminine & flowy',        styleTags: ['bohemian', 'minimal'],        fit: 'relaxed',   image: 'https://images.pexels.com/photos/15802325/pexels-photo-15802325.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'bodysuit',        label: 'Bodysuit',           desc: 'Sleek & polished',        styleTags: ['minimal', 'old money'],       fit: 'slim',      image: 'https://images.pexels.com/photos/13521193/pexels-photo-13521193.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'off_shoulder',    label: 'Off-Shoulder',       desc: 'Feminine & flirty',       styleTags: ['coastal', 'resort / vacation'], fit: 'relaxed', image: 'https://images.pexels.com/photos/18057071/pexels-photo-18057071.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'graphic_tee',     label: 'Graphic Tee',        desc: 'Expressive & casual',     styleTags: ['streetwear', 'vintage'],      fit: 'relaxed',   image: 'https://images.pexels.com/photos/36908588/pexels-photo-36908588.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'polo',            label: 'Polo / Collar Shirt', desc: 'Preppy & classic',       styleTags: ['preppy', 'old money'],        fit: 'straight',  image: 'https://images.pexels.com/photos/31438911/pexels-photo-31438911.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
    ],
  },

  // ── 3. DRESSES & SKIRTS ──────────────────────────────────────────
  {
    id: 'dresses',
    title: 'Dresses & Skirts',
    subtitle: 'Select everything you gravitate toward',
    items: [
      { id: 'mini_dress',      label: 'Mini Dress',         desc: 'Playful & flirty',        styleTags: ['y2k', 'date night'],          fit: 'slim',      image: 'https://images.pexels.com/photos/15503232/pexels-photo-15503232.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'midi_dress',      label: 'Midi Dress',         desc: 'Versatile & elegant',     styleTags: ['minimal', 'smart casual'],    fit: 'straight',  image: 'https://images.pexels.com/photos/17901631/pexels-photo-17901631.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'maxi_dress',      label: 'Maxi Dress',         desc: 'Flowy & bohemian',        styleTags: ['bohemian', 'resort / vacation'], fit: 'relaxed', image: 'https://images.pexels.com/photos/16934425/pexels-photo-16934425.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'mini_skirt',      label: 'Mini Skirt',         desc: 'Bold & playful',          styleTags: ['y2k', 'trendy'],              fit: 'slim',      image: 'https://images.pexels.com/photos/16154682/pexels-photo-16154682.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'midi_skirt',      label: 'Midi Skirt',         desc: 'Sophisticated & polished', styleTags: ['minimal', 'old money'],      fit: 'straight',  image: 'https://images.pexels.com/photos/4690501/pexels-photo-4690501.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'maxi_skirt',      label: 'Maxi Skirt',         desc: 'Dramatic & bohemian',     styleTags: ['bohemian', 'cottagecore'],    fit: 'relaxed',   image: 'https://images.pexels.com/photos/21622100/pexels-photo-21622100.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'slip_dress',      label: 'Slip Dress',         desc: 'Minimal & sleek',         styleTags: ['minimal', 'quiet luxury'],    fit: 'slim',      image: 'https://images.pexels.com/photos/18235036/pexels-photo-18235036.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'wrap_dress',      label: 'Wrap Dress',         desc: 'Flattering & feminine',   styleTags: ['smart casual', 'date night'], fit: 'tailored',  image: 'https://images.pexels.com/photos/4171767/pexels-photo-4171767.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'denim_skirt',     label: 'Denim Skirt',        desc: 'Casual & classic',        styleTags: ['casual', 'vintage'],          fit: 'straight',  image: 'https://images.pexels.com/photos/13535621/pexels-photo-13535621.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'tennis_skirt',    label: 'Tennis Skirt',       desc: 'Sporty & flirty',         styleTags: ['y2k', 'preppy'],              fit: 'relaxed',   image: 'https://images.pexels.com/photos/34921312/pexels-photo-34921312.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
    ],
  },

  // ── 4. OUTERWEAR ─────────────────────────────────────────────────
  {
    id: 'outerwear',
    title: 'Outerwear',
    subtitle: 'What do you reach for when it gets cold?',
    items: [
      { id: 'oversized_blazer', label: 'Oversized Blazer',  desc: 'Power & minimal',         styleTags: ['old money', 'smart casual'],  fit: 'oversized', image: 'https://images.pexels.com/photos/33401681/pexels-photo-33401681.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'fitted_blazer',   label: 'Fitted Blazer',      desc: 'Tailored & polished',     styleTags: ['business casual', 'minimal'], fit: 'tailored',  image: 'https://images.pexels.com/photos/19289548/pexels-photo-19289548.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'leather_jacket',  label: 'Leather Jacket',     desc: 'Edgy & cool',             styleTags: ['rockstar', 'streetwear'],     fit: 'fitted',    image: 'https://images.pexels.com/photos/12544466/pexels-photo-12544466.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'denim_jacket',    label: 'Denim Jacket',       desc: 'Casual & classic',        styleTags: ['casual', 'vintage'],          fit: 'straight',  image: 'https://images.pexels.com/photos/26011847/pexels-photo-26011847.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'trench_coat',     label: 'Trench Coat',        desc: 'Classic & elegant',       styleTags: ['old money', 'minimal'],       fit: 'straight',  image: 'https://images.pexels.com/photos/35265447/pexels-photo-35265447.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'puffer',          label: 'Puffer Jacket',      desc: 'Casual & cozy',           styleTags: ['streetwear', 'casual'],       fit: 'oversized', image: 'https://images.pexels.com/photos/10392159/pexels-photo-10392159.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'chunky_cardigan', label: 'Chunky Cardigan',    desc: 'Cozy & oversized',        styleTags: ['cottagecore', 'casual'],      fit: 'oversized', image: 'https://images.pexels.com/photos/36129313/pexels-photo-36129313.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'knit_cardigan',   label: 'Fine Knit Cardigan', desc: 'Minimal & sleek',         styleTags: ['minimal', 'preppy'],          fit: 'relaxed',   image: 'https://images.pexels.com/photos/6968313/pexels-photo-6968313.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'hoodie',          label: 'Hoodie',             desc: 'Relaxed & everyday',      styleTags: ['streetwear', 'casual'],       fit: 'oversized', image: 'https://images.pexels.com/photos/16647795/pexels-photo-16647795.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'bomber',          label: 'Bomber Jacket',      desc: 'Streetwear & cool',       styleTags: ['streetwear', 'y2k'],          fit: 'relaxed',   image: 'https://images.pexels.com/photos/1126999/pexels-photo-1126999.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
    ],
  },

  // ── 5. SHOES ─────────────────────────────────────────────────────
  {
    id: 'shoes',
    title: 'Shoes',
    subtitle: 'Pick every pair that belongs in your closet',
    items: [
      { id: 'white_sneakers',  label: 'White Sneakers',     desc: 'Minimal & clean',         styleTags: ['minimal', 'casual'],          fit: null, image: 'https://images.pexels.com/photos/11324527/pexels-photo-11324527.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'chunky_sneakers', label: 'Chunky Sneakers',    desc: 'Bold & Y2K',              styleTags: ['y2k', 'streetwear'],          fit: null, image: 'https://images.pexels.com/photos/5788986/pexels-photo-5788986.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'athletic',        label: 'Running / Athletic', desc: 'Sporty & functional',     styleTags: ['athleisure'],                 fit: null, image: 'https://images.pexels.com/photos/17931134/pexels-photo-17931134.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'heeled_boots',    label: 'Heeled Boots',       desc: 'Edgy & elevated',         styleTags: ['rockstar', 'dark academia'],  fit: null, image: 'https://images.pexels.com/photos/26794819/pexels-photo-26794819.png?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'flat_boots',      label: 'Chelsea / Flat Boots', desc: 'Versatile & classic',   styleTags: ['minimal', 'casual'],          fit: null, image: 'https://images.pexels.com/photos/35654972/pexels-photo-35654972.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'knee_high',       label: 'Knee-High Boots',    desc: 'Statement & bold',        styleTags: ['old money', 'dark academia'], fit: null, image: 'https://images.pexels.com/photos/27598915/pexels-photo-27598915.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'block_heels',     label: 'Block Heels',        desc: 'Comfortable & elevated',  styleTags: ['smart casual', 'date night'], fit: null, image: 'https://images.pexels.com/photos/12112062/pexels-photo-12112062.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'strappy_heels',   label: 'Strappy Heels',      desc: 'Feminine & dressy',       styleTags: ['date night', 'resort / vacation'], fit: null, image: 'https://images.pexels.com/photos/32851161/pexels-photo-32851161.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'loafers',         label: 'Loafers / Ballet Flats', desc: 'Preppy & minimal',    styleTags: ['preppy', 'old money'],        fit: null, image: 'https://images.pexels.com/photos/14706988/pexels-photo-14706988.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'sandals',         label: 'Sandals / Mules',    desc: 'Casual & effortless',     styleTags: ['coastal', 'bohemian'],        fit: null, image: 'https://images.pexels.com/photos/30471950/pexels-photo-30471950.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
    ],
  },

  // ── 6. ACCESSORIES ───────────────────────────────────────────────
  {
    id: 'accessories',
    title: 'Accessories',
    subtitle: 'The finishing touches that say the most',
    items: [
      { id: 'dainty_jewelry',    label: 'Dainty Jewelry',     desc: 'Subtle & elegant',        styleTags: ['minimal', 'quiet luxury'],    fit: null, image: 'https://images.pexels.com/photos/8448138/pexels-photo-8448138.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'statement_jewelry', label: 'Statement Jewelry',  desc: 'Bold & expressive',       styleTags: ['avant-garde', 'rockstar'],    fit: null, image: 'https://images.pexels.com/photos/5500022/pexels-photo-5500022.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'layered_necklaces', label: 'Layered Necklaces',  desc: 'Boho & trendy',           styleTags: ['bohemian', 'vintage'],        fit: null, image: 'https://images.pexels.com/photos/14355033/pexels-photo-14355033.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'hoop_earrings',     label: 'Hoop Earrings',      desc: 'Classic & versatile',     styleTags: ['casual', 'streetwear'],       fit: null, image: 'https://images.pexels.com/photos/12144978/pexels-photo-12144978.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'structured_bag',    label: 'Structured Bag',     desc: 'Polished & elevated',     styleTags: ['old money', 'business casual'], fit: null, image: 'https://images.pexels.com/photos/36364967/pexels-photo-36364967.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'crossbody',         label: 'Mini Crossbody',     desc: 'Casual & practical',      styleTags: ['casual', 'y2k'],              fit: null, image: 'https://images.pexels.com/photos/23070928/pexels-photo-23070928.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'tote',              label: 'Tote Bag',           desc: 'Practical & minimal',     styleTags: ['minimal', 'normcore'],        fit: null, image: 'https://images.pexels.com/photos/29793778/pexels-photo-29793778.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'baseball_cap',      label: 'Baseball Cap',       desc: 'Streetwear & casual',     styleTags: ['streetwear', 'athleisure'],   fit: null, image: 'https://images.pexels.com/photos/16166738/pexels-photo-16166738.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'sunglasses',        label: 'Sunglasses',         desc: 'Effortless cool',         styleTags: ['coastal', 'minimal'],         fit: null, image: 'https://images.pexels.com/photos/18742643/pexels-photo-18742643.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'belt',              label: 'Belt',               desc: 'Defining & polished',     styleTags: ['old money', 'minimal'],       fit: null, image: 'https://images.pexels.com/photos/8800326/pexels-photo-8800326.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
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
