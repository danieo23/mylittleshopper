import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const ANALYSIS_PROMPT = `You are a professional fashion analyst and OCR specialist. Analyze this clothing image with two simultaneous passes — OCR and visual feature extraction — and return a single JSON object.

PASS 1 — OCR / TEXT EXTRACTION:
Scan every pixel for readable characters. Read band names, brand logos, distressed print text, embroidery, patches, screen-printed graphics, anything text-based. Be verbatim. If text is partially obscured, note what is legible and mark it "[partial]". This is the most important signal for understanding what the piece represents culturally.

PASS 2 — VISUAL FEATURE EXTRACTION:
Extract all non-text style attributes precisely: silhouette, color (sample actual pixels for hex), wash treatment, fabric texture hints, collar type, sleeve length, graphic placement.

Return exactly this JSON object — no markdown, no explanation:

{
  "item_type": "top|bottom|shoes|outerwear|dress|accessory|full_outfit|unclassified",
  "ocr_text": "verbatim text found on the garment exactly as it appears, or null if none",
  "cultural_signals": ["array — e.g. 'band tee', 'vintage bootleg', 'brand logo', 'artist reference', 'sports team', 'university', etc. Empty array if none."],
  "dominant_colors": ["hex codes of the 1-3 most dominant colors, sampled from the actual image"],
  "secondary_colors": ["hex codes of 1-2 accent colors, or empty array"],
  "fit_type": "slim|relaxed|oversized|tailored|fitted|null",
  "wash_treatment": "vintage-faded|washed|pigment-dyed|acid-wash|clean-unwashed|null",
  "fabric": "heavyweight-cotton|lightweight-cotton|fleece|denim|linen|knit|synthetic|null — infer from texture if visible, else null",
  "formality_score": 3,
  "style_category": "streetwear|minimalist|smart_casual|euro_casual|coastal|dark_academia|preppy|bohemian|techwear|athleisure|old_money|y2k|vintage|grunge|null",
  "brand": "brand name if a logo or label is visible, or null",
  "occasion_suitability": ["casual", "weekend", "etc — only values that clearly fit"],
  "individual_items": null,
  "confidence": "high|medium|low",
  "skip_reason": null
}

Rules:
- formality_score is an integer 1-10 (1=very casual, 10=very formal)
- individual_items: only populate as an array of item objects if this is a FULL OUTFIT photo showing multiple distinct pieces. For single-item photos, set null.
- skip_reason: only set if image is unclear, not clothing, or shows multiple people with no clear subject. Otherwise null.
- Never fabricate attributes you cannot see — use null. But make a real effort on OCR — text on clothes is almost always readable.
- For hex codes, sample the actual image colors precisely.`;

/**
 * Fetch an HTTP image URL and return { media_type, base64 }.
 * Needed because Anthropic's servers can't always reach third-party CDNs.
 */
async function fetchImageAsBase64(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)' },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`Image fetch failed: ${res.status} ${url}`);
  const buffer      = await res.arrayBuffer();
  const base64      = Buffer.from(buffer).toString('base64');
  const contentType = res.headers.get('content-type') ?? 'image/jpeg';
  const media_type  = contentType.split(';')[0].trim();
  return { base64, media_type };
}

/**
 * Build the Anthropic image source block for any image URL or data URL.
 */
async function buildImageSource(imageUrl) {
  if (imageUrl.startsWith('data:')) {
    const [header, base64] = imageUrl.split(',');
    const media_type = header.replace('data:', '').replace(';base64', '');
    return { type: 'base64', media_type, data: base64 };
  }
  const { base64, media_type } = await fetchImageAsBase64(imageUrl);
  return { type: 'base64', media_type, data: base64 };
}

/**
 * Analyzes a clothing image with OCR + visual feature extraction.
 * @param {string} imageUrl - HTTP URL, HTTPS URL, or data URL
 * @param {'wardrobe'|'aspiration'|'inspiration'} imageType
 * @returns {object} Structured style attributes including OCR text and cultural signals
 */
export async function analyzeImageStyle(imageUrl, imageType = 'wardrobe') {
  const source = await buildImageSource(imageUrl);

  const response = await client.messages.create({
    model:      'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source },
        { type: 'text',  text: ANALYSIS_PROMPT },
      ],
    }],
  });

  const text = response.content[0].text.trim();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON returned from image analysis');

  const result = JSON.parse(jsonMatch[0]);
  return { ...result, image_type: imageType, image_url: imageUrl };
}
