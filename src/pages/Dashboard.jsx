import React, { useState, useRef, useEffect } from 'react';
import { ArrowRight, ShoppingBag, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/api/client';

const SUGGESTED = [
  'I need fits for a weekend trip to Italy.',
  'Refresh my wardrobe for summer — keep it minimal.',
  'Find me something to wear to a rooftop dinner.',
  'I have a job interview next week, something sharp but relaxed.',
];

export default function Dashboard() {
  const [messages, setMessages]   = useState([]);
  const [history, setHistory]     = useState([]);
  const [input, setInput]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [userId, setUserId]       = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = async (text) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput('');

    const userMsg = { role: 'user', text: msg };
    setMessages(m => [...m, userMsg]);
    setLoading(true);

    try {
      const res = await fetch('/api/agent', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ message: msg, conversationHistory: history, userId }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setMessages(m => [...m, { role: 'ai', text: data.reply }]);
      setHistory(data.history);
    } catch (err) {
      setMessages(m => [...m, { role: 'ai', text: `Error: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-screen max-h-screen">

      {/* Empty state */}
      <AnimatePresence>
        {isEmpty && (
          <motion.div
            initial={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center justify-center px-6 pb-8"
          >
            <ShoppingBag className="w-8 h-8 text-primary mb-4" />
            <h1 className="font-serif text-4xl tracking-tight text-foreground mb-2 text-center">
              What are we shopping for?
            </h1>
            <p className="text-sm text-muted-foreground mb-8 text-center">
              Describe the occasion, vibe, or trip — I'll handle the rest.
            </p>
            <div className="flex flex-wrap gap-2 justify-center max-w-lg">
              {SUGGESTED.map(s => (
                <button key={s} onClick={() => send(s)}
                  className="px-3 py-1.5 border border-border text-[11px] text-muted-foreground uppercase tracking-wider hover:border-foreground/40 hover:text-foreground transition">
                  {s}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Message thread */}
      {!isEmpty && (
        <div className="flex-1 overflow-y-auto px-6 py-8 space-y-4">
          {messages.map((msg, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[70%] px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-foreground text-background'
                  : 'bg-card border border-border text-foreground'
              }`}>
                {msg.text}
              </div>
            </motion.div>
          ))}

          {loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
              <div className="bg-card border border-border px-4 py-3 flex gap-1.5 items-center">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Shopping for you…</span>
              </div>
            </motion.div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Input bar */}
      <div className="shrink-0 border-t border-border p-4">
        <div className="max-w-3xl mx-auto flex items-end gap-3 bg-card border border-border p-3">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Tell me what you need…"
            rows={2}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground resize-none outline-none leading-relaxed"
          />
          <button onClick={() => send()}
            disabled={loading || !input.trim()}
            className="shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center hover:opacity-80 transition disabled:opacity-30">
            <ArrowRight className="w-4 h-4 text-primary-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
}
