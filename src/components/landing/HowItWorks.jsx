import React from 'react';
import { motion } from 'framer-motion';

const STEPS = [
  {
    num: '01',
    title: 'Build your profile.',
    body: 'Upload your current wardrobe, link a Pinterest board, pick your favorite stores, and set your budget. Your shopper gets to know you once — then remembers forever.',
  },
  {
    num: '02',
    title: 'Tell it what you need.',
    body: 'Upcoming trip? Season change? Special event? Just describe it in plain language. The agent searches across your preferred stores and assembles full, coherent outfits.',
  },
  {
    num: '03',
    title: 'Review or let it fly.',
    body: 'Choose how much you trust it. Have it check in so you can approve every cart before checkout, or give it full autonomy and get a confirmation when your order is on its way.',
  },
];

export default function HowItWorks() {
  return (
    <section className="max-w-7xl mx-auto px-6 py-28">
      <div className="mb-14 border-b border-border pb-6">
        <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-3">How it works</div>
        <h2 className="font-serif text-[clamp(2rem,5vw,3.5rem)] tracking-tight text-foreground leading-tight">
          Three steps to a full wardrobe.
        </h2>
      </div>

      <div className="grid md:grid-cols-3 gap-px bg-border border border-border">
        {STEPS.map((step, i) => (
          <motion.div
            key={step.num}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            className="bg-background p-8"
          >
            <div className="font-serif text-5xl text-border mb-6 leading-none">{step.num}</div>
            <h3 className="font-serif text-xl text-foreground mb-3 tracking-tight">{step.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{step.body}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
