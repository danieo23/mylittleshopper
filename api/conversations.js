import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { userId, id } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    if (id) {
      const { data, error } = await supabase
        .from('conversations')
        .select('id, title, messages_json, history_json')
        .eq('id', id)
        .eq('user_id', userId)
        .single();
      if (error) return res.status(404).json({ error: 'Not found' });
      return res.status(200).json(data);
    }

    const { data, error } = await supabase
      .from('conversations')
      .select('id, title, created_at, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(50);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ conversations: data ?? [] });
  }

  if (req.method === 'POST') {
    const { userId, conversationId, title, messages, history } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    if (conversationId) {
      const { data, error } = await supabase
        .from('conversations')
        .update({
          title,
          messages_json: messages,
          history_json:  history,
          updated_at:    new Date().toISOString(),
        })
        .eq('id', conversationId)
        .eq('user_id', userId)
        .select('id')
        .single();
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ id: data.id });
    }

    const { data, error } = await supabase
      .from('conversations')
      .insert({ user_id: userId, title, messages_json: messages, history_json: history })
      .select('id')
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ id: data.id });
  }

  if (req.method === 'DELETE') {
    const { userId, conversationId } = req.body;
    if (!userId || !conversationId) return res.status(400).json({ error: 'userId and conversationId required' });
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId)
      .eq('user_id', userId);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).end();
}
