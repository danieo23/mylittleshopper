import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/client';
import { QUIZ_CATEGORIES, mapSelectionsToStyleDna } from '@/data/quizData';
import { QUIZ_IMAGE_META } from '@/data/quizImageMeta';

const TOTAL_STEPS = QUIZ_CATEGORIES.length;

function StyleCard({ item, selected, onToggle }) {
  const [imgError, setImgError] = useState(false);
  const objectPosition = QUIZ_IMAGE_META[item.id]?.objectPosition ?? 'center center';

  return (
    <button
      onClick={() => onToggle(item)}
      className={`relative text-left group transition-all duration-150 ${
        selected ? 'ring-2 ring-primary ring-offset-1 ring-offset-background' : ''
      }`}
    >
      <div className="aspect-[3/4] bg-secondary overflow-hidden relative">
        {!imgError ? (
          <img
            src={item.image}
            alt={item.label}
            onError={() => setImgError(true)}
            style={{ objectPosition }}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-secondary">
            <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wider text-center px-2">{item.label}</span>
          </div>
        )}

        {selected && (
          <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
            <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
              <Check className="w-4 h-4 text-primary-foreground" />
            </div>
          </div>
        )}
      </div>

      <div className="pt-2 pb-1">
        <div className={`text-[11px] font-medium uppercase tracking-wider leading-tight ${selected ? 'text-primary' : 'text-foreground'}`}>
          {item.label}
        </div>
        <div className="text-[10px] text-muted-foreground/60 mt-0.5">{item.desc}</div>
      </div>
    </button>
  );
}

export default function StyleQuiz() {
  const navigate = useNavigate();
  const [step,       setStep]       = useState(0);
  const [selections, setSelections] = useState({});
  const [saving,     setSaving]     = useState(false);
  const [direction,  setDirection]  = useState(1);

  const isLastStep     = step === TOTAL_STEPS - 1;
  const category       = QUIZ_CATEGORIES[step];
  const catSelections  = selections[category.id] ?? [];
  const selectedIds    = new Set(catSelections.map(i => i.id));

  const toggleItem = (item) => {
    setSelections(prev => {
      const current = prev[category.id] ?? [];
      const exists  = current.some(i => i.id === item.id);
      return {
        ...prev,
        [category.id]: exists ? current.filter(i => i.id !== item.id) : [...current, item],
      };
    });
  };

  const goNext = () => { setDirection(1); setStep(s => s + 1); };
  const goBack = () => { setDirection(-1); setStep(s => s - 1); };

  const finish = async () => {
    setSaving(true);
    try {
      const me       = await base44.auth.me();
      const profiles = await base44.entities.StyleProfile.filter({ user_id: me.id }, '-created_at', 1);
      const { style_tags, dominant_fit } = mapSelectionsToStyleDna(selections);

      const profileData = {
        style_tags:      style_tags,
        dominant_fit:    dominant_fit,
        quiz_completed:  true,
        quiz_selections: selections,
      };

      if (profiles.length > 0) {
        await base44.entities.StyleProfile.update(profiles[0].id, profileData);
      } else {
        await base44.entities.StyleProfile.create({ user_id: me.id, ...profileData });
      }

      navigate('/dashboard');
    } catch (err) {
      console.error('[quiz] save error:', err);
      navigate('/dashboard');
    }
  };

  const progress = step / (TOTAL_STEPS - 1);

  const variants = {
    enter:  (d) => ({ opacity: 0, x: d > 0 ? 40 : -40 }),
    center: { opacity: 1, x: 0 },
    exit:   (d) => ({ opacity: 0, x: d > 0 ? -40 : 40 }),
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">

      {/* Header */}
      <header className="flex items-center justify-between px-6 py-5 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-serif text-xs font-bold">m</span>
          </div>
          <span className="font-serif text-sm tracking-tight">mylilshopper</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div
                key={i}
                className={`h-1 transition-all duration-300 ${
                  i < step ? 'w-5 bg-primary' : i === step ? 'w-5 bg-primary/60' : 'w-2 bg-border'
                }`}
              />
            ))}
          </div>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
            {step + 1} / {TOTAL_STEPS}
          </span>
        </div>

        <button
          onClick={() => navigate('/dashboard')}
          className="text-[11px] text-muted-foreground hover:text-foreground transition uppercase tracking-wider"
        >
          Skip quiz
        </button>
      </header>

      {/* Body */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="h-full flex flex-col"
          >
            <div className="flex flex-col flex-1 max-w-4xl mx-auto w-full px-6 py-8">
              <div className="mb-6 shrink-0">
                <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1">
                  {step + 1} of {TOTAL_STEPS} — {category.title}
                </div>
                <h2 className="font-serif text-3xl tracking-tight text-foreground">{category.subtitle}</h2>
                {catSelections.length > 0 && (
                  <p className="text-xs text-primary mt-1">{catSelections.length} selected</p>
                )}
              </div>

              <div className="flex-1 overflow-y-auto pb-4" style={{ scrollbarWidth: 'none' }}>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {category.items.map(item => (
                    <StyleCard
                      key={item.id}
                      item={item}
                      selected={selectedIds.has(item.id)}
                      onToggle={toggleItem}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-5 border-t border-border shrink-0">
                {step > 0 ? (
                  <button onClick={goBack} className="text-xs text-muted-foreground hover:text-foreground transition uppercase tracking-wider">
                    ← Back
                  </button>
                ) : <div />}

                <button
                  onClick={isLastStep ? finish : goNext}
                  disabled={isLastStep && saving}
                  className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 text-sm hover:opacity-90 transition disabled:opacity-50"
                >
                  {isLastStep
                    ? (saving ? 'Building your profile…' : 'Finish')
                    : (catSelections.length === 0 ? 'Skip' : 'Continue')}
                  {!(isLastStep && saving) && (isLastStep
                    ? <Check className="w-3.5 h-3.5" />
                    : <ArrowRight className="w-3.5 h-3.5" />)}
                </button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 bg-border shrink-0">
        <motion.div
          className="h-full bg-primary"
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}
