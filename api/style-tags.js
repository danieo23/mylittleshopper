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
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      messages: [{
        role: 'user',
        content: `A user described their personal style as: "${description}"

From this list of style tags: ${STYLE_TAGS.join(', ')}

Return ONLY a JSON array of the most relevant matching tags (1-5 max). Only include tags that genuinely fit the description. Example: ["Minimal", "Quiet Luxury"]

If nothing fits, return: []`,
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
