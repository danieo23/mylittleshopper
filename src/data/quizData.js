// Image URLs sourced from Who What Wear editorial photography.
// To swap any image, replace just the URL string for that item.

export const QUIZ_CATEGORIES = [
  // ── 1. BOTTOMS ───────────────────────────────────────────────────
  {
    id: 'bottoms',
    title: 'Bottoms',
    subtitle: "Select every style you'd actually wear",
    items: [
      { id: 'skinny_jeans',   label: 'Skinny Jeans',      desc: 'Slim & fitted',           styleTags: ['casual', 'classic'],          fit: 'slim',      image: 'https://cdn.mos.cms.futurecdn.net/PqqfnEWnX7e5k34QGXjf9A.jpg' },
      { id: 'straight_jeans', label: 'Straight Leg',       desc: 'Relaxed & everyday',      styleTags: ['casual', 'minimal'],          fit: 'straight',  image: 'https://cdn.mos.cms.futurecdn.net/vp2kUv35nGbkTS5XM4tybB.jpg' },
      { id: 'wide_leg',       label: 'Wide Leg / Flare',   desc: 'Flowy & statement',       styleTags: ['bohemian', 'trendy'],         fit: 'wide',      image: 'https://cdn.mos.cms.futurecdn.net/whowhatwear/posts/241750/how-to-wear-wide-jeans-241750-1605148677967-image.jpg' },
      { id: 'mom_jeans',      label: 'Mom Jeans',          desc: 'High-waist, vintage feel', styleTags: ['vintage', 'casual'],         fit: 'relaxed',   image: 'https://cdn.mos.cms.futurecdn.net/whowhatwear/posts/211633/-2021753-1481825148.jpg' },
      { id: 'baggy',          label: 'Baggy / Relaxed',    desc: 'Oversized & street',      styleTags: ['streetwear'],                 fit: 'oversized', image: 'https://cdn.mos.cms.futurecdn.net/whowhatwear/posts/278197/outfits-with-baggy-jeans-278197-1682460013669-fb.jpg' },
      { id: 'cargo',          label: 'Cargo Pants',        desc: 'Utilitarian with pockets', styleTags: ['streetwear', 'techwear'],   fit: 'relaxed',   image: 'https://cdn.mos.cms.futurecdn.net/whowhatwear/posts/299504/cargo-pants-outfits-299504-1651080879588-fb.jpg' },
      { id: 'leggings',       label: 'Leggings',           desc: 'Fitted & active',         styleTags: ['athleisure'],                 fit: 'slim',      image: 'https://cdn.mos.cms.futurecdn.net/eMawKYRt24bUJwaVP828hG.jpg' },
      { id: 'trousers',       label: 'Dress Trousers',     desc: 'Tailored & polished',     styleTags: ['business casual', 'minimal'], fit: 'tailored',  image: 'https://cdn.mos.cms.futurecdn.net/5virkxgxaJhYbdiTzGhpw4.jpg' },
      { id: 'denim_shorts',   label: 'Denim Shorts',       desc: 'Casual & summer-ready',   styleTags: ['casual', 'coastal'],          fit: 'relaxed',   image: 'https://cdn.mos.cms.futurecdn.net/yHxgbrRvNjieW5M6VRfJJC.jpg' },
      { id: 'bike_shorts',    label: 'Bike Shorts',        desc: 'Sporty & Y2K',            styleTags: ['y2k', 'athleisure'],          fit: 'slim',      image: 'https://cdn.mos.cms.futurecdn.net/whowhatwear/posts/287669/how-to-style-biker-shorts-287669-1591721458947-image.jpg' },
    ],
  },

  // ── 2. TOPS ──────────────────────────────────────────────────────
  {
    id: 'tops',
    title: 'Tops',
    subtitle: 'Pick every top style that feels like you',
    items: [
      { id: 'basic_tee',       label: 'Basic Tee',          desc: 'Minimal & everyday',      styleTags: ['minimal', 'casual'],          fit: 'straight',  image: 'https://cdn.mos.cms.futurecdn.net/whowhatwear/posts/220336/white-t-shirt-outfit-ideas-220336-1631107063752-main.jpg' },
      { id: 'oversized_tee',   label: 'Oversized Tee',      desc: 'Relaxed & effortless',    styleTags: ['streetwear', 'casual'],       fit: 'oversized', image: 'https://cdn.mos.cms.futurecdn.net/KzzGfiKFLCTVGTAxETRs6m.jpg' },
      { id: 'crop_top',        label: 'Crop Top',           desc: 'Fitted & trendy',         styleTags: ['y2k', 'trendy'],              fit: 'slim',      image: 'https://cdn.mos.cms.futurecdn.net/whowhatwear/posts/255369/crop-top-outfits-255369-1591915524619-main.jpg' },
      { id: 'tank_cami',       label: 'Tank / Cami',        desc: 'Sleek & layerable',       styleTags: ['minimal', 'coastal'],         fit: 'slim',      image: 'https://cdn.mos.cms.futurecdn.net/iSANNAu2ZmfiQPRsZkvpXc.jpg' },
      { id: 'button_down',     label: 'Button-Down',        desc: 'Preppy & clean',          styleTags: ['preppy', 'business casual'],  fit: 'straight',  image: 'https://cdn.mos.cms.futurecdn.net/whowhatwear/posts/299981/button-down-shirt-outfits-299981-1682049633490-main.jpg' },
      { id: 'blouse',          label: 'Blouse',             desc: 'Feminine & flowy',        styleTags: ['bohemian', 'minimal'],        fit: 'relaxed',   image: 'https://cdn.mos.cms.futurecdn.net/utUUtFjpoZn4YqRSXW7PqA.png' },
      { id: 'bodysuit',        label: 'Bodysuit',           desc: 'Sleek & polished',        styleTags: ['minimal', 'old money'],       fit: 'slim',      image: 'https://cdn.mos.cms.futurecdn.net/whowhatwear/posts/295467/bodysuit-and-jeans-outfits-295467-1632936364928-image.jpg' },
      { id: 'off_shoulder',    label: 'Off-Shoulder',       desc: 'Feminine & flirty',       styleTags: ['coastal', 'resort / vacation'], fit: 'relaxed', image: 'https://cdn.mos.cms.futurecdn.net/whowhatwear/posts/290902/off-the-shoulder-outfits-290902-1608578626403-image.jpg' },
      { id: 'graphic_tee',     label: 'Graphic Tee',        desc: 'Expressive & casual',     styleTags: ['streetwear', 'vintage'],      fit: 'relaxed',   image: 'https://cdn.mos.cms.futurecdn.net/iwUst2xrdDwDxa8JjjNU7G.jpg' },
      { id: 'polo',            label: 'Polo / Collar Shirt', desc: 'Preppy & classic',       styleTags: ['preppy', 'old money'],        fit: 'straight',  image: 'https://cdn.mos.cms.futurecdn.net/pEJ2topMFQxVXKTygDQY2e.jpg' },
    ],
  },

  // ── 3. DRESSES & SKIRTS ──────────────────────────────────────────
  {
    id: 'dresses',
    title: 'Dresses & Skirts',
    subtitle: 'Select everything you gravitate toward',
    items: [
      { id: 'mini_dress',      label: 'Mini Dress',         desc: 'Playful & flirty',        styleTags: ['y2k', 'date night'],          fit: 'slim',      image: 'https://cdn.mos.cms.futurecdn.net/tv9BBmmZ6vm7rcEYYmZoR6.jpg' },
      { id: 'midi_dress',      label: 'Midi Dress',         desc: 'Versatile & elegant',     styleTags: ['minimal', 'smart casual'],    fit: 'straight',  image: 'https://cdn.mos.cms.futurecdn.net/fiBCJ2d7oKiPXThcBx4D4Q.jpg' },
      { id: 'maxi_dress',      label: 'Maxi Dress',         desc: 'Flowy & bohemian',        styleTags: ['bohemian', 'resort / vacation'], fit: 'relaxed', image: 'https://cdn.mos.cms.futurecdn.net/whowhatwear/posts/287689/maxi-dress-outfits-287689-1591801537282-main.jpg' },
      { id: 'mini_skirt',      label: 'Mini Skirt',         desc: 'Bold & playful',          styleTags: ['y2k', 'trendy'],              fit: 'slim',      image: 'https://cdn.mos.cms.futurecdn.net/fZqHkQEur57Cp57XMJ7GjJ.jpg' },
      { id: 'midi_skirt',      label: 'Midi Skirt',         desc: 'Sophisticated & polished', styleTags: ['minimal', 'old money'],      fit: 'straight',  image: 'https://cdn.mos.cms.futurecdn.net/uHkfW92tvqGBaUbEwi4coj.jpg' },
      { id: 'maxi_skirt',      label: 'Maxi Skirt',         desc: 'Dramatic & bohemian',     styleTags: ['bohemian', 'cottagecore'],    fit: 'relaxed',   image: 'https://cdn.mos.cms.futurecdn.net/JhEjC9CDjUuMHdh9zzjANg.jpg' },
      { id: 'slip_dress',      label: 'Slip Dress',         desc: 'Minimal & sleek',         styleTags: ['minimal', 'quiet luxury'],    fit: 'slim',      image: 'https://cdn.mos.cms.futurecdn.net/whowhatwear/posts/297688/slip-dress-outfits-297688-1643915647636-image.jpg' },
      { id: 'wrap_dress',      label: 'Wrap Dress',         desc: 'Flattering & feminine',   styleTags: ['smart casual', 'date night'], fit: 'tailored',  image: 'https://cdn.mos.cms.futurecdn.net/whowhatwear/posts/262799/ways-to-wear-a-wrap-dress-262799-1531407688797-image.png' },
      { id: 'denim_skirt',     label: 'Denim Skirt',        desc: 'Casual & classic',        styleTags: ['casual', 'vintage'],          fit: 'straight',  image: 'https://cdn.mos.cms.futurecdn.net/N7uQ4G57iPybzvWw7uNf3N.jpg' },
      { id: 'tennis_skirt',    label: 'Tennis Skirt',       desc: 'Sporty & flirty',         styleTags: ['y2k', 'preppy'],              fit: 'relaxed',   image: 'https://cdn.mos.cms.futurecdn.net/whowhatwear/posts/289804/tennis-skirt-outfits-289804-1603834073871-image.jpg' },
    ],
  },

  // ── 4. OUTERWEAR ─────────────────────────────────────────────────
  {
    id: 'outerwear',
    title: 'Outerwear',
    subtitle: 'What do you reach for when it gets cold?',
    items: [
      { id: 'oversized_blazer', label: 'Oversized Blazer',  desc: 'Power & minimal',         styleTags: ['old money', 'smart casual'],  fit: 'oversized', image: 'https://cdn.mos.cms.futurecdn.net/whowhatwear/posts/270565/oversized-blazer-outfits-270565-1678643431157-image.jpg' },
      { id: 'fitted_blazer',   label: 'Fitted Blazer',      desc: 'Tailored & polished',     styleTags: ['business casual', 'minimal'], fit: 'tailored',  image: 'https://cdn.mos.cms.futurecdn.net/z3NvPCP2LEMrSANKE82tqj.jpg' },
      { id: 'leather_jacket',  label: 'Leather Jacket',     desc: 'Edgy & cool',             styleTags: ['rockstar', 'streetwear'],     fit: 'fitted',    image: 'https://cdn.mos.cms.futurecdn.net/gDa4FkPnf5QCZWV8F5Zohg.jpg' },
      { id: 'denim_jacket',    label: 'Denim Jacket',       desc: 'Casual & classic',        styleTags: ['casual', 'vintage'],          fit: 'straight',  image: 'https://cdn.mos.cms.futurecdn.net/iQCjnpgfctfqmAfn8ES76J.jpg' },
      { id: 'trench_coat',     label: 'Trench Coat',        desc: 'Classic & elegant',       styleTags: ['old money', 'minimal'],       fit: 'straight',  image: 'https://cdn.mos.cms.futurecdn.net/F2pBXovZCgpQGJkSBRzTcj.jpg' },
      { id: 'puffer',          label: 'Puffer Jacket',      desc: 'Casual & cozy',           styleTags: ['streetwear', 'casual'],       fit: 'oversized', image: 'https://cdn.mos.cms.futurecdn.net/whowhatwear/posts/272874/puffer-jacket-outfits-272874-1705502387188-main.jpg' },
      { id: 'chunky_cardigan', label: 'Chunky Cardigan',    desc: 'Cozy & oversized',        styleTags: ['cottagecore', 'casual'],      fit: 'oversized', image: 'https://cdn.mos.cms.futurecdn.net/KdjxqWoEg6Y5wvVpwboskA.jpg' },
      { id: 'knit_cardigan',   label: 'Fine Knit Cardigan', desc: 'Minimal & sleek',         styleTags: ['minimal', 'preppy'],          fit: 'relaxed',   image: 'https://cdn.mos.cms.futurecdn.net/z3ooVFzqXJZYacorGBwW3M.jpg' },
      { id: 'hoodie',          label: 'Hoodie',             desc: 'Relaxed & everyday',      styleTags: ['streetwear', 'casual'],       fit: 'oversized', image: 'https://cdn.mos.cms.futurecdn.net/UrHAVT2TWtg98WESRLi5zA.jpg' },
      { id: 'bomber',          label: 'Bomber Jacket',      desc: 'Streetwear & cool',       styleTags: ['streetwear', 'y2k'],          fit: 'relaxed',   image: 'https://cdn.mos.cms.futurecdn.net/Y4CTjQvtFsy9gjtvNQEdBG.jpg' },
    ],
  },

  // ── 5. SHOES ─────────────────────────────────────────────────────
  {
    id: 'shoes',
    title: 'Shoes',
    subtitle: 'Pick every pair that belongs in your closet',
    items: [
      { id: 'white_sneakers',  label: 'White Sneakers',     desc: 'Minimal & clean',         styleTags: ['minimal', 'casual'],          fit: null, image: 'https://cdn.mos.cms.futurecdn.net/whowhatwear/posts/263663/white-sneakers-outfits-263663-1683292916474-main.jpg' },
      { id: 'chunky_sneakers', label: 'Chunky Sneakers',    desc: 'Bold & Y2K',              styleTags: ['y2k', 'streetwear'],          fit: null, image: 'https://cdn.mos.cms.futurecdn.net/7CCQScZHP9WuqSNMsoeBfF.jpg' },
      { id: 'athletic',        label: 'Running / Athletic', desc: 'Sporty & functional',     styleTags: ['athleisure'],                 fit: null, image: 'https://cdn.mos.cms.futurecdn.net/whowhatwear/posts/268684/fall-outfits-with-running-shoes-268684-1537980439983-main.png' },
      { id: 'heeled_boots',    label: 'Heeled Boots',       desc: 'Edgy & elevated',         styleTags: ['rockstar', 'dark academia'],  fit: null, image: 'https://cdn.mos.cms.futurecdn.net/DC9VEkK9vCYvcPxWMceJDL.jpg' },
      { id: 'flat_boots',      label: 'Chelsea / Flat Boots', desc: 'Versatile & classic',   styleTags: ['minimal', 'casual'],          fit: null, image: 'https://cdn.mos.cms.futurecdn.net/whowhatwear/posts/274558/chelsea-boot-outfits-274558-1603817192406-image.jpg' },
      { id: 'knee_high',       label: 'Knee-High Boots',    desc: 'Statement & bold',        styleTags: ['old money', 'dark academia'], fit: null, image: 'https://cdn.mos.cms.futurecdn.net/fVSiSgWT6CoepvMZu6EZKn.jpg' },
      { id: 'block_heels',     label: 'Block Heels',        desc: 'Comfortable & elevated',  styleTags: ['smart casual', 'date night'], fit: null, image: 'https://cdn.mos.cms.futurecdn.net/H4gjKW4uKMiYjvkJhz3r6M.jpg' },
      { id: 'strappy_heels',   label: 'Strappy Heels',      desc: 'Feminine & dressy',       styleTags: ['date night', 'resort / vacation'], fit: null, image: 'https://cdn.mos.cms.futurecdn.net/woF3VJyFjqqrczfNKpD9MM.jpg' },
      { id: 'loafers',         label: 'Loafers / Ballet Flats', desc: 'Preppy & minimal',    styleTags: ['preppy', 'old money'],        fit: null, image: 'https://cdn.mos.cms.futurecdn.net/47aKaKWibXKAyFrdpSm2nn.jpg' },
      { id: 'sandals',         label: 'Sandals / Mules',    desc: 'Casual & effortless',     styleTags: ['coastal', 'bohemian'],        fit: null, image: 'https://cdn.mos.cms.futurecdn.net/yWzAB984uPS5RhD8oEkDF3.jpg' },
    ],
  },

  // ── 6. ACCESSORIES ───────────────────────────────────────────────
  {
    id: 'accessories',
    title: 'Accessories',
    subtitle: 'The finishing touches that say the most',
    items: [
      { id: 'dainty_jewelry',    label: 'Dainty Jewelry',     desc: 'Subtle & elegant',        styleTags: ['minimal', 'quiet luxury'],    fit: null, image: 'https://cdn.mos.cms.futurecdn.net/iRXzKcoa4ccyfJoLkTAYv8.jpg' },
      { id: 'statement_jewelry', label: 'Statement Jewelry',  desc: 'Bold & expressive',       styleTags: ['avant-garde', 'rockstar'],    fit: null, image: 'https://cdn.mos.cms.futurecdn.net/mT5WTJdXTuiR98HG8cmLT9.jpg' },
      { id: 'layered_necklaces', label: 'Layered Necklaces',  desc: 'Boho & trendy',           styleTags: ['bohemian', 'vintage'],        fit: null, image: 'https://cdn.mos.cms.futurecdn.net/whowhatwear/posts/84104/how-to-layer-necklaces-jewelry-84104-1529014525700-image.jpg' },
      { id: 'hoop_earrings',     label: 'Hoop Earrings',      desc: 'Classic & versatile',     styleTags: ['casual', 'streetwear'],       fit: null, image: 'https://cdn.mos.cms.futurecdn.net/whowhatwear/posts/238270/hoop-earrings-238270-1622682433204-main.jpg' },
      { id: 'structured_bag',    label: 'Structured Bag',     desc: 'Polished & elevated',     styleTags: ['old money', 'business casual'], fit: null, image: 'https://cdn.mos.cms.futurecdn.net/whowhatwear/posts/242385/top-handle-satchel-handbags-242385-1510866443270-square.jpg' },
      { id: 'crossbody',         label: 'Mini Crossbody',     desc: 'Casual & practical',      styleTags: ['casual', 'y2k'],              fit: null, image: 'https://cdn.mos.cms.futurecdn.net/37NcTP8qcPhr8Ssy2gxFUc.jpg' },
      { id: 'tote',              label: 'Tote Bag',           desc: 'Practical & minimal',     styleTags: ['minimal', 'normcore'],        fit: null, image: 'https://cdn.mos.cms.futurecdn.net/oSVTPvo8zCUEPvTtHPyhdF.jpg' },
      { id: 'baseball_cap',      label: 'Baseball Cap',       desc: 'Streetwear & casual',     styleTags: ['streetwear', 'athleisure'],   fit: null, image: 'https://cdn.mos.cms.futurecdn.net/whowhatwear/posts/295659/baseball-hat-outfits-295659-1698349074080-main.jpg' },
      { id: 'sunglasses',        label: 'Sunglasses',         desc: 'Effortless cool',         styleTags: ['coastal', 'minimal'],         fit: null, image: 'https://cdn.mos.cms.futurecdn.net/SQPSDZRSgZ5YYc4b2mnDSW.png' },
      { id: 'belt',              label: 'Belt',               desc: 'Defining & polished',     styleTags: ['old money', 'minimal'],       fit: null, image: 'https://cdn.mos.cms.futurecdn.net/tFGBvKP5tWe4NC9kR47HjP.jpg' },
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
