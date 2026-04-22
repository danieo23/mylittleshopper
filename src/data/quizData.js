// Image URLs sourced from Who What Wear editorial photography.
// To swap any image, replace just the URL string for that item.

export const QUIZ_CATEGORIES = [
  // ── 1. BOTTOMS ───────────────────────────────────────────────────
  {
    id: 'bottoms',
    title: 'Bottoms',
    subtitle: "Select every style you'd actually wear",
    items: [
      { id: 'skinny_jeans',   label: 'Skinny Jeans',      desc: 'Slim & fitted',           styleTags: ['casual', 'classic'],          fit: 'slim',      image: 'https://www.shutterstock.com/image-photo/female-skinny-gray-jeans-pant-260nw-2694296899.jpg' },
      { id: 'straight_jeans', label: 'Straight Leg',       desc: 'Relaxed & everyday',      styleTags: ['casual', 'minimal'],          fit: 'straight',  image: 'https://img.abercrombie.com/is/image/anf/KIC_155-4014-0176-280_prod1?policy=product-medium' },
      { id: 'wide_leg',       label: 'Wide Leg / Flare',   desc: 'Flowy & statement',       styleTags: ['bohemian', 'trendy'],         fit: 'wide',      image: 'https://m.media-amazon.com/images/I/51PibPnIjmL._AC_UY1000_.jpg' },
      { id: 'mom_jeans',      label: 'Mom Jeans',          desc: 'High-waist, vintage feel', styleTags: ['vintage', 'casual'],         fit: 'relaxed',   image: 'https://images.express.com/is/image/expressfashion/0091_09080647_0018_e1_f001?cache=on&wid=480&fmt=jpeg&qlt=85,1&resmode=sharp2&op_usm=1,1,5,0&defaultImage=Photo-Coming-Soon' },
      { id: 'baggy',          label: 'Baggy / Relaxed',    desc: 'Oversized & street',      styleTags: ['streetwear'],                 fit: 'oversized', image: 'https://m.media-amazon.com/images/I/71Co9zlcWUL._AC_UY1000_.jpg' },
      { id: 'cargo',          label: 'Cargo Pants',        desc: 'Utilitarian with pockets', styleTags: ['streetwear', 'techwear'],   fit: 'relaxed',   image: 'https://i5.walmartimages.com/seo/Akafmk-Womens-Cargo-Pants-Hiking-Pants-Outdoor-High-Waist-Wide-Leg-Pants-Solid-Color-Long-Trousers-Outdoor-Lightweight-Baggy-Relaxed-Fitting-Travel-W_817b3f94-8278-4951-a01c-339cc17887d1.23a2190839f7387ca1acc2acc7422b72.jpeg?odnHeight=768&odnWidth=768&odnBg=FFFFFF' },
      { id: 'leggings',       label: 'Leggings',           desc: 'Fitted & active',         styleTags: ['athleisure'],                 fit: 'slim',      image: 'https://neiwai.life/cdn/shop/products/NA222SD4205.jpg?v=1662057184&width=1946' },
      { id: 'trousers',       label: 'Dress Trousers',     desc: 'Tailored & polished',     styleTags: ['business casual', 'minimal'], fit: 'tailored',  image: 'https://cdn2.propercloth.com/pic_tccp/8524_14c1d081b4203f461a53897f7cc45acc_size6.jpg' },
      { id: 'denim_shorts',   label: 'Denim Shorts',       desc: 'Casual & summer-ready',   styleTags: ['casual', 'coastal'],          fit: 'relaxed',   image: 'https://img.hollisterco.com/is/image/anf/KIC_349-6231-00282-278_prod1?policy=product-medium' },
      { id: 'bike_shorts',    label: 'Bike Shorts',        desc: 'Sporty & Y2K',            styleTags: ['y2k', 'athleisure'],          fit: 'slim',      image: 'https://www.pactimo.com/cdn/shop/products/W._Ascent_Vector_Short_-Standard_1_ed9569ed-712b-44b2-87cf-596d075cc8dd.jpg?v=1747672882' },
    ],
  },

  // ── 2. TOPS ──────────────────────────────────────────────────────
  {
    id: 'tops',
    title: 'Tops',
    subtitle: 'Pick every top style that feels like you',
    items: [
      { id: 'basic_tee',       label: 'Basic Tee',          desc: 'Minimal & everyday',      styleTags: ['minimal', 'casual'],          fit: 'straight',  image: 'https://i5.walmartimages.com/asr/bdf860f2-7182-4bf3-aada-b43b886fb47f.52ce378dfee46565a832de0c74b6a004.jpeg?odnHeight=768&odnWidth=768&odnBg=FFFFFF' },
      { id: 'oversized_tee',   label: 'Oversized Tee',      desc: 'Relaxed & effortless',    styleTags: ['streetwear', 'casual'],       fit: 'oversized', image: 'https://i.etsystatic.com/51430569/r/il/59cae6/7112210882/il_570xN.7112210882_snjv.jpg' },
      { id: 'crop_top',        label: 'Crop Top',           desc: 'Fitted & trendy',         styleTags: ['y2k', 'trendy'],              fit: 'slim',      image: 'https://thumbs.dreamstime.com/b/front-back-view-plain-white-sleeveless-women-s-crop-top-clean-background-isolated-transparent-studio-product-shot-446827191.jpg' },
      { id: 'tank_cami',       label: 'Tank / Cami',        desc: 'Sleek & layerable',       styleTags: ['minimal', 'coastal'],         fit: 'slim',      image: 'https://www.graceandlace.com/cdn/shop/products/perfect_fit_tank_spaghetti_strap_nude_stock1_1_a0b41f3f-fd83-4ede-850a-563896900da7.jpg?v=1776109965' },
      { id: 'button_down',     label: 'Button-Down',        desc: 'Preppy & clean',          styleTags: ['preppy', 'business casual'],  fit: 'straight',  image: 'https://m.media-amazon.com/images/I/51GCDghxwkL._AC_UY1000_.jpg' },
      { id: 'blouse',          label: 'Blouse',             desc: 'Feminine & flowy',        styleTags: ['bohemian', 'minimal'],        fit: 'relaxed',   image: 'https://www.thenolishop.com/cdn/shop/files/LOOK-15_0010_58c44080-ef75-4b19-bb59-c4075200eae3.jpg?format=pjpg&v=1770308648&width=320' },
      { id: 'bodysuit',        label: 'Bodysuit',           desc: 'Sleek & polished',        styleTags: ['minimal', 'old money'],       fit: 'slim',      image: 'https://skims.imgix.net/s/files/1/0259/5448/4284/products/SKIMS-SHAPEWEAR-BD-THG-3371-SAND-Fcopy.jpg?v=1742587903&auto=format&q=70&ixlib=react-9.11.0' },
      { id: 'off_shoulder',    label: 'Off-Shoulder',       desc: 'Feminine & flirty',       styleTags: ['coastal', 'resort / vacation'], fit: 'relaxed', image: 'https://us.peppermayo.com/cdn/shop/products/Peppermayo-110124-80-Solace-Soul-Topjpg_1024x1024.jpg?v=1704342595' },
      { id: 'graphic_tee',     label: 'Graphic Tee',        desc: 'Expressive & casual',     styleTags: ['streetwear', 'vintage'],      fit: 'relaxed',   image: 'https://i.etsystatic.com/12444746/r/il/3f45a7/1166992092/il_570xN.1166992092_k6b1.jpg' },
      { id: 'polo',            label: 'Polo / Collar Shirt', desc: 'Preppy & classic',       styleTags: ['preppy', 'old money'],        fit: 'straight',  image: 'https://www.shutterstock.com/image-illustration/women-polo-shirt-mockup-design-260nw-2457569739.jpg' },
    ],
  },

  // ── 3. DRESSES & SKIRTS ──────────────────────────────────────────
  {
    id: 'dresses',
    title: 'Dresses & Skirts',
    subtitle: 'Select everything you gravitate toward',
    items: [
      { id: 'mini_dress',      label: 'Mini Dress',         desc: 'Playful & flirty',        styleTags: ['y2k', 'date night'],          fit: 'slim',      image: 'https://us.peppermayo.com/cdn/shop/products/Peppermayo-080124-Elly-47-Cosmic-Chic-Mini-Dress-Whitejpg_1024x1024.jpg?v=1704167595' },
      { id: 'midi_dress',      label: 'Midi Dress',         desc: 'Versatile & elegant',     styleTags: ['minimal', 'smart casual'],    fit: 'straight',  image: 'https://penelopetboutique.com/cdn/shop/files/RS26-045-BLACK-1.webp?v=1763151453&width=711' },
      { id: 'maxi_dress',      label: 'Maxi Dress',         desc: 'Flowy & bohemian',        styleTags: ['bohemian', 'resort / vacation'], fit: 'relaxed', image: 'https://www.trinaturk.com/cdn/shop/files/2603326NV1_WWH_0024_B.jpg?v=1774290720&width=1600' },
      { id: 'mini_skirt',      label: 'Mini Skirt',         desc: 'Bold & playful',          styleTags: ['y2k', 'trendy'],              fit: 'slim',      image: 'https://thumbs.dreamstime.com/b/white-skort-womens-athletic-sportswear-apparel-design-mockup-clean-product-shot-integrated-shorts-designed-412808698.jpg' },
      { id: 'midi_skirt',      label: 'Midi Skirt',         desc: 'Sophisticated & polished', styleTags: ['minimal', 'old money'],      fit: 'straight',  image: 'https://www.shutterstock.com/image-photo/red-midi-skirt-side-button-260nw-2676336285.jpg' },
      { id: 'maxi_skirt',      label: 'Maxi Skirt',         desc: 'Dramatic & bohemian',     styleTags: ['bohemian', 'cottagecore'],    fit: 'relaxed',   image: 'https://www.shutterstock.com/image-photo/blank-black-women-maxi-skirt-260nw-2696669503.jpg' },
      { id: 'slip_dress',      label: 'Slip Dress',         desc: 'Minimal & sleek',         styleTags: ['minimal', 'quiet luxury'],    fit: 'slim',      image: 'https://www.petite-plume.com/cdn/shop/files/ASWLASW_White_3.jpg?v=1770831833&width=2400' },
      { id: 'wrap_dress',      label: 'Wrap Dress',         desc: 'Flattering & feminine',   styleTags: ['smart casual', 'date night'], fit: 'tailored',  image: 'https://brendalaine.com/cdn/shop/files/WrapDresses_2.png?v=1770233111&width=533' },
      { id: 'denim_skirt',     label: 'Denim Skirt',        desc: 'Casual & classic',        styleTags: ['casual', 'vintage'],          fit: 'straight',  image: 'https://thumbs.dreamstime.com/b/long-denim-skirt-fashion-isolated-white-background-stylish-displayed-ideal-online-stores-clothing-catalogues-e-commerce-397903234.jpg' },
      { id: 'tennis_skirt',    label: 'Tennis Skirt',       desc: 'Sporty & flirty',         styleTags: ['y2k', 'preppy'],              fit: 'relaxed',   image: 'https://www.wilson.com/en-us/media/catalog/product/article_images/WW00387411WTA_/WW00387411WTA__0dc8b3993e4e01ea3b0204bb93c68341.png' },
    ],
  },

  // ── 4. OUTERWEAR ─────────────────────────────────────────────────
  {
    id: 'outerwear',
    title: 'Outerwear',
    subtitle: 'What do you reach for when it gets cold?',
    items: [
      { id: 'oversized_blazer', label: 'Oversized Blazer',  desc: 'Power & minimal',         styleTags: ['old money', 'smart casual'],  fit: 'oversized', image: 'https://media.istockphoto.com/id/883020242/photo/womens-clothing-isolated-on-white-background.jpg?s=612x612&w=0&k=20&c=Cwq9F_jh0bxBXx5-_AlawTQoE8GRkZ3sazh7SAYKN_Q=' },
      { id: 'fitted_blazer',   label: 'Fitted Blazer',      desc: 'Tailored & polished',     styleTags: ['business casual', 'minimal'], fit: 'tailored',  image: 'https://www.meshki.us/cdn/shop/files/AdaTailoredSatinBlazer-Ivory2.png?v=1771207848&width=1946' },
      { id: 'leather_jacket',  label: 'Leather Jacket',     desc: 'Edgy & cool',             styleTags: ['rockstar', 'streetwear'],     fit: 'fitted',    image: 'https://www.shutterstock.com/image-photo/woman-leather-jacket-design-front-260nw-2665402631.jpg' },
      { id: 'denim_jacket',    label: 'Denim Jacket',       desc: 'Casual & classic',        styleTags: ['casual', 'vintage'],          fit: 'straight',  image: 'https://www.shutterstock.com/image-photo/beautiful-womens-short-blue-denim-260nw-1456876691.jpg' },
      { id: 'trench_coat',     label: 'Trench Coat',        desc: 'Classic & elegant',       styleTags: ['old money', 'minimal'],       fit: 'straight',  image: 'https://www.shutterstock.com/image-photo/womens-long-trench-coat-on-260nw-1061723525.jpg' },
      { id: 'puffer',          label: 'Puffer Jacket',      desc: 'Casual & cozy',           styleTags: ['streetwear', 'casual'],       fit: 'oversized', image: 'https://www.shutterstock.com/image-photo/red-women-fashion-down-jacket-260nw-1561763656.jpg' },
      { id: 'chunky_cardigan', label: 'Chunky Cardigan',    desc: 'Cozy & oversized',        styleTags: ['cottagecore', 'casual'],      fit: 'oversized', image: 'https://m.media-amazon.com/images/I/81D5wHZbJ6L._AC_UY1000_.jpg' },
      { id: 'knit_cardigan',   label: 'Fine Knit Cardigan', desc: 'Minimal & sleek',         styleTags: ['minimal', 'preppy'],          fit: 'relaxed',   image: 'https://img.freepik.com/premium-photo/knitted-cardigan-sweater-women-white-background_785507-11996.jpg?semt=ais_hybrid&w=740&q=80' },
      { id: 'hoodie',          label: 'Hoodie',             desc: 'Relaxed & everyday',      styleTags: ['streetwear', 'casual'],       fit: 'oversized', image: 'https://cdn.shopify.com/s/files/1/0558/5708/6644/files/Hoodie_Oversize_Clay-Front_a00e66ed-de84-48f6-b7af-d932e7877c09.jpg?v=1762787609' },
      { id: 'bomber',          label: 'Bomber Jacket',      desc: 'Streetwear & cool',       styleTags: ['streetwear', 'y2k'],          fit: 'relaxed',   image: 'https://www.shutterstock.com/image-photo/blank-jacket-bomber-pink-color-260nw-1054320452.jpg' },
    ],
  },

  // ── 5. SHOES ─────────────────────────────────────────────────────
  {
    id: 'shoes',
    title: 'Shoes',
    subtitle: 'Pick every pair that belongs in your closet',
    items: [
      { id: 'white_sneakers',  label: 'White Sneakers',     desc: 'Minimal & clean',         styleTags: ['minimal', 'casual'],          fit: null, image: 'https://image.menswearhouse.com/is/image/TMW/TMW_433J_13_AWEARNESS_KENNETH_COLE_SNEAKERS_WHITE_ALT1?imPolicy=pdp-mob' },
      { id: 'chunky_sneakers', label: 'Chunky Sneakers',    desc: 'Bold & Y2K',              styleTags: ['y2k', 'streetwear'],          fit: null, image: 'https://lineapaolo.com/cdn/shop/files/gains-l_307_1.jpg?v=1764553561&width=2048' },
      { id: 'athletic',        label: 'Running / Athletic', desc: 'Sporty & functional',     styleTags: ['athleisure'],                 fit: null, image: 'https://m.media-amazon.com/images/I/81ewK-Ccb9L._AC_UY900_.jpg' },
      { id: 'heeled_boots',    label: 'Heeled Boots',       desc: 'Edgy & elevated',         styleTags: ['rockstar', 'dark academia'],  fit: null, image: 'https://www.shutterstock.com/image-photo/stylish-black-leather-womens-ankle-260nw-2594912397.jpg' },
      { id: 'flat_boots',      label: 'Chelsea / Flat Boots', desc: 'Versatile & classic',   styleTags: ['minimal', 'casual'],          fit: null, image: 'https://lineapaolo.com/cdn/shop/files/vera-l_102_1.jpg?v=1755624193&width=2048' },
      { id: 'knee_high',       label: 'Knee-High Boots',    desc: 'Statement & bold',        styleTags: ['old money', 'dark academia'], fit: null, image: 'https://lineapaolo.com/cdn/shop/files/tracy-l_214_8.jpg?v=1759443438&width=2048' },
      { id: 'block_heels',     label: 'Block Heels',        desc: 'Comfortable & elevated',  styleTags: ['smart casual', 'date night'], fit: null, image: 'https://antonelloshoes.com/cdn/shop/files/354513-1600-auto.jpg?v=1754313050&width=1445' },
      { id: 'strappy_heels',   label: 'Strappy Heels',      desc: 'Feminine & dressy',       styleTags: ['date night', 'resort / vacation'], fit: null, image: 'https://www.matissefootwear.com/cdn/shop/files/TRINITY-103-2_600x.jpg?v=1768584910' },
      { id: 'loafers',         label: 'Loafers / Ballet Flats', desc: 'Preppy & minimal',    styleTags: ['preppy', 'old money'],        fit: null, image: 'https://www.shutterstock.com/image-photo/pair-offwhite-classic-womens-slipon-260nw-1014992905.jpg' },
      { id: 'sandals',         label: 'Sandals / Mules',    desc: 'Casual & effortless',     styleTags: ['coastal', 'bohemian'],        fit: null, image: 'https://luckyfeetshoes.com/cdn/shop/files/ShopifyProductPhotos_19_97f12cd2-79b1-46f1-9d33-d9b6ec318bd9.png?v=1757372206&width=600' },
    ],
  },

  // ── 6. ACCESSORIES ───────────────────────────────────────────────
  {
    id: 'accessories',
    title: 'Accessories',
    subtitle: 'The finishing touches that say the most',
    items: [
      { id: 'dainty_jewelry',    label: 'Dainty Jewelry',     desc: 'Subtle & elegant',        styleTags: ['minimal', 'quiet luxury'],    fit: null, image: 'https://uncommonjames.com/cdn/shop/files/SIGSETS-AGEM-2024-1.jpg?v=1727885896&width=1445' },
      { id: 'statement_jewelry', label: 'Statement Jewelry',  desc: 'Bold & expressive',       styleTags: ['avant-garde', 'rockstar'],    fit: null, image: 'https://uncommonjames.com/cdn/shop/files/J16E-BOLDBALANCE-GOLD-1_a4dcd6dc-a5bc-46f5-a425-3e6b33282d91.jpg?v=1742568949&width=1946' },
      { id: 'layered_necklaces', label: 'Layered Necklaces',  desc: 'Boho & trendy',           styleTags: ['bohemian', 'vintage'],        fit: null, image: 'https://kissyanjewelry.com/cdn/shop/products/NSTCS003_3.webp?v=1654068692&width=1445' },
      { id: 'hoop_earrings',     label: 'Hoop Earrings',      desc: 'Classic & versatile',     styleTags: ['casual', 'streetwear'],       fit: null, image: 'https://www.shutterstock.com/image-photo/minimalist-gold-hoop-earrings-on-260nw-2666912991.jpg' },
      { id: 'structured_bag',    label: 'Structured Bag',     desc: 'Polished & elevated',     styleTags: ['old money', 'business casual'], fit: null, image: 'https://latelierglobal.com/cdn/shop/products/141529-cognac-fronte.jpg?v=1775438756' },
      { id: 'crossbody',         label: 'Mini Crossbody',     desc: 'Casual & practical',      styleTags: ['casual', 'y2k'],              fit: null, image: 'https://www.shortylove.com/cdn/shop/products/smaller_shorthand.jpg?v=1762525546&width=1024' },
      { id: 'tote',              label: 'Tote Bag',           desc: 'Practical & minimal',     styleTags: ['minimal', 'normcore'],        fit: null, image: 'https://thumbs.dreamstime.com/b/minimalist-cream-colored-fabric-bag-long-shoulder-straps-durable-canvas-material-eco-friendly-shopping-plain-accessory-448724120.jpg' },
      { id: 'baseball_cap',      label: 'Baseball Cap',       desc: 'Streetwear & casual',     styleTags: ['streetwear', 'athleisure'],   fit: null, image: 'https://thumbs.dreamstime.com/b/front-view-white-baseball-cap-headwear-product-photography-image-presents-plain-straight-facing-perspective-placed-386035068.jpg' },
      { id: 'sunglasses',        label: 'Sunglasses',         desc: 'Effortless cool',         styleTags: ['coastal', 'minimal'],         fit: null, image: 'https://c8.alamy.com/comp/2ME62XB/sunglasses-photography-with-white-background-product-concept-2ME62XB.jpg' },
      { id: 'belt',              label: 'Belt',               desc: 'Defining & polished',     styleTags: ['old money', 'minimal'],       fit: null, image: 'https://www.shutterstock.com/image-photo/mens-leather-belt-on-white-260nw-2673296975.jpg' },
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
