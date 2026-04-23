import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const STYLE_TAGS = [
  'Minimal', 'Streetwear', 'Old Money', 'Y2K', 'Preppy', 'Coastal', 'Techwear',
  'Vintage', 'Business Casual', 'Athleisure', 'Bohemian', 'Grunge', 'Dark Academia',
  'Cottagecore', 'Hypebeast', 'Smart Casual', 'Avant-garde', 'Normcore', 'Rockstar',
  'Festival', 'Resort / Vacation', 'Date Night', 'Workwear', 'Quiet Luxury',
];

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { description } = req.body;
  if (!description?.trim()) return res.status(400).json({ error: 'description required' });

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 256,
      messages: [{
        role: 'user',
        content: `A user described their personal style. Extract ALL tags that meaningfully appear in what they said — be generous, not conservative. A rich description should produce many tags.

User said: "${description}"

Available tags: ${STYLE_TAGS.join(', ')}

Rules:
- Include every tag that matches any part of the description, even partially
- A mention of baggy jeans or cargos → Streetwear, Normcore
- Darker colors + layering → Grunge
- Graphic or vintage tees → Vintage, Streetwear
- Button-downs + casual footwear → Coastal or Bohemian or Smart Casual
- Can include up to 8 tags — use as many as fit
- Only exclude tags that are completely absent from the description
- Return ONLY a JSON array, no other text

Example for a rich description: ["Streetwear", "Vintage", "Grunge", "Normcore", "Coastal"]`,
      }],
    });

    const text = response.content[0].text;
    const match = text.match(/\[[\s\S]*?\]/);
    const raw = match ? JSON.parse(match[0]) : [];
    const tags = raw.filter(t => STYLE_TAGS.includes(t));

    return res.json({ tags });
  } catch (err) {
    console.error('[style-tags]', err);
    return res.status(500).json({ error: err.message, tags: [] });
  }
}
