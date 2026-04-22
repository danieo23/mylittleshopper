/**
 * Art-direction metadata for every quiz card image.
 *
 * imageMode        — the required presentation style for the image
 * objectPosition   — CSS object-position for the card's <img> (matches the card's 3:4 crop)
 * allowLifestyle   — allow editorial/street-style photography
 * allowProductOnly — allow flat lays / isolated product shots (no model)
 * minSubjectCoverage — fraction of frame the target item must occupy (0–1)
 *
 * Hard reject flags (all true for every item — centralized in HARD_REJECT_FLAGS below)
 */

export const IMAGE_MODES = {
  LOWER_BODY:  'lower-body-on-model',   // waist-down, item fills frame
  TORSO:       'torso-on-model',        // chest-down (or full torso), top fills frame
  FULL_BODY:   'full-body-on-model',    // head-to-toe model shot
  PAIR:        'pair-isolated',         // both shoes centered, clean bg
  CLOSEUP:     'accessory-closeup',     // single accessory macro/closeup
  PRODUCT:     'product-only',          // item alone, no model, clean bg
};

// Shared hard-reject rules — apply to every item
export const HARD_REJECT_FLAGS = {
  rejectIfWatermark:    true,
  rejectIfTextOverlay:  true,   // text OVER the image, not graphic on garment
  rejectIfCollage:      true,   // front+back layouts, multi-view composites
  rejectIfMaleModel:    true,
  rejectIfMockup:       true,   // 3-D templates / print-on-demand previews
  rejectIfChildren:     true,
};

// Per-item metadata
export const QUIZ_IMAGE_META = {
  // ── BOTTOMS ──────────────────────────────────────────────────────────────────
  skinny_jeans:    { imageMode: IMAGE_MODES.LOWER_BODY, objectPosition: 'center bottom', allowLifestyle: false, allowProductOnly: true,  minSubjectCoverage: 0.55 },
  straight_jeans:  { imageMode: IMAGE_MODES.LOWER_BODY, objectPosition: 'center bottom', allowLifestyle: false, allowProductOnly: true,  minSubjectCoverage: 0.55 },
  wide_leg:        { imageMode: IMAGE_MODES.LOWER_BODY, objectPosition: 'center bottom', allowLifestyle: false, allowProductOnly: true,  minSubjectCoverage: 0.55 },
  mom_jeans:       { imageMode: IMAGE_MODES.LOWER_BODY, objectPosition: 'center bottom', allowLifestyle: false, allowProductOnly: true,  minSubjectCoverage: 0.55 },
  baggy:           { imageMode: IMAGE_MODES.LOWER_BODY, objectPosition: 'center bottom', allowLifestyle: false, allowProductOnly: true,  minSubjectCoverage: 0.55 },
  cargo:           { imageMode: IMAGE_MODES.LOWER_BODY, objectPosition: 'center bottom', allowLifestyle: false, allowProductOnly: true,  minSubjectCoverage: 0.55 },
  leggings:        { imageMode: IMAGE_MODES.LOWER_BODY, objectPosition: 'center bottom', allowLifestyle: false, allowProductOnly: true,  minSubjectCoverage: 0.60 },
  trousers:        { imageMode: IMAGE_MODES.LOWER_BODY, objectPosition: 'center bottom', allowLifestyle: false, allowProductOnly: true,  minSubjectCoverage: 0.55 },
  denim_shorts:    { imageMode: IMAGE_MODES.LOWER_BODY, objectPosition: 'center bottom', allowLifestyle: false, allowProductOnly: true,  minSubjectCoverage: 0.55 },
  bike_shorts:     { imageMode: IMAGE_MODES.LOWER_BODY, objectPosition: 'center bottom', allowLifestyle: false, allowProductOnly: true,  minSubjectCoverage: 0.60 },

  // ── TOPS ─────────────────────────────────────────────────────────────────────
  basic_tee:       { imageMode: IMAGE_MODES.TORSO,      objectPosition: 'center top',    allowLifestyle: false, allowProductOnly: true,  minSubjectCoverage: 0.60 },
  oversized_tee:   { imageMode: IMAGE_MODES.TORSO,      objectPosition: 'center top',    allowLifestyle: false, allowProductOnly: true,  minSubjectCoverage: 0.60 },
  crop_top:        { imageMode: IMAGE_MODES.TORSO,      objectPosition: 'center top',    allowLifestyle: false, allowProductOnly: true,  minSubjectCoverage: 0.60 },
  tank_cami:       { imageMode: IMAGE_MODES.TORSO,      objectPosition: 'center top',    allowLifestyle: false, allowProductOnly: true,  minSubjectCoverage: 0.60 },
  button_down:     { imageMode: IMAGE_MODES.TORSO,      objectPosition: 'center top',    allowLifestyle: false, allowProductOnly: true,  minSubjectCoverage: 0.60 },
  blouse:          { imageMode: IMAGE_MODES.TORSO,      objectPosition: 'center top',    allowLifestyle: false, allowProductOnly: true,  minSubjectCoverage: 0.60 },
  bodysuit:        { imageMode: IMAGE_MODES.TORSO,      objectPosition: 'center top',    allowLifestyle: false, allowProductOnly: true,  minSubjectCoverage: 0.60 },
  off_shoulder:    { imageMode: IMAGE_MODES.TORSO,      objectPosition: 'center top',    allowLifestyle: false, allowProductOnly: true,  minSubjectCoverage: 0.60 },
  graphic_tee:     { imageMode: IMAGE_MODES.TORSO,      objectPosition: 'center top',    allowLifestyle: false, allowProductOnly: true,  minSubjectCoverage: 0.60 },
  polo:            { imageMode: IMAGE_MODES.TORSO,      objectPosition: 'center top',    allowLifestyle: false, allowProductOnly: true,  minSubjectCoverage: 0.60 },

  // ── DRESSES & SKIRTS ─────────────────────────────────────────────────────────
  mini_dress:      { imageMode: IMAGE_MODES.FULL_BODY,  objectPosition: 'center top',    allowLifestyle: false, allowProductOnly: false, minSubjectCoverage: 0.65 },
  midi_dress:      { imageMode: IMAGE_MODES.FULL_BODY,  objectPosition: 'center top',    allowLifestyle: false, allowProductOnly: false, minSubjectCoverage: 0.65 },
  maxi_dress:      { imageMode: IMAGE_MODES.FULL_BODY,  objectPosition: 'center top',    allowLifestyle: false, allowProductOnly: false, minSubjectCoverage: 0.65 },
  mini_skirt:      { imageMode: IMAGE_MODES.LOWER_BODY, objectPosition: 'center bottom', allowLifestyle: false, allowProductOnly: true,  minSubjectCoverage: 0.55 },
  midi_skirt:      { imageMode: IMAGE_MODES.LOWER_BODY, objectPosition: 'center bottom', allowLifestyle: false, allowProductOnly: true,  minSubjectCoverage: 0.55 },
  maxi_skirt:      { imageMode: IMAGE_MODES.LOWER_BODY, objectPosition: 'center bottom', allowLifestyle: false, allowProductOnly: true,  minSubjectCoverage: 0.55 },
  slip_dress:      { imageMode: IMAGE_MODES.FULL_BODY,  objectPosition: 'center top',    allowLifestyle: false, allowProductOnly: false, minSubjectCoverage: 0.65 },
  wrap_dress:      { imageMode: IMAGE_MODES.FULL_BODY,  objectPosition: 'center top',    allowLifestyle: false, allowProductOnly: false, minSubjectCoverage: 0.65 },
  denim_skirt:     { imageMode: IMAGE_MODES.LOWER_BODY, objectPosition: 'center bottom', allowLifestyle: false, allowProductOnly: true,  minSubjectCoverage: 0.55 },
  tennis_skirt:    { imageMode: IMAGE_MODES.LOWER_BODY, objectPosition: 'center bottom', allowLifestyle: false, allowProductOnly: true,  minSubjectCoverage: 0.55 },

  // ── OUTERWEAR ────────────────────────────────────────────────────────────────
  oversized_blazer: { imageMode: IMAGE_MODES.FULL_BODY, objectPosition: 'center top',    allowLifestyle: false, allowProductOnly: true,  minSubjectCoverage: 0.65 },
  fitted_blazer:   { imageMode: IMAGE_MODES.FULL_BODY,  objectPosition: 'center top',    allowLifestyle: false, allowProductOnly: true,  minSubjectCoverage: 0.65 },
  leather_jacket:  { imageMode: IMAGE_MODES.FULL_BODY,  objectPosition: 'center top',    allowLifestyle: false, allowProductOnly: true,  minSubjectCoverage: 0.65 },
  denim_jacket:    { imageMode: IMAGE_MODES.FULL_BODY,  objectPosition: 'center top',    allowLifestyle: false, allowProductOnly: true,  minSubjectCoverage: 0.65 },
  trench_coat:     { imageMode: IMAGE_MODES.FULL_BODY,  objectPosition: 'center top',    allowLifestyle: false, allowProductOnly: true,  minSubjectCoverage: 0.65 },
  puffer:          { imageMode: IMAGE_MODES.FULL_BODY,  objectPosition: 'center top',    allowLifestyle: false, allowProductOnly: true,  minSubjectCoverage: 0.65 },
  chunky_cardigan: { imageMode: IMAGE_MODES.FULL_BODY,  objectPosition: 'center top',    allowLifestyle: false, allowProductOnly: true,  minSubjectCoverage: 0.65 },
  knit_cardigan:   { imageMode: IMAGE_MODES.FULL_BODY,  objectPosition: 'center top',    allowLifestyle: false, allowProductOnly: true,  minSubjectCoverage: 0.65 },
  hoodie:          { imageMode: IMAGE_MODES.FULL_BODY,  objectPosition: 'center top',    allowLifestyle: false, allowProductOnly: true,  minSubjectCoverage: 0.65 },
  bomber:          { imageMode: IMAGE_MODES.FULL_BODY,  objectPosition: 'center top',    allowLifestyle: false, allowProductOnly: true,  minSubjectCoverage: 0.65 },

  // ── SHOES ────────────────────────────────────────────────────────────────────
  white_sneakers:  { imageMode: IMAGE_MODES.PAIR,       objectPosition: 'center center', allowLifestyle: false, allowProductOnly: true,  minSubjectCoverage: 0.55 },
  chunky_sneakers: { imageMode: IMAGE_MODES.PAIR,       objectPosition: 'center center', allowLifestyle: false, allowProductOnly: true,  minSubjectCoverage: 0.55 },
  athletic:        { imageMode: IMAGE_MODES.PAIR,       objectPosition: 'center center', allowLifestyle: false, allowProductOnly: true,  minSubjectCoverage: 0.55 },
  heeled_boots:    { imageMode: IMAGE_MODES.PAIR,       objectPosition: 'center center', allowLifestyle: false, allowProductOnly: true,  minSubjectCoverage: 0.55 },
  flat_boots:      { imageMode: IMAGE_MODES.PAIR,       objectPosition: 'center center', allowLifestyle: false, allowProductOnly: true,  minSubjectCoverage: 0.55 },
  knee_high:       { imageMode: IMAGE_MODES.PAIR,       objectPosition: 'center center', allowLifestyle: false, allowProductOnly: true,  minSubjectCoverage: 0.55 },
  block_heels:     { imageMode: IMAGE_MODES.PAIR,       objectPosition: 'center center', allowLifestyle: false, allowProductOnly: true,  minSubjectCoverage: 0.55 },
  strappy_heels:   { imageMode: IMAGE_MODES.PAIR,       objectPosition: 'center center', allowLifestyle: false, allowProductOnly: true,  minSubjectCoverage: 0.55 },
  loafers:         { imageMode: IMAGE_MODES.PAIR,       objectPosition: 'center center', allowLifestyle: false, allowProductOnly: true,  minSubjectCoverage: 0.55 },
  sandals:         { imageMode: IMAGE_MODES.PAIR,       objectPosition: 'center center', allowLifestyle: false, allowProductOnly: true,  minSubjectCoverage: 0.55 },

  // ── ACCESSORIES ──────────────────────────────────────────────────────────────
  dainty_jewelry:    { imageMode: IMAGE_MODES.CLOSEUP,  objectPosition: 'center center', allowLifestyle: false, allowProductOnly: true,  minSubjectCoverage: 0.45 },
  statement_jewelry: { imageMode: IMAGE_MODES.CLOSEUP,  objectPosition: 'center center', allowLifestyle: false, allowProductOnly: true,  minSubjectCoverage: 0.45 },
  layered_necklaces: { imageMode: IMAGE_MODES.CLOSEUP,  objectPosition: 'center center', allowLifestyle: false, allowProductOnly: true,  minSubjectCoverage: 0.45 },
  hoop_earrings:     { imageMode: IMAGE_MODES.CLOSEUP,  objectPosition: 'center center', allowLifestyle: false, allowProductOnly: true,  minSubjectCoverage: 0.45 },
  structured_bag:    { imageMode: IMAGE_MODES.PRODUCT,  objectPosition: 'center center', allowLifestyle: false, allowProductOnly: true,  minSubjectCoverage: 0.60 },
  crossbody:         { imageMode: IMAGE_MODES.PRODUCT,  objectPosition: 'center center', allowLifestyle: false, allowProductOnly: true,  minSubjectCoverage: 0.60 },
  tote:              { imageMode: IMAGE_MODES.PRODUCT,  objectPosition: 'center center', allowLifestyle: false, allowProductOnly: true,  minSubjectCoverage: 0.60 },
  baseball_cap:      { imageMode: IMAGE_MODES.PRODUCT,  objectPosition: 'center center', allowLifestyle: false, allowProductOnly: true,  minSubjectCoverage: 0.60 },
  sunglasses:        { imageMode: IMAGE_MODES.PRODUCT,  objectPosition: 'center center', allowLifestyle: false, allowProductOnly: true,  minSubjectCoverage: 0.60 },
  belt:              { imageMode: IMAGE_MODES.PRODUCT,  objectPosition: 'center center', allowLifestyle: false, allowProductOnly: true,  minSubjectCoverage: 0.60 },
};

// imageMode → Google Images search presentation suffix
// Used by source_quiz_images.js to build queries
export const MODE_SEARCH_SUFFIX = {
  [IMAGE_MODES.LOWER_BODY]: 'women on model front view lower body white background',
  [IMAGE_MODES.TORSO]:      'women on model front view torso white background',
  [IMAGE_MODES.FULL_BODY]:  'women on model full length front view white background',
  [IMAGE_MODES.PAIR]:       'pair isolated white background front view',
  [IMAGE_MODES.CLOSEUP]:    'product closeup isolated white background',
  [IMAGE_MODES.PRODUCT]:    'product photo front view isolated white background',
};

// Negative terms appended to every query
export const NEGATIVE_TERMS = '-men -boys -kids -mockup -template -shutterstock -istock -gettyimages -collage -back-view';

// Per-item base search term (the "what") — mode suffix and negative terms are appended automatically
export const ITEM_BASE_QUERY = {
  skinny_jeans:    'women skinny jeans',
  straight_jeans:  'women straight leg jeans',
  wide_leg:        'women wide leg flare jeans',
  mom_jeans:       'women mom jeans high waist',
  baggy:           'women baggy relaxed fit jeans',
  cargo:           'women cargo pants',
  leggings:        'women black leggings',
  trousers:        'women tailored dress trousers',
  denim_shorts:    'women denim cut off shorts',
  bike_shorts:     'women bike cycling shorts',

  basic_tee:       'women plain white t-shirt',
  oversized_tee:   'women oversized t-shirt',
  crop_top:        'women crop top shirt',
  tank_cami:       'women camisole spaghetti strap tank top',
  button_down:     'women button down oxford shirt',
  blouse:          'women silk flowy blouse',
  bodysuit:        'women fashion bodysuit top',
  off_shoulder:    'women off shoulder bardot top',
  graphic_tee:     'women graphic print t-shirt',
  polo:            'women polo collar shirt',

  mini_dress:      'women mini dress',
  midi_dress:      'women midi dress',
  maxi_dress:      'women maxi dress',
  mini_skirt:      'women mini skirt',
  midi_skirt:      'women midi skirt',
  maxi_skirt:      'women long maxi skirt',
  slip_dress:      'women slip satin dress',
  wrap_dress:      'women wrap dress',
  denim_skirt:     'women denim skirt',
  tennis_skirt:    'women tennis pleated mini skirt',

  oversized_blazer: 'women oversized blazer jacket',
  fitted_blazer:   'women fitted tailored blazer',
  leather_jacket:  'women leather moto jacket',
  denim_jacket:    'women denim jacket',
  trench_coat:     'women trench coat',
  puffer:          'women puffer down jacket',
  chunky_cardigan: 'women chunky knit oversized cardigan',
  knit_cardigan:   'women knit cardigan sweater',
  hoodie:          'women pullover hoodie sweatshirt',
  bomber:          'women bomber jacket',

  white_sneakers:  'white low-top sneakers shoes',
  chunky_sneakers:  'chunky platform sneakers shoes women',
  athletic:        'women running athletic sneakers shoes',
  heeled_boots:    'women heeled ankle boots',
  flat_boots:      'women chelsea flat ankle boots',
  knee_high:       'women knee high boots',
  block_heels:     'women block heel pumps shoes',
  strappy_heels:   'women strappy heeled sandals',
  loafers:         'women loafers leather shoes',
  sandals:         'women open toe sandals mules',

  dainty_jewelry:    'dainty delicate gold necklace earrings jewelry',
  statement_jewelry: 'statement bold chunky jewelry earrings',
  layered_necklaces: 'layered gold chain necklaces jewelry',
  hoop_earrings:     'gold hoop earrings jewelry',
  structured_bag:    'structured top handle satchel handbag',
  crossbody:         'mini crossbody shoulder bag',
  tote:              'canvas leather tote bag',
  baseball_cap:      'baseball cap hat',
  sunglasses:        'women sunglasses',
  belt:              'leather waist belt',
};
