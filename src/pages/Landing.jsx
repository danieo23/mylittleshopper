import React from 'react';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import ChatMockup from '@/components/landing/ChatMockup';
import StoreTicker from '@/components/landing/StoreTicker';
import HowItWorks from '@/components/landing/HowItWorks';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-serif text-sm font-bold">m</span>
          </div>
          <span className="font-serif text-base tracking-tight text-foreground">
            mylilshopper<sup className="text-primary text-[10px]">®</sup>
          </span>
        </div>
        <button
          onClick={() => navigate('/login')}
          className="text-sm text-muted-foreground hover:text-foreground transition tracking-wide"
        >
          Sign in
        </button>
      </div>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 pt-16 pb-28 grid md:grid-cols-2 gap-12 items-start">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border text-[11px] uppercase tracking-[0.15em] text-muted-foreground mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" /> Your AI personal shopper
          </div>
          <h1 className="font-serif text-[clamp(3.5rem,8vw,6rem)] leading-[0.95] tracking-tight text-foreground mb-8">
            Outfits,<br />delivered.
          </h1>
          <p className="text-muted-foreground leading-relaxed mb-10 max-w-sm text-sm">
            mylilshopper learns your style, shops the stores you love, and builds full
            outfits for whatever you're doing next. Just tell it.
          </p>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/login?mode=signup')}
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 text-sm hover:opacity-90 transition font-medium"
            >
              Get started free <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => navigate('/login')}
              className="text-sm text-muted-foreground hover:text-foreground transition"
            >
              Sign in →
            </button>
          </div>
        </motion.div>
        <ChatMockup />
      </section>

      <StoreTicker />
      <HowItWorks />

      {/* CTA band */}
      <section className="bg-card border-t border-border py-28 text-center px-6">
        <h2 className="font-serif text-[clamp(2.5rem,6vw,5rem)] leading-tight text-foreground max-w-4xl mx-auto tracking-tight">
          Your next outfit is one message away.
        </h2>
        <p className="mt-4 text-muted-foreground text-sm">
          Load your wallet, talk to your shopper, stop second-guessing.
        </p>
        <button
          onClick={() => navigate('/login?mode=signup')}
          className="mt-8 inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-4 text-sm hover:opacity-90 transition font-medium"
        >
          Create your profile <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </section>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground tracking-wider">
        © mylilshopper — crafted with care
      </footer>
    </div>
  );
}
