import React, { useState, useRef, useEffect } from 'react';
import { ArrowRight, ShoppingBag, Loader2, Trash2, RefreshCw, ThumbsDown, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
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

// ─── Product card ────────────────────────────────────────────────────

function ProductCard({ item, onReroll, onDislike }) {
  const [imgFailed, setImgFailed] = useState(false);
  const p = item.product ?? {};
  const name  = p.name  ?? item.product_name ?? item.category ?? 'Item';
  const price = p.price ?? item.price ?? null;
  const store = p.store ?? null;
  const img   = p.image_url ?? null;
  const url   = p.product_url ?? null;

  return (
    <div className="w-44 shrink-0 flex flex-col border border-border bg-card snap-start">
      {/* Image */}
      <div className="relative aspect-[3/4] bg-secondary overflow-hidden group">
        {img && !imgFailed
          ? <img
              src={img}
              alt={name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={() => setImgFailed(true)}
            />
          : <div className="w-full h-full flex flex-col items-center justify-center gap-2 px-3 text-center">
              <ShoppingBag className="w-8 h-8 text-muted-foreground/30" />
              {store && <span className="text-[9px] uppercase tracking-widest text-muted-foreground/50">{store}</span>}
            </div>
        }
        {url && (
          <a
            href={url} target="_blank" rel="noopener noreferrer"
            className="absolute inset-0 flex items-end justify-end p-2 opacity-0 group-hover:opacity-100 transition bg-gradient-to-t from-black/30 to-transparent"
          >
            <ExternalLink className="w-4 h-4 text-white" />
          </a>
        )}
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col flex-1 gap-1">
        {store && <div className="text-[9px] uppercase tracking-widest text-muted-foreground">{store}</div>}
        <div className="text-xs text-foreground leading-snug line-clamp-2 flex-1">{name}</div>
        {price != null && <div className="text-sm font-semibold text-foreground">${price}</div>}

        {/* Actions */}
        <div className="flex items-center gap-px mt-1 pt-2 border-t border-border">
          <button
            onClick={onReroll}
            title="Swap this item"
            className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[9px] uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-secondary transition"
          >
            <RefreshCw className="w-3 h-3" /> Swap
          </button>
          <button
            onClick={onDislike}
            title="Not my style"
            className="px-2 py-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition border-l border-border"
          >
            <ThumbsDown className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Outfit carousel ────────────────────────────────────────────────

function OutfitCarousel({ outfits, onSendMessage }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const scrollRef = useRef(null);

  if (!outfits?.length) return null;
  const outfit = outfits[activeIdx];
  const items  = outfit.items ?? [];

  const scroll = (dir) => {
    if (scrollRef.current) scrollRef.current.scrollBy({ left: dir * 188, behavior: 'smooth' });
  };

  const handleReroll = (item) => {
    const p    = item.product ?? {};
    const name = p.name ?? item.product_name ?? item.category ?? 'that item';
    onSendMessage(`Swap out the ${name} — find me a different option that fits the same look.`);
  };

  const handleDislike = (item) => {
    const p    = item.product ?? {};
    const name = p.name ?? item.product_name ?? item.category ?? 'that item';
    onSendMessage(`I don't like the ${name}. Replace it with something different.`);
  };

  const totalPrice = outfit.total_price
    ?? items.reduce((s, i) => s + (i.product?.price ?? 0), 0);

  return (
    <div className="mt-3 border border-border bg-card overflow-hidden">
      {/* Outfit tabs */}
      {outfits.length > 1 && (
        <div className="flex border-b border-border overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {outfits.map((o, i) => (
            <button
              key={i}
              onClick={() => setActiveIdx(i)}
              className={`shrink-0 px-4 py-2.5 text-[10px] uppercase tracking-wider border-b-2 transition -mb-px ${
                activeIdx === i
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {o.outfit_name ?? `Look ${i + 1}`}
            </button>
          ))}
        </div>
      )}

      {/* Outfit header */}
      <div className="flex items-start justify-between px-4 pt-4 pb-2">
        <div className="min-w-0 flex-1 pr-4">
          {outfits.length === 1 && outfit.outfit_name && (
            <div className="font-serif text-xl text-foreground mb-0.5">{outfit.outfit_name}</div>
          )}
          {outfit.style_note && (
            <div className="text-xs text-muted-foreground leading-relaxed">{outfit.style_note}</div>
          )}
          {outfit.occasion_fit && (
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground/50 mt-1">{outfit.occasion_fit}</div>
          )}
        </div>
        {totalPrice > 0 && (
          <div className="text-right shrink-0">
            <div className="text-2xl font-semibold text-foreground">${totalPrice}</div>
            {outfit.wardrobe_multiplier > 0 && (
              <div className="text-[10px] text-muted-foreground mt-0.5">
                pairs w/ {outfit.wardrobe_multiplier} wardrobe items
              </div>
            )}
          </div>
        )}
      </div>

      {/* Scrollable items */}
      <div className="relative">
        <button
          onClick={() => scroll(-1)}
          className="absolute left-1 top-1/2 -translate-y-1/2 z-10 w-7 h-7 flex items-center justify-center bg-background/90 border border-border shadow-sm hover:bg-secondary transition"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto px-8 pb-4 pt-2 snap-x scroll-smooth"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {items.map((item, i) => (
            <ProductCard
              key={i}
              item={item}
              onReroll={() => handleReroll(item)}
              onDislike={() => handleDislike(item)}
            />
          ))}
        </div>

        <button
          onClick={() => scroll(1)}
          className="absolute right-1 top-1/2 -translate-y-1/2 z-10 w-7 h-7 flex items-center justify-center bg-background/90 border border-border shadow-sm hover:bg-secondary transition"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────

export default function Dashboard() {
  const [messages, setMessages] = useState([]);
  const [history, setHistory]   = useState([]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [loadingPhrase, setLoadingPhrase] = useState(LOADING_PHRASES[0]);
  const [userId, setUserId]     = useState(null);
  const bottomRef    = useRef(null);
  const animRef      = useRef(null);
  const phraseRef    = useRef(null);
  const phraseIdxRef = useRef(0);

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
        if (last?.role === 'ai') copy[copy.length - 1] = { ...last, text: words.slice(0, i).join(' ') };
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

      const raw = await res.text();
      let data;
      try { data = JSON.parse(raw); }
      catch { throw new Error('The request timed out. Try again in a moment.'); }

      if (data.error) throw new Error(data.error);

      setHistory(data.history);
      stopPhraseLoop();
      setLoading(false);

      const replyText = data.reply || (data.outfits ? '' : 'Something went wrong — please try again.');
      setMessages(prev => {
        const newMsg  = { role: 'ai', text: replyText, outfits: data.outfits ?? null };
        const newMsgs = [...prev, newMsg];
        if (userId) localStorage.setItem(`chat_${userId}`, JSON.stringify({ messages: newMsgs, history: data.history }));
        return [...prev, { role: 'ai', text: '', outfits: data.outfits ?? null }];
      });

      animateLastMessage(replyText);

    } catch (err) {
      stopPhraseLoop();
      setLoading(false);
      const errText = err.message || 'Something went wrong — please try again.';
      setMessages(m => [...m, { role: 'ai', text: errText, isError: true }]);
    }
  };

  const clearChat = () => {
    if (animRef.current)   clearInterval(animRef.current);
    if (phraseRef.current) clearInterval(phraseRef.current);
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
        <div className="flex-1 overflow-y-auto px-4 py-8">
          <div className="max-w-4xl mx-auto space-y-4">
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
                {msg.role === 'user' ? (
                  <div className="max-w-[70%] px-4 py-3 text-sm leading-relaxed bg-foreground text-background">
                    {msg.text}
                  </div>
                ) : (
                  <div className="w-full">
                    {/* Text bubble */}
                    {msg.text && (
                      <div className={`px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap inline-block max-w-[75%] ${
                        msg.isError
                          ? 'bg-destructive/10 border border-destructive/40 text-destructive'
                          : 'bg-card border border-border text-foreground'
                      }`}>
                        {msg.text}
                      </div>
                    )}
                    {/* Cursor while animating empty reply */}
                    {!msg.text && !msg.outfits && (
                      <div className="bg-card border border-border px-4 py-3 inline-block">
                        <span className="inline-block w-1.5 h-3.5 bg-primary animate-pulse" />
                      </div>
                    )}
                    {/* Outfit cards */}
                    {msg.outfits && (
                      <OutfitCarousel outfits={msg.outfits} onSendMessage={send} />
                    )}
                  </div>
                )}
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
