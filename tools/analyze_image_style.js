import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const ANALYSIS_PROMPT = `You are a professional fashion analyst. Analyze this clothing image and return a JSON object with exactly these fields:

{
  "item_type": "string (top/bottom/shoes/outerwear/dress/accessory/full_outfit/unclassified)",
  "dominant_colors": ["array of hex codes, max 3"],
  "secondary_colors": ["array of hex codes, max 2"],
  "fit_type": "slim|relaxed|oversized|tailored|fitted|null",
  "fabric": "string or null if not identifiable",
  "formality_score": "integer 1-10 (1=very casual, 10=very formal)",
  "style_category": "streetwear|minimalist|smart_casual|euro_casual|coastal|dark_academia|preppy|bohemian|techwear|athleisure|old_money|y2k|null",
  "brand": "string or null if not visible",
  "occasion_suitability": ["array: casual/work/evening/athletic/beach/travel/formal"],
  "individual_items": "array of item objects if this is a full outfit photo, else null",
  "confidence": "high|medium|low",
  "skip_reason": "string or null — only set if image should be skipped"
}

Rules:
- If image is unclear, not clothing, or shows multiple people without a clear primary subject, set skip_reason
- Never fabricate attributes you cannot see — use null
- For full outfit photos, break down individual_items as separate item objects
- Be precise with hex codes — sample the actual image colors`;

/**
 * Analyzes a clothing image and extracts style attributes.
 * @param {string} imageUrl - Public URL of the image
 * @param {'wardrobe'|'aspiration'|'inspiration'} imageType
 * @returns {object} Structured style attributes
 */
export async function analyzeImageStyle(imageUrl, imageType = 'wardrobe') {
  const response = await client.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: { type: 'url', url: imageUrl },
        },
        {
          type: 'text',
          text: ANALYSIS_PROMPT,
        },
      ],
    }],
  });

  const text = response.content[0].text.trim();

  // Extract JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON returned from image analysis');

  const result = JSON.parse(jsonMatch[0]);
  return { ...result, image_type: imageType, image_url: imageUrl };
}
