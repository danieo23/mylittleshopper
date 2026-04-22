import React, { useState, useRef, useEffect } from 'react';
import { ArrowRight, ShoppingBag, Loader2, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/api/client';

const SUGGESTED = [
  'I need fits for a weekend trip to Italy.',
  'Refresh my wardrobe for summer — keep it minimal.',
  'Find me something to wear to a rooftop dinner.',
  'I have a job interview next week, something sharp but relaxed.',
];

const LOADING_PHRASES = [
  'Lives are about to be changed…',
  'Glow up in 3, 2, 1…',
  'You are NOT ready for this.',
  'The fits are incoming.',
  'Scouring the internet for your next obsession…',
  'Your future wardrobe is loading…',
  'Hold tight, this is going to be good.',
];

export default function Dashboard() {
  const [messages, setMessages] = useState([]);
  const [history, setHistory]   = useState([]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]         = useState(false);
  const [loadingPhrase, setLoadingPhrase] = useState(LOADING_PHRASES[0]);
  const [userId, setUserId]           = useState(null);
  const bottomRef    = useRef(null);
  const animRef      = useRef(null);
  const phraseRef    = useRef(null);
  const phraseIdxRef = useRef(0);

  // Get user and load saved chat
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setUserId(user.id);
      const saved = localStorage.getItem(`chat_${user.id}`);
      if (saved) {
        try {
          const { messages: m, history: h } = JSON.parse(saved);
          if (m?.length) setMessages(m);
          if (h?.length) setHistory(h);
        } catch {}
      }
    });
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Clean up on unmount
  useEffect(() => () => {
    if (animRef.current)   clearInterval(animRef.current);
    if (phraseRef.current) clearInterval(phraseRef.current);
  }, []);

  const startPhraseLoop = () => {
    phraseIdxRef.current = 0;
    setLoadingPhrase(LOADING_PHRASES[0]);
    phraseRef.current = setInterval(() => {
      phraseIdxRef.current = (phraseIdxRef.current + 1) % LOADING_PHRASES.length;
      setLoadingPhrase(LOADING_PHRASES[phraseIdxRef.current]);
    }, 3500);
  };

  const stopPhraseLoop = () => {
    if (phraseRef.current) { clearInterval(phraseRef.current); phraseRef.current = null; }
  };

  const animateLastMessage = (fullText) => {
    if (animRef.current) clearInterval(animRef.current);
    const words = fullText.split(' ');
    let i = 0;
    animRef.current = setInterval(() => {
      i++;
      setMessages(m => {
        const copy = [...m];
        const last = copy[copy.length - 1];
        if (last?.role === 'ai') copy[copy.length - 1] = { role: 'ai', text: words.slice(0, i).join(' ') };
        return copy;
      });
      if (i >= words.length) clearInterval(animRef.current);
    }, 18);
  };

  const send = async (text) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput('');
    setLoading(true);
    startPhraseLoop();
    setMessages(m => [...m, { role: 'user', text: msg }]);

    try {
      const res = await fetch('/api/agent', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ message: msg, conversationHistory: history, userId }),
      });

      // Vercel can return plain-text errors on timeout — always parse safely
      const raw = await res.text();
      let data;
      try { data = JSON.parse(raw); }
      catch { throw new Error('The request timed out. Your stylist is still warming up — try again in a moment.'); }

      if (data.error) throw new Error(data.error);

      setHistory(data.history);
      stopPhraseLoop();
      setLoading(false);

      // Save full conversation to localStorage
      setMessages(prev => {
        const newMsgs = [...prev, { role: 'ai', text: data.reply }];
        if (userId) localStorage.setItem(`chat_${userId}`, JSON.stringify({ messages: newMsgs, history: data.history }));
        return [...prev, { role: 'ai', text: '' }];
      });

      animateLastMessage(data.reply);

    } catch (err) {
      stopPhraseLoop();
      setLoading(false);
      setMessages(m => [...m, { role: 'ai', text: `Error: ${err.message}` }]);
    }
  };

  const clearChat = () => {
    if (animRef.current) clearInterval(animRef.current);
    setMessages([]);
    setHistory([]);
    if (userId) localStorage.removeItem(`chat_${userId}`);
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
          {/* Clear chat button */}
          <div className="flex justify-end mb-2">
            <button onClick={clearChat} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition">
              <Trash2 className="w-3 h-3" /> Clear chat
            </button>
          </div>

          {messages.map((msg, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[70%] px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-foreground text-background'
                  : 'bg-card border border-border text-foreground'
              }`}>
                {msg.text}
                {msg.role === 'ai' && msg.text === '' && (
                  <span className="inline-block w-1.5 h-3.5 bg-primary animate-pulse ml-0.5" />
                )}
              </div>
            </motion.div>
          ))}

          {loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
              <div className="bg-card border border-border px-4 py-3 flex gap-1.5 items-center">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                <AnimatePresence mode="wait">
                  <motion.span
                    key={loadingPhrase}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.3 }}
                    className="text-xs text-muted-foreground"
                  >
                    {loadingPhrase}
                  </motion.span>
                </AnimatePresence>
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
