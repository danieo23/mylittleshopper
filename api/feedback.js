import { updateStyleDna } from '../tools/update_style_dna.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { userId, signalType, itemAttributes, inferredReason } = req.body;
  if (!userId || !signalType || !itemAttributes) {
    return res.status(400).json({ error: 'userId, signalType, and itemAttributes required' });
  }

  try {
    await updateStyleDna(userId, signalType, itemAttributes, null, inferredReason ?? null);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[feedback]', err);
    return res.status(500).json({ error: err.message });
  }
}
