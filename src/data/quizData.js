// All image URLs are Unsplash CDN — swap any by replacing the photo ID
const u = (id) =>
  `https://images.unsplash.com/photo-${id}?w=400&h=500&fit=crop&q=80&auto=format`;

export const QUIZ_CATEGORIES = [
  // ── 1. BOTTOMS ───────────────────────────────────────────────────
  {
    id: 'bottoms',
    title: 'Bottoms',
    subtitle: "Select every style you'd actually wear",
    items: [
      { id: 'skinny_jeans',   label: 'Skinny Jeans',     desc: 'Slim & fitted',          styleTags: ['casual', 'classic'],         fit: 'slim',      image: u('1541099649105-f69ad21f3246') },
      { id: 'straight_jeans', label: 'Straight Leg',      desc: 'Relaxed & everyday',     styleTags: ['casual', 'minimal'],         fit: 'straight',  image: u('1624378439575-d8705ad7ae80') },
      { id: 'wide_leg',       label: 'Wide Leg / Flare',  desc: 'Flowy & statement',      styleTags: ['bohemian', 'trendy'],        fit: 'wide',      image: u('1594938298603-c8148c4b4a6f') },
      { id: 'mom_jeans',      label: 'Mom Jeans',         desc: 'High-waist, vintage feel',styleTags: ['vintage', 'casual'],        fit: 'relaxed',   image: u('1582418702059-97ebafb35d09') },
      { id: 'baggy',          label: 'Baggy / Relaxed',   desc: 'Oversized & street',     styleTags: ['streetwear'],               fit: 'oversized', image: u('1603808033192-082d6919d3e1') },
      { id: 'cargo',          label: 'Cargo Pants',       desc: 'Utilitarian with pockets',styleTags: ['streetwear', 'techwear'],  fit: 'relaxed',   image: u('1578932750294-f5075e85f44a') },
      { id: 'leggings',       label: 'Leggings',          desc: 'Fitted & active',        styleTags: ['athleisure'],               fit: 'slim',      image: u('1571945153237-4929e783af4a') },
      { id: 'trousers',       label: 'Dress Trousers',    desc: 'Tailored & polished',    styleTags: ['business casual', 'minimal'],fit: 'tailored', image: u('1481214110143-ed630356e1bb') },
      { id: 'denim_shorts',   label: 'Denim Shorts',      desc: 'Casual & summer-ready',  styleTags: ['casual', 'coastal'],        fit: 'relaxed',   image: u('1506629082955-511b1aa562c8') },
      { id: 'bike_shorts',    label: 'Bike Shorts',       desc: 'Sporty & Y2K',           styleTags: ['y2k', 'athleisure'],        fit: 'slim',      image: u('1523381140794-a1eef12c1d2a') },
    ],
  },

  // ── 2. TOPS ──────────────────────────────────────────────────────
  {
    id: 'tops',
    title: 'Tops',
    subtitle: 'Pick every top style that feels like you',
    items: [
      { id: 'basic_tee',      label: 'Basic Tee',         desc: 'Minimal & everyday',     styleTags: ['minimal', 'casual'],        fit: 'straight',  image: u('1503341504253-dff4815485f1') },
      { id: 'oversized_tee',  label: 'Oversized Tee',     desc: 'Relaxed & effortless',   styleTags: ['streetwear', 'casual'],     fit: 'oversized', image: u('1542291026-7eec264c27ff') },
      { id: 'crop_top',       label: 'Crop Top',          desc: 'Fitted & trendy',        styleTags: ['y2k', 'trendy'],            fit: 'slim',      image: u('1515886657613-9ac6c3c9a2e5') },
      { id: 'tank_cami',      label: 'Tank / Cami',       desc: 'Sleek & layerable',      styleTags: ['minimal', 'coastal'],       fit: 'slim',      image: u('1558769132-cb1aea458c5e') },
      { id: 'button_down',    label: 'Button-Down',       desc: 'Preppy & clean',         styleTags: ['preppy', 'business casual'],fit: 'straight', image: u('1568702846914-96b305d2aaeb') },
      { id: 'blouse',         label: 'Blouse',            desc: 'Feminine & flowy',       styleTags: ['bohemian', 'minimal'],      fit: 'relaxed',   image: u('1483985988355-763728e1480b') },
      { id: 'bodysuit',       label: 'Bodysuit',          desc: 'Sleek & polished',       styleTags: ['minimal', 'old money'],     fit: 'slim',      image: u('1539109136881-3be0616acf4b') },
      { id: 'off_shoulder',   label: 'Off-Shoulder',      desc: 'Feminine & flirty',      styleTags: ['coastal', 'resort / vacation'], fit: 'relaxed', image: u('1487222477894-8a7291b40f03') },
      { id: 'graphic_tee',    label: 'Graphic Tee',       desc: 'Expressive & casual',    styleTags: ['streetwear', 'vintage'],    fit: 'relaxed',   image: u('1570295999919-56ceb5ecca61') },
      { id: 'polo',           label: 'Polo / Collar Shirt',desc: 'Preppy & classic',      styleTags: ['preppy', 'old money'],      fit: 'straight',  image: u('1583744946564-b194ac1fca4c') },
    ],
  },

  // ── 3. DRESSES & SKIRTS ──────────────────────────────────────────
  {
    id: 'dresses',
    title: 'Dresses & Skirts',
    subtitle: 'Select everything you gravitate toward',
    items: [
      { id: 'mini_dress',     label: 'Mini Dress',        desc: 'Playful & flirty',       styleTags: ['y2k', 'date night'],        fit: 'slim',      image: u('1559181567-c3190100191d') },
      { id: 'midi_dress',     label: 'Midi Dress',        desc: 'Versatile & elegant',    styleTags: ['minimal', 'smart casual'],  fit: 'straight',  image: u('1551232864-3f0890e580d9') },
      { id: 'maxi_dress',     label: 'Maxi Dress',        desc: 'Flowy & bohemian',       styleTags: ['bohemian', 'resort / vacation'], fit: 'relaxed', image: u('1517457373958-b7bdd4587205') },
      { id: 'mini_skirt',     label: 'Mini Skirt',        desc: 'Bold & playful',         styleTags: ['y2k', 'trendy'],            fit: 'slim',      image: u('1622122201714-77da0ca8e5d2') },
      { id: 'midi_skirt',     label: 'Midi Skirt',        desc: 'Sophisticated & polished',styleTags: ['minimal', 'old money'],    fit: 'straight',  image: u('1591369822096-ffc2b5b5c71d') },
      { id: 'maxi_skirt',     label: 'Maxi Skirt',        desc: 'Dramatic & bohemian',    styleTags: ['bohemian', 'cottagecore'],  fit: 'relaxed',   image: u('1490481651871-ab68de25d43d') },
      { id: 'slip_dress',     label: 'Slip Dress',        desc: 'Minimal & sleek',        styleTags: ['minimal', 'quiet luxury'],  fit: 'slim',      image: u('1613521140590-1dce0a3e3c6b') },
      { id: 'wrap_dress',     label: 'Wrap Dress',        desc: 'Flattering & feminine',  styleTags: ['smart casual', 'date night'], fit: 'tailored', image: u('1604014237800-1c794574a2d6') },
      { id: 'denim_skirt',    label: 'Denim Skirt',       desc: 'Casual & classic',       styleTags: ['casual', 'vintage'],        fit: 'straight',  image: u('1609505848912-b7c3b8b4b8d5') },
      { id: 'tennis_skirt',   label: 'Tennis Skirt',      desc: 'Sporty & flirty',        styleTags: ['y2k', 'preppy'],            fit: 'relaxed',   image: u('1624798129017-3d1b88e39d9c') },
    ],
  },

  // ── 4. OUTERWEAR ─────────────────────────────────────────────────
  {
    id: 'outerwear',
    title: 'Outerwear',
    subtitle: 'What do you reach for when it gets cold?',
    items: [
      { id: 'oversized_blazer', label: 'Oversized Blazer', desc: 'Power & minimal',       styleTags: ['old money', 'smart casual'],  fit: 'oversized', image: u('1581044777550-4cfa60707c03') },
      { id: 'fitted_blazer',  label: 'Fitted Blazer',     desc: 'Tailored & polished',    styleTags: ['business casual', 'minimal'], fit: 'tailored',  image: u('1617347454861-89c22f0503ef') },
      { id: 'leather_jacket', label: 'Leather Jacket',    desc: 'Edgy & cool',            styleTags: ['rockstar', 'streetwear'],     fit: 'fitted',    image: u('1598532213673-8f3e14e1e898') },
      { id: 'denim_jacket',   label: 'Denim Jacket',      desc: 'Casual & classic',       styleTags: ['casual', 'vintage'],          fit: 'straight',  image: u('1554412933-514b977a8b27') },
      { id: 'trench_coat',    label: 'Trench Coat',       desc: 'Classic & elegant',      styleTags: ['old money', 'minimal'],       fit: 'straight',  image: u('1548036161-aa9eb18b0b34') },
      { id: 'puffer',         label: 'Puffer Jacket',     desc: 'Casual & cozy',          styleTags: ['streetwear', 'casual'],       fit: 'oversized', image: u('1605763240000-7374c4d3b8b8') },
      { id: 'chunky_cardigan',label: 'Chunky Cardigan',   desc: 'Cozy & oversized',       styleTags: ['cottagecore', 'casual'],      fit: 'oversized', image: u('1559756688-98d2d8a3e3e3') },
      { id: 'knit_cardigan',  label: 'Fine Knit Cardigan',desc: 'Minimal & sleek',        styleTags: ['minimal', 'preppy'],          fit: 'relaxed',   image: u('1573047213-4b0b6c6b6b6b') },
      { id: 'hoodie',         label: 'Hoodie',            desc: 'Relaxed & everyday',     styleTags: ['streetwear', 'casual'],       fit: 'oversized', image: u('1556821840-3a63f10be5a5') },
      { id: 'bomber',         label: 'Bomber Jacket',     desc: 'Streetwear & cool',      styleTags: ['streetwear', 'y2k'],          fit: 'relaxed',   image: u('1509631179647-0177331693ae') },
    ],
  },

  // ── 5. SHOES ─────────────────────────────────────────────────────
  {
    id: 'shoes',
    title: 'Shoes',
    subtitle: 'Pick every pair that belongs in your closet',
    items: [
      { id: 'white_sneakers', label: 'White Sneakers',    desc: 'Minimal & clean',        styleTags: ['minimal', 'casual'],         fit: null, image: u('1549298916-b41d501d3772') },
      { id: 'chunky_sneakers',label: 'Chunky Sneakers',   desc: 'Bold & Y2K',             styleTags: ['y2k', 'streetwear'],         fit: null, image: u('1606107557195-0e29a4b5b4b0') },
      { id: 'athletic',       label: 'Running / Athletic',desc: 'Sporty & functional',    styleTags: ['athleisure'],                fit: null, image: u('1542291026-7eec264c27ff') },
      { id: 'heeled_boots',   label: 'Heeled Boots',      desc: 'Edgy & elevated',        styleTags: ['rockstar', 'dark academia'],  fit: null, image: u('1434389677669-e08b4cac3105') },
      { id: 'flat_boots',     label: 'Chelsea / Flat Boots',desc:'Versatile & classic',   styleTags: ['minimal', 'casual'],         fit: null, image: u('1520639888713-7851133b1ed0') },
      { id: 'knee_high',      label: 'Knee-High Boots',   desc: 'Statement & bold',       styleTags: ['old money', 'dark academia'], fit: null, image: u('1485462537746-965f33f84f2b') },
      { id: 'block_heels',    label: 'Block Heels',       desc: 'Comfortable & elevated', styleTags: ['smart casual', 'date night'], fit: null, image: u('1515347851-8e4f16a8a8a8') },
      { id: 'strappy_heels',  label: 'Strappy Heels',     desc: 'Feminine & dressy',      styleTags: ['date night', 'resort / vacation'], fit: null, image: u('1519689373923-129aa9b2b3b3') },
      { id: 'loafers',        label: 'Loafers / Ballet Flats',desc:'Preppy & minimal',    styleTags: ['preppy', 'old money'],       fit: null, image: u('1554412933-514b977a8b27') },
      { id: 'sandals',        label: 'Sandals / Mules',   desc: 'Casual & effortless',    styleTags: ['coastal', 'bohemian'],       fit: null, image: u('1552902865-b72c031ac5ea') },
    ],
  },

  // ── 6. ACCESSORIES ───────────────────────────────────────────────
  {
    id: 'accessories',
    title: 'Accessories',
    subtitle: 'The finishing touches that say the most',
    items: [
      { id: 'dainty_jewelry', label: 'Dainty Jewelry',    desc: 'Subtle & elegant',       styleTags: ['minimal', 'quiet luxury'],   fit: null, image: u('1515886657613-9ac6c3c9a2e5') },
      { id: 'statement_jewelry',label:'Statement Jewelry', desc: 'Bold & expressive',     styleTags: ['avant-garde', 'rockstar'],   fit: null, image: u('1573047213-4b0b6c6b6b6b') },
      { id: 'layered_necklaces',label:'Layered Necklaces', desc: 'Boho & trendy',         styleTags: ['bohemian', 'vintage'],       fit: null, image: u('1570295999919-56ceb5ecca61') },
      { id: 'hoop_earrings',  label: 'Hoop Earrings',     desc: 'Classic & versatile',    styleTags: ['casual', 'streetwear'],      fit: null, image: u('1517841905240-4726e3d4a4a4') },
      { id: 'structured_bag', label: 'Structured Bag',    desc: 'Polished & elevated',    styleTags: ['old money', 'business casual'],fit: null, image: u('1548036161-aa9eb18b0b34') },
      { id: 'crossbody',      label: 'Mini Crossbody',    desc: 'Casual & practical',     styleTags: ['casual', 'y2k'],             fit: null, image: u('1553062407-98eeb64c6a6c') },
      { id: 'tote',           label: 'Tote Bag',          desc: 'Practical & minimal',    styleTags: ['minimal', 'normcore'],       fit: null, image: u('1614854262340-ab1ca7d079c7') },
      { id: 'baseball_cap',   label: 'Baseball Cap',      desc: 'Streetwear & casual',    styleTags: ['streetwear', 'athleisure'],  fit: null, image: u('1524592094714-0f0654e20314') },
      { id: 'sunglasses',     label: 'Sunglasses',        desc: 'Effortless cool',        styleTags: ['coastal', 'minimal'],        fit: null, image: u('1529753253655-470be6b53c7c') },
      { id: 'belt',           label: 'Belt',              desc: 'Defining & polished',    styleTags: ['old money', 'minimal'],      fit: null, image: u('1552902865-b72c031ac5ea') },
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
