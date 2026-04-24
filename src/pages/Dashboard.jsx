import React, { useState, useRef, useEffect } from 'react';
import { ArrowRight, ShoppingBag, Loader2, Trash2, RefreshCw, ThumbsDown, Heart, ExternalLink, ChevronLeft, ChevronRight, Plus, X, MessageSquare } from 'lucide-react';
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

function formatRelativeDate(iso) {
  const d    = new Date(iso);
  const now  = new Date();
  const diff = (now - d) / 1000;
  if (diff < 60)        return 'just now';
  if (diff < 3600)      return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)     return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 2) return 'yesterday';
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── Conversation sidebar item ────────────────────────────────────────

function ConversationItem({ conv, active, onClick, onDelete }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      className={`flex items-start gap-2 px-3 py-2.5 cursor-pointer transition ${
        active
          ? 'bg-secondary text-foreground'
          : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
      }`}
    >
      <MessageSquare className="w-3 h-3 mt-0.5 shrink-0 opacity-50" />
      <div className="flex-1 min-w-0">
        <div className="text-xs truncate leading-snug">{conv.title ?? 'Chat'}</div>
        <div className="text-[9px] text-muted-foreground/50 mt-0.5">{formatRelativeDate(conv.updated_at)}</div>
      </div>
      {hovered && (
        <button
          onClick={e => { e.stopPropagation(); onDelete(); }}
          className="shrink-0 text-muted-foreground/50 hover:text-destructive transition mt-0.5"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

// ─── Product card ────────────────────────────────────────────────────

function ProductCard({ item, onReroll, onLike, onDislike, swapping }) {
  const [imgIdx,   setImgIdx]   = useState(0);
  const [liked,    setLiked]    = useState(false);
  const [disliked, setDisliked] = useState(false);
  const p      = item.product ?? {};
  const name   = p.name  ?? item.product_name ?? item.category ?? 'Item';
  const price  = p.price ?? item.price ?? null;
  const store  = p.store ?? null;
  const url    = p.product_url ?? null;
  const images = (p.all_images?.length ? p.all_images : (p.image_url ? [p.image_url] : [])).filter(Boolean);
  const img    = images[imgIdx] ?? null;

  const handleLike = () => { if (liked) return; setLiked(true); setDisliked(false); onLike?.(); };
  const handleDislike = () => { if (disliked) return; setDisliked(true); setLiked(false); onDislike?.(); };

  return (
    <div className="w-56 shrink-0 flex flex-col border border-border bg-card snap-start relative">
      {swapping && (
        <div className="absolute inset-0 z-10 bg-background/75 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}
      {/* Image — full area is a link when URL is available */}
      <a
        href={url ?? undefined}
        target="_blank"
        rel="noopener noreferrer"
        onClick={e => !url && e.preventDefault()}
        className={`relative aspect-[3/4] bg-secondary overflow-hidden block group ${url ? 'cursor-pointer' : 'cursor-default'}`}
      >
        {img
          ? <img
              key={img}
              src={img}
              alt={name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={() => {
                const next = images.findIndex((u, i) => i > imgIdx && u !== img);
                if (next !== -1) setImgIdx(next);
              }}
            />
          : <div className="w-full h-full flex flex-col items-center justify-center gap-2 px-3 text-center">
              <ShoppingBag className="w-8 h-8 text-muted-foreground/30" />
              {store && <span className="text-[9px] uppercase tracking-widest text-muted-foreground/50">{store}</span>}
            </div>
        }

        {/* Shop now overlay on hover */}
        {url && (
          <div className="absolute inset-x-0 bottom-0 py-2 bg-black/60 flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <ExternalLink className="w-3 h-3 text-white" />
            <span className="text-[9px] uppercase tracking-widest text-white font-medium">Shop now</span>
          </div>
        )}

        {/* Multi-image dots */}
        {images.length > 1 && (
          <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-1">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={e => { e.stopPropagation(); e.preventDefault(); setImgIdx(i); }}
                className={`w-1.5 h-1.5 rounded-full transition ${i === imgIdx ? 'bg-white' : 'bg-white/40'}`}
              />
            ))}
          </div>
        )}

        {/* Prev/next image arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={e => { e.stopPropagation(); e.preventDefault(); setImgIdx(i => (i - 1 + images.length) % images.length); }}
              className="absolute left-1 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center bg-black/40 hover:bg-black/60 transition"
            >
              <ChevronLeft className="w-4 h-4 text-white" />
            </button>
            <button
              onClick={e => { e.stopPropagation(); e.preventDefault(); setImgIdx(i => (i + 1) % images.length); }}
              className="absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center bg-black/40 hover:bg-black/60 transition"
            >
              <ChevronRight className="w-4 h-4 text-white" />
            </button>
          </>
        )}
      </a>

      {/* Info */}
      <div className="p-3 flex flex-col flex-1 gap-1">
        {store && <div className="text-[9px] uppercase tracking-widest text-muted-foreground">{store}</div>}
        {url
          ? <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-foreground leading-snug line-clamp-2 flex-1 hover:underline">{name}</a>
          : <div className="text-xs text-foreground leading-snug line-clamp-2 flex-1">{name}</div>
        }
        {price != null && <div className="text-sm font-semibold text-foreground">${price}</div>}

        {/* Actions */}
        <div className="flex items-center gap-px mt-1 pt-2 border-t border-border">
          <button onClick={onReroll} title="Swap this item"
            className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[9px] uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-secondary transition">
            <RefreshCw className="w-3 h-3" /> Swap
          </button>
          <button onClick={handleLike} title="Love this"
            className={`px-2 py-1.5 transition border-l border-border ${liked ? 'text-rose-500 bg-rose-500/10' : 'text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10'}`}>
            <Heart className={`w-3 h-3 ${liked ? 'fill-current' : ''}`} />
          </button>
          <button onClick={handleDislike} title="Not my style"
            className={`px-2 py-1.5 transition border-l border-border ${disliked ? 'text-destructive bg-destructive/10' : 'text-muted-foreground hover:text-destructive hover:bg-destructive/10'}`}>
            <ThumbsDown className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Single outfit row ───────────────────────────────────────────────

function OutfitRow({ outfit, outfitIdx, userId, history }) {
  const [items,    setItems]    = useState(() => outfit?.items ?? []);
  const [swapping, setSwapping] = useState(new Set());

  const sendFeedback = (signalType, item) => {
    if (!userId) return;
    const p = item.product ?? {};
    fetch('/api/feedback', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        signalType,
        itemAttributes: {
          name:           p.name ?? item.product_name ?? null,
          colors:         p.colors ?? [],
          fit_type:       p.fit_type ?? null,
          style_category: p.style_category ?? null,
          brand:          p.brand ?? null,
          price:          p.price ?? null,
          category:       item.category ?? null,
        },
      }),
    }).catch(() => {});
  };

  const handleReroll = async (item, itemIdx) => {
    const p            = item.product ?? {};
    const excludedName = p.name ?? item.product_name ?? '';
    const category     = item.category ?? 'item';

    setSwapping(prev => new Set([...prev, itemIdx]));
    try {
      const res  = await fetch('/api/agent', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message:             `Find me a different ${category} — same vibe and style as this outfit.`,
          conversationHistory: history ?? [],
          userId,
          recentConversations: [],
          excludeProductName:  excludedName,
        }),
      });
      const data = await res.json();
      const newOutfitItems = data.outfits?.[0]?.items ?? [];
      const replacement = newOutfitItems.find(i => i.category === category && i.product?.name !== excludedName);
      if (replacement?.product) {
        setItems(prev => prev.map((it, i) => i === itemIdx ? replacement : it));
      }
    } catch (err) {
      console.error('[swap]', err);
    } finally {
      setSwapping(prev => { const s = new Set(prev); s.delete(itemIdx); return s; });
    }
  };

  const handleLike    = (item) => sendFeedback('approval',  item);
  const handleDislike = (item) => sendFeedback('rejection', item);

  const totalPrice = outfit.total_price
    ?? items.reduce((s, i) => s + (i.product?.price ?? 0), 0);

  return (
    <div className={`border border-border bg-card overflow-hidden ${outfitIdx > 0 ? 'mt-3' : ''}`}>
      {/* Outfit header + total */}
      <div className="flex items-start justify-between px-4 pt-4 pb-2">
        <div className="min-w-0 flex-1 pr-4">
          <div className="font-serif text-xl text-foreground mb-0.5">{outfit.outfit_name ?? 'Your Look'}</div>
          {outfit.style_note && (
            <div className="text-xs text-muted-foreground leading-relaxed">{outfit.style_note}</div>
          )}
          {outfit.occasion_fit && (
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground/50 mt-1">{outfit.occasion_fit}</div>
          )}
        </div>
        <div className="text-right shrink-0">
          {totalPrice > 0 && (
            <>
              <div className="text-2xl font-semibold text-foreground">${totalPrice.toFixed(0)}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">total</div>
            </>
          )}
          {outfit.wardrobe_multiplier > 0 && (
            <div className="text-[10px] text-muted-foreground mt-1">
              pairs w/ {outfit.wardrobe_multiplier} owned
            </div>
          )}
        </div>
      </div>

      {/* Scrollable items */}
      <div
        className="flex gap-3 overflow-x-auto px-4 pb-4 pt-2 snap-x scroll-smooth"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {items.map((item, i) => (
          <ProductCard
            key={`${item.product?.name ?? i}-${outfitIdx}-${i}`}
            item={item}
            swapping={swapping.has(i)}
            onReroll={() => handleReroll(item, i)}
            onLike={() => handleLike(item)}
            onDislike={() => handleDislike(item)}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Outfit carousel — renders ALL returned outfits ──────────────────

function OutfitCarousel({ outfits, userId, history }) {
  if (!outfits?.length) return null;
  return (
    <div className="mt-3">
      {outfits.map((outfit, i) => (
        <OutfitRow
          key={i}
          outfit={outfit}
          outfitIdx={i}
          userId={userId}
          history={history}
        />
      ))}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────

export default function Dashboard() {
  const [messages,        setMessages]        = useState([]);
  const [history,         setHistory]         = useState([]);
  const [input,           setInput]           = useState('');
  const [loading,         setLoading]         = useState(false);
  const [loadingPhrase,   setLoadingPhrase]   = useState(LOADING_PHRASES[0]);
  const [userId,          setUserId]          = useState(null);
  const [conversations,   setConversations]   = useState([]);
  const [conversationId,  setConversationId]  = useState(null);
  const [loadingConvId,   setLoadingConvId]   = useState(null);

  const bottomRef    = useRef(null);
  const animRef      = useRef(null);
  const phraseRef    = useRef(null);
  const phraseIdxRef = useRef(0);
  // Track latest messages for save — avoids stale closure in setMessages callbacks
  const messagesRef  = useRef([]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setUserId(user.id);
      fetch(`/api/conversations?userId=${user.id}`)
        .then(r => r.json())
        .then(d => { if (d.conversations) setConversations(d.conversations); })
        .catch(() => {});
    });
  }, []);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

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

  // Persist conversation to DB — fire-and-forget
  const saveConversation = (msgs, hist, currentConvId) => {
    if (!userId || !msgs.length) return;
    const firstUser = msgs.find(m => m.role === 'user');
    const title = firstUser ? firstUser.text.slice(0, 60) : 'Chat';
    const body  = { userId, title, messages: msgs, history: hist };
    if (currentConvId) body.conversationId = currentConvId;

    fetch('/api/conversations', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    })
      .then(r => r.json())
      .then(d => {
        if (!d.id) return;
        if (!currentConvId) {
          setConversationId(d.id);
          setConversations(prev => [
            { id: d.id, title, updated_at: new Date().toISOString() },
            ...prev,
          ]);
        } else {
          setConversations(prev =>
            prev.map(c => c.id === d.id ? { ...c, title, updated_at: new Date().toISOString() } : c)
          );
        }
      })
      .catch(() => {});
  };

  const loadConversation = async (conv) => {
    if (loading || loadingConvId) return;
    setLoadingConvId(conv.id);
    try {
      const res  = await fetch(`/api/conversations?userId=${userId}&id=${conv.id}`);
      const data = await res.json();
      if (data.messages_json) {
        if (animRef.current) clearInterval(animRef.current);
        setMessages(data.messages_json);
        setHistory(data.history_json ?? []);
        setConversationId(conv.id);
      }
    } catch {}
    setLoadingConvId(null);
  };

  const deleteConversation = async (id) => {
    await fetch('/api/conversations', {
      method:  'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ userId, conversationId: id }),
    }).catch(() => {});
    setConversations(prev => prev.filter(c => c.id !== id));
    if (conversationId === id) {
      setMessages([]);
      setHistory([]);
      setConversationId(null);
    }
  };

  const startNewChat = () => {
    if (animRef.current)   clearInterval(animRef.current);
    if (phraseRef.current) clearInterval(phraseRef.current);
    setMessages([]);
    setHistory([]);
    setConversationId(null);
  };

  const send = async (text) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput('');
    setLoading(true);
    startPhraseLoop();
    setMessages(m => [...m, { role: 'user', text: msg }]);

    // Snapshot conversationId at send time (state may change during async)
    const currentConvId = conversationId;

    try {
      const res = await fetch('/api/agent', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          message:             msg,
          conversationHistory: history,
          userId,
          recentConversations: conversations.slice(0, 5).map(c => ({
            title:      c.title,
            updated_at: c.updated_at,
          })),
        }),
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
      const aiMsg     = { role: 'ai', text: replyText, outfits: data.outfits ?? null, choices: data.choices ?? null };

      setMessages(prev => {
        const fullMsgs = [...prev, aiMsg];
        saveConversation(fullMsgs, data.history, currentConvId);
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

  const isEmpty = messages.length === 0;

  return (
    <div className="flex h-screen max-h-screen">

      {/* ── Chat history sidebar ─────────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-52 shrink-0 border-r border-border overflow-hidden">
        {/* New chat */}
        <div className="shrink-0 px-3 py-3 border-b border-border">
          <button
            onClick={startNewChat}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-[11px] uppercase tracking-wider border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition"
          >
            <Plus className="w-3.5 h-3.5" /> New chat
          </button>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
          {conversations.length === 0 ? (
            <p className="px-4 py-6 text-[10px] text-muted-foreground/40 text-center leading-relaxed">
              Your saved chats will appear here
            </p>
          ) : (
            conversations.map(conv => (
              <ConversationItem
                key={conv.id}
                conv={conv}
                active={conv.id === conversationId}
                onClick={() => loadConversation(conv)}
                onDelete={() => deleteConversation(conv.id)}
              />
            ))
          )}
        </div>
      </aside>

      {/* ── Chat area ────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Lychee header */}
        <div className="shrink-0 px-6 py-4 border-b border-border flex items-center gap-2">
          <span className="font-serif text-lg tracking-tight">Lychee</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">your stylist</span>
        </div>

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
                <button
                  onClick={startNewChat}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition"
                >
                  <Plus className="w-3 h-3" /> New chat
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
                      {msg.text && (
                        <div className={`px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap inline-block max-w-[75%] ${
                          msg.isError
                            ? 'bg-destructive/10 border border-destructive/40 text-destructive'
                            : 'bg-card border border-border text-foreground'
                        }`}>
                          {msg.text}
                        </div>
                      )}
                      {msg.choices && i === messages.length - 1 && (
                        <div className="flex flex-wrap gap-2 mt-2 max-w-[75%]">
                          {msg.choices.map((choice, ci) => (
                            <button
                              key={ci}
                              onClick={() => send(choice)}
                              className="px-3 py-1.5 text-xs border border-border bg-card hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
                            >
                              {choice}
                            </button>
                          ))}
                        </div>
                      )}
                      {!msg.text && !msg.outfits && (
                        <div className="bg-card border border-border px-4 py-3 inline-block">
                          <span className="inline-block w-1.5 h-3.5 bg-primary animate-pulse" />
                        </div>
                      )}
                      {msg.outfits && (
                        <OutfitCarousel outfits={msg.outfits} userId={userId} history={history} />
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
    </div>
  );
}
