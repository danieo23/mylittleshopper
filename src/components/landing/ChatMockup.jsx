import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';

// ─── Shared budget options ─────────────────────────────────────────
const BUDGET_OPTIONS = [
  { key: 'budget',  label: 'Budget',    sub: 'H&M, Depop, Burlington',      reply: "Budget-friendly — smart move!" },
  { key: 'mid',     label: 'Mid-range', sub: 'Zara, ASOS, Pacsun',          reply: "Mid-range, great picks available." },
  { key: 'premium', label: 'Premium',   sub: 'Revolve, Nordstrom, Net-a-Porter', reply: "Premium budget, no limits 🔥" },
];

// ─── Scenarios ─────────────────────────────────────────────────────
const SCENARIOS = [
  {
    id: 'spain',
    label: 'Trip coming up',
    preview: 'I have a trip to Spain in two weeks — beach looks and nights out.',
    opener: "I have a trip to Spain in two weeks and need outfits for the beach and going out at night 🌊",
    budgetQ: "Love it! What budget are we working with?",
    styleQ: "Great. What vibe are we going for in Spain?",
    styleOptions: [
      { label: "Effortless & Mediterranean", reply: "Effortless Mediterranean — my favourite brief." },
      { label: "Casual beachy all the way",  reply: "Pure beach energy, got it!" },
      { label: "Chic evenings, relaxed days", reply: "Day-to-night balance — perfect for Spain." },
    ],
    orderQ: "Okay, what should I pull together for you?",
    orderOptions: [
      "Beach set + a linen going-out look",
      "Full pack — 3 outfits for the whole trip",
      "Just the nightlife outfit for now",
    ],
    cartSummary: "2 linen sets + 1 going-out outfit — $274 total",
    doneMsg: "Done! Your order is placed 📦 Everything arrives before your trip. Enjoy Spain! 🇪🇸",
  },
  {
    id: 'winter',
    label: 'Season refresh',
    preview: 'Winter is right around the corner and I wear the same things every year.',
    opener: "Winter is coming up and I always wear the same things. I want a real refresh this year 🧥",
    budgetQ: "Winter refresh, yes! What budget should I work with?",
    styleQ: "Nice. How would you describe your winter vibe?",
    styleOptions: [
      { label: "Clean & elevated basics",  reply: "Elevated basics — timeless, love it." },
      { label: "Cozy and relaxed",         reply: "Cozy and relaxed — perfect for winter." },
      { label: "Sharp and put-together",   reply: "Sharp winter dressing — I'm into it." },
    ],
    orderQ: "Great. What should I build for you first?",
    orderOptions: [
      "A full winter capsule — coat, sweaters, trousers",
      "Just a great coat to anchor everything",
      "Cozy everyday basics refresh",
    ],
    cartSummary: "Wool coat, 2 sweaters, dark trousers — $363 total",
    doneMsg: "Order placed! 📦 Your new winter wardrobe is on the way. You're going to look great ❄️",
  },
  {
    id: 'wedding',
    label: 'Special occasion',
    preview: "I have a friend's wedding next month — outdoor, garden party dress code.",
    opener: "I have a friend's wedding next month, outdoor garden party dress code. No idea what to wear 😅",
    budgetQ: "Fun! Garden parties are great to dress for. What's your budget?",
    styleQ: "Love it. What direction are you leaning?",
    styleOptions: [
      { label: "Floral & feminine",        reply: "Floral and feminine — perfect for a garden party." },
      { label: "Chic and minimal",         reply: "Chic and minimal — understated but stunning." },
      { label: "Bold and memorable",       reply: "Bold choice! You'll definitely stand out 🌟" },
    ],
    orderQ: "Perfect. What should I find for you?",
    orderOptions: [
      "A floral midi dress — classic garden party",
      "A linen coord set — modern and chic",
      "Show me both options",
    ],
    cartSummary: "Floral midi dress + sandals + small clutch — $192 total",
    doneMsg: "Order placed! 🌸 You're going to be the best-dressed person there. Enjoy the wedding!",
  },
];

// ─── Message bubble ─────────────────────────────────────────────────
function Bubble({ msg }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`max-w-[85%] px-3.5 py-2.5 text-[13px] leading-relaxed ${
        msg.role === 'user'
          ? 'bg-foreground text-background'
          : 'bg-secondary text-foreground border border-border'
      }`}>
        {msg.text}
      </div>
    </motion.div>
  );
}

// ─── Choice button ──────────────────────────────────────────────────
function Choice({ label, sub, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left border border-border hover:border-primary/60 hover:bg-primary/5 transition px-3.5 py-2.5 group"
    >
      <div className="text-[13px] text-muted-foreground group-hover:text-foreground transition leading-snug">{label}</div>
      {sub && <div className="text-[11px] text-muted-foreground/50 mt-0.5">{sub}</div>}
    </button>
  );
}

// ─── ChatView ───────────────────────────────────────────────────────
function ChatView({ scenario, onBack }) {
  const [messages, setMessages] = useState([
    { role: 'user', text: scenario.opener },
    { role: 'ai',   text: scenario.budgetQ },
  ]);
  const [phase, setPhase]           = useState('budget');
  const [searching, setSearching]   = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const scrollRef = useRef(null);

  const push = useCallback((...msgs) => {
    setMessages(m => [...m, ...msgs]);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, phase, searching]);

  const pickBudget = (opt) => {
    push(
      { role: 'user', text: `${opt.label} — ${opt.sub}` },
      { role: 'ai',   text: `${opt.reply} ${scenario.styleQ}` },
    );
    setPhase('style');
  };

  const pickStyle = (opt) => {
    push(
      { role: 'user', text: opt.label },
      { role: 'ai',   text: `${opt.reply} ${scenario.orderQ}` },
    );
    setPhase('order');
  };

  const pickOrder = (text) => {
    push({ role: 'user', text });
    setPhase('idle');
    setSearching(true);
    setShowCustom(false);
    setTimeout(() => {
      setSearching(false);
      push(
        { role: 'ai', text: "Love it, I'm on it! 🙌" },
        { role: 'ai', text: `Found some great pieces — ${scenario.cartSummary}. Ready to go?` },
      );
      setPhase('checkout');
    }, 2000);
  };

  const pickCheckout = (choice) => {
    if (choice === 'checkout') {
      push({ role: 'user', text: 'Check out — go for it!' });
      setPhase('idle');
      setTimeout(() => {
        push({ role: 'ai', text: scenario.doneMsg });
        setPhase('done');
      }, 800);
    } else {
      push(
        { role: 'user', text: 'Let me verify the items first.' },
        { role: 'ai',   text: `Here's your cart: ${scenario.cartSummary}. Everything look good?` },
      );
      setPhase('verify');
    }
  };

  const pickVerify = (choice) => {
    if (choice === 'go') {
      push({ role: 'user', text: "Looks great — check out!" });
      setPhase('idle');
      setTimeout(() => {
        push({ role: 'ai', text: scenario.doneMsg });
        setPhase('done');
      }, 800);
    } else {
      push(
        { role: 'user', text: "Let me change a couple things." },
        { role: 'ai',   text: "No problem! Just tell me what you'd like to swap and I'll find alternatives 🔄" },
      );
      setPhase('done');
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0">
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="w-2 h-2 rounded-full bg-primary" />
        <span className="text-[11px] uppercase tracking-widest text-muted-foreground">your shopper</span>
        <span className="ml-auto text-[10px] text-primary/70 uppercase tracking-wider">online</span>
      </div>

      {/* Message history */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, i) => <Bubble key={i} msg={msg} />)}
        {searching && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
            <div className="bg-secondary border border-border px-3.5 py-2.5 flex items-center gap-2 text-[13px] text-muted-foreground">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Searching across stores…
            </div>
          </motion.div>
        )}
      </div>

      {/* Choice panel */}
      <div className="shrink-0 border-t border-border">
        <AnimatePresence mode="wait">

          {phase === 'budget' && (
            <motion.div key="budget"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
              className="p-3 space-y-2"
            >
              {BUDGET_OPTIONS.map(opt => (
                <Choice key={opt.key} label={opt.label} sub={opt.sub} onClick={() => pickBudget(opt)} />
              ))}
            </motion.div>
          )}

          {phase === 'style' && (
            <motion.div key="style"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
              className="p-3 space-y-2"
            >
              {scenario.styleOptions.map((opt, i) => (
                <Choice key={i} label={opt.label} onClick={() => pickStyle(opt)} />
              ))}
            </motion.div>
          )}

          {phase === 'order' && (
            <motion.div key="order"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
              className="p-3 space-y-2"
            >
              {scenario.orderOptions.map((opt, i) => (
                <Choice key={i} label={opt} onClick={() => pickOrder(opt)} />
              ))}
              {!showCustom ? (
                <button onClick={() => setShowCustom(true)}
                  className="w-full text-left px-3.5 py-1.5 text-[11px] text-muted-foreground/50 hover:text-muted-foreground transition uppercase tracking-wider">
                  + Type something specific
                </button>
              ) : (
                <div className="flex gap-2">
                  <input autoFocus value={customInput} onChange={e => setCustomInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && customInput.trim()) pickOrder(customInput.trim()); }}
                    placeholder="What do you want?"
                    className="flex-1 bg-secondary border border-border px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground outline-none focus:border-foreground/30" />
                  <button onClick={() => customInput.trim() && pickOrder(customInput.trim())}
                    className="px-3 bg-primary text-primary-foreground hover:opacity-80 transition">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {phase === 'checkout' && (
            <motion.div key="checkout"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
              className="p-3 flex gap-2"
            >
              <button onClick={() => pickCheckout('checkout')}
                className="flex-1 py-2.5 bg-primary text-primary-foreground text-[12px] uppercase tracking-wider hover:opacity-90 transition">
                ✓ Check out
              </button>
              <button onClick={() => pickCheckout('verify')}
                className="flex-1 py-2.5 border border-border text-[12px] text-muted-foreground uppercase tracking-wider hover:text-foreground hover:border-foreground/40 transition">
                Verify items first
              </button>
            </motion.div>
          )}

          {phase === 'verify' && (
            <motion.div key="verify"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
              className="p-3 flex gap-2"
            >
              <button onClick={() => pickVerify('go')}
                className="flex-1 py-2.5 bg-primary text-primary-foreground text-[12px] uppercase tracking-wider hover:opacity-90 transition">
                ✓ Looks good — check out
              </button>
              <button onClick={() => pickVerify('change')}
                className="flex-1 py-2.5 border border-border text-[12px] text-muted-foreground uppercase tracking-wider hover:text-foreground hover:border-foreground/40 transition">
                Change something
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Main ───────────────────────────────────────────────────────────
export default function ChatMockup() {
  const [active, setActive] = useState(null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="bg-card border border-border overflow-hidden flex flex-col"
      style={{ height: 500 }}
    >
      <AnimatePresence mode="wait" initial={false}>
        {active ? (
          <motion.div key={active.id}
            initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.2 }}
            className="h-full"
          >
            <ChatView scenario={active} onBack={() => setActive(null)} />
          </motion.div>
        ) : (
          <motion.div key="picker"
            initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 30 }} transition={{ duration: 0.2 }}
            className="h-full flex flex-col"
          >
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border shrink-0">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span className="text-[11px] uppercase tracking-widest text-muted-foreground">your shopper</span>
              <span className="ml-auto text-[10px] text-primary/70 uppercase tracking-wider">online</span>
            </div>
            <div className="px-4 pt-5 pb-3 shrink-0">
              <div className="bg-secondary border border-border px-3.5 py-2.5 text-[13px] leading-relaxed text-foreground inline-block">
                Hey! What are we shopping for? 👇
              </div>
            </div>
            <div className="px-4 pb-5 space-y-2 overflow-y-auto flex-1">
              {SCENARIOS.map((s, i) => (
                <motion.button key={s.id}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: 0.15 + i * 0.07 }}
                  onClick={() => setActive(s)}
                  className="w-full text-left border border-border hover:border-primary/60 hover:bg-primary/5 transition px-3.5 py-3 group"
                >
                  <div className="text-[10px] uppercase tracking-wider text-primary mb-1">{s.label}</div>
                  <div className="text-[13px] text-muted-foreground group-hover:text-foreground transition leading-snug">
                    "{s.preview}"
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
