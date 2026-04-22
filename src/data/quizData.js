// Image URLs sourced from Who What Wear editorial photography.
// To swap any image, replace just the URL string for that item.

export const QUIZ_CATEGORIES = [
  // ── 1. BOTTOMS ───────────────────────────────────────────────────
  {
    id: 'bottoms',
    title: 'Bottoms',
    subtitle: "Select every style you'd actually wear",
    items: [
      { id: 'skinny_jeans',   label: 'Skinny Jeans',      desc: 'Slim & fitted',           styleTags: ['casual', 'classic'],          fit: 'slim',      image: 'https://images.pexels.com/photos/18533668/pexels-photo-18533668.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'straight_jeans', label: 'Straight Leg',       desc: 'Relaxed & everyday',      styleTags: ['casual', 'minimal'],          fit: 'straight',  image: 'https://images.pexels.com/photos/17630811/pexels-photo-17630811.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'wide_leg',       label: 'Wide Leg / Flare',   desc: 'Flowy & statement',       styleTags: ['bohemian', 'trendy'],         fit: 'wide',      image: 'https://images.pexels.com/photos/18533668/pexels-photo-18533668.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'mom_jeans',      label: 'Mom Jeans',          desc: 'High-waist, vintage feel', styleTags: ['vintage', 'casual'],         fit: 'relaxed',   image: 'https://images.pexels.com/photos/17720437/pexels-photo-17720437.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'baggy',          label: 'Baggy / Relaxed',    desc: 'Oversized & street',      styleTags: ['streetwear'],                 fit: 'oversized', image: 'https://images.pexels.com/photos/17720437/pexels-photo-17720437.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'cargo',          label: 'Cargo Pants',        desc: 'Utilitarian with pockets', styleTags: ['streetwear', 'techwear'],   fit: 'relaxed',   image: 'https://images.pexels.com/photos/9065153/pexels-photo-9065153.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'leggings',       label: 'Leggings',           desc: 'Fitted & active',         styleTags: ['athleisure'],                 fit: 'slim',      image: 'https://images.pexels.com/photos/4889723/pexels-photo-4889723.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'trousers',       label: 'Dress Trousers',     desc: 'Tailored & polished',     styleTags: ['business casual', 'minimal'], fit: 'tailored',  image: 'https://images.pexels.com/photos/33633245/pexels-photo-33633245.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'denim_shorts',   label: 'Denim Shorts',       desc: 'Casual & summer-ready',   styleTags: ['casual', 'coastal'],          fit: 'relaxed',   image: 'https://images.pexels.com/photos/4554337/pexels-photo-4554337.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'bike_shorts',    label: 'Bike Shorts',        desc: 'Sporty & Y2K',            styleTags: ['y2k', 'athleisure'],          fit: 'slim',      image: 'https://images.pexels.com/photos/16929212/pexels-photo-16929212.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
    ],
  },

  // ── 2. TOPS ──────────────────────────────────────────────────────
  {
    id: 'tops',
    title: 'Tops',
    subtitle: 'Pick every top style that feels like you',
    items: [
      { id: 'basic_tee',       label: 'Basic Tee',          desc: 'Minimal & everyday',      styleTags: ['minimal', 'casual'],          fit: 'straight',  image: 'https://images.pexels.com/photos/12025472/pexels-photo-12025472.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'oversized_tee',   label: 'Oversized Tee',      desc: 'Relaxed & effortless',    styleTags: ['streetwear', 'casual'],       fit: 'oversized', image: 'https://images.pexels.com/photos/9558265/pexels-photo-9558265.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'crop_top',        label: 'Crop Top',           desc: 'Fitted & trendy',         styleTags: ['y2k', 'trendy'],              fit: 'slim',      image: 'https://images.pexels.com/photos/9594418/pexels-photo-9594418.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'tank_cami',       label: 'Tank / Cami',        desc: 'Sleek & layerable',       styleTags: ['minimal', 'coastal'],         fit: 'slim',      image: 'https://images.pexels.com/photos/9594418/pexels-photo-9594418.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'button_down',     label: 'Button-Down',        desc: 'Preppy & clean',          styleTags: ['preppy', 'business casual'],  fit: 'straight',  image: 'https://images.pexels.com/photos/6276005/pexels-photo-6276005.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'blouse',          label: 'Blouse',             desc: 'Feminine & flowy',        styleTags: ['bohemian', 'minimal'],        fit: 'relaxed',   image: 'https://images.pexels.com/photos/7235669/pexels-photo-7235669.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'bodysuit',        label: 'Bodysuit',           desc: 'Sleek & polished',        styleTags: ['minimal', 'old money'],       fit: 'slim',      image: 'https://images.pexels.com/photos/9162883/pexels-photo-9162883.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'off_shoulder',    label: 'Off-Shoulder',       desc: 'Feminine & flirty',       styleTags: ['coastal', 'resort / vacation'], fit: 'relaxed', image: 'https://images.pexels.com/photos/33772492/pexels-photo-33772492.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'graphic_tee',     label: 'Graphic Tee',        desc: 'Expressive & casual',     styleTags: ['streetwear', 'vintage'],      fit: 'relaxed',   image: 'https://images.pexels.com/photos/12025472/pexels-photo-12025472.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'polo',            label: 'Polo / Collar Shirt', desc: 'Preppy & classic',       styleTags: ['preppy', 'old money'],        fit: 'straight',  image: 'https://images.pexels.com/photos/28297697/pexels-photo-28297697.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
    ],
  },

  // ── 3. DRESSES & SKIRTS ──────────────────────────────────────────
  {
    id: 'dresses',
    title: 'Dresses & Skirts',
    subtitle: 'Select everything you gravitate toward',
    items: [
      { id: 'mini_dress',      label: 'Mini Dress',         desc: 'Playful & flirty',        styleTags: ['y2k', 'date night'],          fit: 'slim',      image: 'https://images.pexels.com/photos/5693889/pexels-photo-5693889.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'midi_dress',      label: 'Midi Dress',         desc: 'Versatile & elegant',     styleTags: ['minimal', 'smart casual'],    fit: 'straight',  image: 'https://images.pexels.com/photos/5693889/pexels-photo-5693889.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'maxi_dress',      label: 'Maxi Dress',         desc: 'Flowy & bohemian',        styleTags: ['bohemian', 'resort / vacation'], fit: 'relaxed', image: 'https://images.pexels.com/photos/34225147/pexels-photo-34225147.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'mini_skirt',      label: 'Mini Skirt',         desc: 'Bold & playful',          styleTags: ['y2k', 'trendy'],              fit: 'slim',      image: 'https://images.pexels.com/photos/14687474/pexels-photo-14687474.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'midi_skirt',      label: 'Midi Skirt',         desc: 'Sophisticated & polished', styleTags: ['minimal', 'old money'],      fit: 'straight',  image: 'https://images.pexels.com/photos/4690501/pexels-photo-4690501.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'maxi_skirt',      label: 'Maxi Skirt',         desc: 'Dramatic & bohemian',     styleTags: ['bohemian', 'cottagecore'],    fit: 'relaxed',   image: 'https://images.pexels.com/photos/4458519/pexels-photo-4458519.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'slip_dress',      label: 'Slip Dress',         desc: 'Minimal & sleek',         styleTags: ['minimal', 'quiet luxury'],    fit: 'slim',      image: 'https://images.pexels.com/photos/18235315/pexels-photo-18235315.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'wrap_dress',      label: 'Wrap Dress',         desc: 'Flattering & feminine',   styleTags: ['smart casual', 'date night'], fit: 'tailored',  image: 'https://images.pexels.com/photos/5405629/pexels-photo-5405629.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'denim_skirt',     label: 'Denim Skirt',        desc: 'Casual & classic',        styleTags: ['casual', 'vintage'],          fit: 'straight',  image: 'https://images.pexels.com/photos/8408556/pexels-photo-8408556.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'tennis_skirt',    label: 'Tennis Skirt',       desc: 'Sporty & flirty',         styleTags: ['y2k', 'preppy'],              fit: 'relaxed',   image: 'https://images.pexels.com/photos/28726930/pexels-photo-28726930.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
    ],
  },

  // ── 4. OUTERWEAR ─────────────────────────────────────────────────
  {
    id: 'outerwear',
    title: 'Outerwear',
    subtitle: 'What do you reach for when it gets cold?',
    items: [
      { id: 'oversized_blazer', label: 'Oversized Blazer',  desc: 'Power & minimal',         styleTags: ['old money', 'smart casual'],  fit: 'oversized', image: 'https://images.pexels.com/photos/9417308/pexels-photo-9417308.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'fitted_blazer',   label: 'Fitted Blazer',      desc: 'Tailored & polished',     styleTags: ['business casual', 'minimal'], fit: 'tailored',  image: 'https://images.pexels.com/photos/18951524/pexels-photo-18951524.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'leather_jacket',  label: 'Leather Jacket',     desc: 'Edgy & cool',             styleTags: ['rockstar', 'streetwear'],     fit: 'fitted',    image: 'https://images.pexels.com/photos/6044143/pexels-photo-6044143.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'denim_jacket',    label: 'Denim Jacket',       desc: 'Casual & classic',        styleTags: ['casual', 'vintage'],          fit: 'straight',  image: 'https://images.pexels.com/photos/6843231/pexels-photo-6843231.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'trench_coat',     label: 'Trench Coat',        desc: 'Classic & elegant',       styleTags: ['old money', 'minimal'],       fit: 'straight',  image: 'https://images.pexels.com/photos/4057673/pexels-photo-4057673.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'puffer',          label: 'Puffer Jacket',      desc: 'Casual & cozy',           styleTags: ['streetwear', 'casual'],       fit: 'oversized', image: 'https://images.pexels.com/photos/13513247/pexels-photo-13513247.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'chunky_cardigan', label: 'Chunky Cardigan',    desc: 'Cozy & oversized',        styleTags: ['cottagecore', 'casual'],      fit: 'oversized', image: 'https://images.pexels.com/photos/36129313/pexels-photo-36129313.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'knit_cardigan',   label: 'Fine Knit Cardigan', desc: 'Minimal & sleek',         styleTags: ['minimal', 'preppy'],          fit: 'relaxed',   image: 'https://images.pexels.com/photos/36129313/pexels-photo-36129313.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'hoodie',          label: 'Hoodie',             desc: 'Relaxed & everyday',      styleTags: ['streetwear', 'casual'],       fit: 'oversized', image: 'https://images.pexels.com/photos/8217415/pexels-photo-8217415.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'bomber',          label: 'Bomber Jacket',      desc: 'Streetwear & cool',       styleTags: ['streetwear', 'y2k'],          fit: 'relaxed',   image: 'https://images.pexels.com/photos/6044143/pexels-photo-6044143.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
    ],
  },

  // ── 5. SHOES ─────────────────────────────────────────────────────
  {
    id: 'shoes',
    title: 'Shoes',
    subtitle: 'Pick every pair that belongs in your closet',
    items: [
      { id: 'white_sneakers',  label: 'White Sneakers',     desc: 'Minimal & clean',         styleTags: ['minimal', 'casual'],          fit: null, image: 'https://images.pexels.com/photos/27204251/pexels-photo-27204251.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'chunky_sneakers', label: 'Chunky Sneakers',    desc: 'Bold & Y2K',              styleTags: ['y2k', 'streetwear'],          fit: null, image: 'https://images.pexels.com/photos/5788986/pexels-photo-5788986.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'athletic',        label: 'Running / Athletic', desc: 'Sporty & functional',     styleTags: ['athleisure'],                 fit: null, image: 'https://images.pexels.com/photos/1456733/pexels-photo-1456733.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'heeled_boots',    label: 'Heeled Boots',       desc: 'Edgy & elevated',         styleTags: ['rockstar', 'dark academia'],  fit: null, image: 'https://images.pexels.com/photos/26772104/pexels-photo-26772104.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'flat_boots',      label: 'Chelsea / Flat Boots', desc: 'Versatile & classic',   styleTags: ['minimal', 'casual'],          fit: null, image: 'https://images.pexels.com/photos/27256456/pexels-photo-27256456.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'knee_high',       label: 'Knee-High Boots',    desc: 'Statement & bold',        styleTags: ['old money', 'dark academia'], fit: null, image: 'https://images.pexels.com/photos/27141849/pexels-photo-27141849.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'block_heels',     label: 'Block Heels',        desc: 'Comfortable & elevated',  styleTags: ['smart casual', 'date night'], fit: null, image: 'https://images.pexels.com/photos/29870211/pexels-photo-29870211.png?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'strappy_heels',   label: 'Strappy Heels',      desc: 'Feminine & dressy',       styleTags: ['date night', 'resort / vacation'], fit: null, image: 'https://images.pexels.com/photos/32851167/pexels-photo-32851167.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'loafers',         label: 'Loafers / Ballet Flats', desc: 'Preppy & minimal',    styleTags: ['preppy', 'old money'],        fit: null, image: 'https://images.pexels.com/photos/31935085/pexels-photo-31935085.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'sandals',         label: 'Sandals / Mules',    desc: 'Casual & effortless',     styleTags: ['coastal', 'bohemian'],        fit: null, image: 'https://images.pexels.com/photos/26925267/pexels-photo-26925267.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
    ],
  },

  // ── 6. ACCESSORIES ───────────────────────────────────────────────
  {
    id: 'accessories',
    title: 'Accessories',
    subtitle: 'The finishing touches that say the most',
    items: [
      { id: 'dainty_jewelry',    label: 'Dainty Jewelry',     desc: 'Subtle & elegant',        styleTags: ['minimal', 'quiet luxury'],    fit: null, image: 'https://images.pexels.com/photos/26570970/pexels-photo-26570970.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'statement_jewelry', label: 'Statement Jewelry',  desc: 'Bold & expressive',       styleTags: ['avant-garde', 'rockstar'],    fit: null, image: 'https://images.pexels.com/photos/34501351/pexels-photo-34501351.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'layered_necklaces', label: 'Layered Necklaces',  desc: 'Boho & trendy',           styleTags: ['bohemian', 'vintage'],        fit: null, image: 'https://images.pexels.com/photos/4735895/pexels-photo-4735895.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'hoop_earrings',     label: 'Hoop Earrings',      desc: 'Classic & versatile',     styleTags: ['casual', 'streetwear'],       fit: null, image: 'https://images.pexels.com/photos/30988729/pexels-photo-30988729.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'structured_bag',    label: 'Structured Bag',     desc: 'Polished & elevated',     styleTags: ['old money', 'business casual'], fit: null, image: 'https://images.pexels.com/photos/27204286/pexels-photo-27204286.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'crossbody',         label: 'Mini Crossbody',     desc: 'Casual & practical',      styleTags: ['casual', 'y2k'],              fit: null, image: 'https://images.pexels.com/photos/27204287/pexels-photo-27204287.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'tote',              label: 'Tote Bag',           desc: 'Practical & minimal',     styleTags: ['minimal', 'normcore'],        fit: null, image: 'https://images.pexels.com/photos/19197736/pexels-photo-19197736.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'baseball_cap',      label: 'Baseball Cap',       desc: 'Streetwear & casual',     styleTags: ['streetwear', 'athleisure'],   fit: null, image: 'https://images.pexels.com/photos/26956139/pexels-photo-26956139.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'sunglasses',        label: 'Sunglasses',         desc: 'Effortless cool',         styleTags: ['coastal', 'minimal'],         fit: null, image: 'https://images.pexels.com/photos/27353350/pexels-photo-27353350.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { id: 'belt',              label: 'Belt',               desc: 'Defining & polished',     styleTags: ['old money', 'minimal'],       fit: null, image: 'https://images.pexels.com/photos/35322153/pexels-photo-35322153.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
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
