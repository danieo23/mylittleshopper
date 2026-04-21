import React, { useState } from 'react';
import { ArrowRight, Check, Upload, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/client';

// ─── Data ─────────────────────────────────────────────────────────

const BUDGET_OPTIONS = [
  { key: 'low',  label: 'Budget',   desc: 'Depop, ThredUp, Shein, Burlington, H&M' },
  { key: 'mid',  label: 'Mid-range', desc: 'Zara, ASOS, Pacsun, Urban Outfitters, Mango' },
  { key: 'high', label: 'Premium',  desc: 'Revolve, Nordstrom, Net-a-Porter, Saks' },
];

const STORES = {
  'Thrift & Budget': ['Depop', 'ThredUp', 'Poshmark', 'Shein', 'H&M', 'Primark', 'Burlington', 'Target Style', 'Boohoo', 'Walmart Fashion'],
  'Mid-Range':       ['Zara', 'ASOS', 'Pacsun', 'Urban Outfitters', 'Mango', 'Uniqlo', 'Gap', 'Banana Republic', 'J.Crew', 'Anthropologie', 'Free People', 'Everlane', 'Abercrombie', 'American Eagle'],
  'Premium':         ['Revolve', 'Nordstrom', 'Bloomingdale\'s', 'Net-a-Porter', 'Farfetch', 'Ssense', 'Saks Fifth Avenue'],
  'Specialty':       ['Nike', 'Adidas', 'New Balance', 'Levi\'s', 'Carhartt', 'Reformation', 'Supreme', 'Palace'],
};

const STYLE_TAGS = [
  'Minimal', 'Streetwear', 'Old Money', 'Y2K', 'Preppy', 'Coastal', 'Techwear',
  'Vintage', 'Business Casual', 'Athleisure', 'Bohemian', 'Grunge', 'Dark Academia',
  'Cottagecore', 'Hypebeast', 'Smart Casual', 'Avant-garde', 'Normcore', 'Rockstar',
  'Festival', 'Resort / Vacation', 'Date Night', 'Workwear', 'Quiet Luxury',
];

const COLOR_PALETTES = [
  { key: 'neutrals',   label: 'Neutrals',     swatches: ['#F5F0E8', '#D4C9B0', '#8B7355', '#3D2B1F'] },
  { key: 'monochrome', label: 'Black & White', swatches: ['#FFFFFF', '#CCCCCC', '#666666', '#111111'] },
  { key: 'earth',      label: 'Earth Tones',   swatches: ['#C19A6B', '#8B6914', '#5C4033', '#2D4A3E'] },
  { key: 'pastels',    label: 'Pastels',        swatches: ['#FFD1DC', '#AEC6CF', '#B5EAD7', '#FFDAC1'] },
  { key: 'bold',       label: 'Bold & Bright',  swatches: ['#FF3B30', '#FF9500', '#34C759', '#007AFF'] },
  { key: 'navy',       label: 'Navy & Blues',   swatches: ['#001F54', '#1B3A6B', '#4A90D9', '#A8C8E8'] },
];

const PHOTO_CATEGORIES = [
  {
    key: 'wardrobe',
    title: 'Current wardrobe',
    hint: 'Upload photos of clothes you already own — tops, bottoms, shoes, outerwear. The more the better.',
  },
  {
    key: 'outfit',
    title: 'Past outfits you loved',
    hint: "Looks you've worn and felt great in. Mirror selfies, event photos, whatever you have.",
  },
  {
    key: 'inspo',
    title: 'Style inspo',
    hint: "Aspirational looks — screenshots, Pinterest saves, celebrities, anything you're drawn to.",
  },
];

// ─── Step labels ──────────────────────────────────────────────────
const STEPS = ['Budget', 'Stores', 'Vibe', 'Colors', 'Photos', 'Details', 'Done'];

// ─── Helpers ──────────────────────────────────────────────────────
function TagGrid({ options, selected, onToggle, cols = 'flex flex-wrap' }) {
  return (
    <div className={`${cols} gap-2`}>
      {options.map(opt => {
        const active = selected.includes(opt);
        return (
          <button
            key={opt}
            onClick={() => onToggle(opt)}
            className={`px-3.5 py-2 border text-[11px] uppercase tracking-wider transition ${
              active ? 'border-primary text-primary' : 'border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground'
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────
export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [uploads, setUploads] = useState({ wardrobe: [], outfit: [], inspo: [] });
  const [uploading, setUploading] = useState({});

  const [data, setData] = useState({
    budget_tier: '',
    favorite_stores: [],
    style_tags: [],
    color_palettes: [],
    pinterest_board_url: '',
    sizes: { tops: '', bottoms: '', shoes: '' },
  });

  const toggle = (field, val) =>
    setData(p => ({ ...p, [field]: p[field].includes(val) ? p[field].filter(x => x !== val) : [...p[field], val] }));

  const next = () => setStep(s => s + 1);

  const handlePhotoUpload = async (category, files) => {
    if (!files.length) return;
    setUploading(u => ({ ...u, [category]: true }));
    try {
      const me = await base44.auth.me();
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        await base44.entities.WardrobeItem.create({
          user_id: me.id,
          image_url: file_url,
          category,
        });
        setUploads(u => ({ ...u, [category]: [...u[category], file_url] }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setUploading(u => ({ ...u, [category]: false }));
    }
  };

  const removePhoto = (category, url) =>
    setUploads(u => ({ ...u, [category]: u[category].filter(x => x !== url) }));

  const finish = async () => {
    setSaving(true);
    setSaveError('');
    try {
      const me = await base44.auth.me();
      await base44.entities.StyleProfile.create({
        user_id: me.id,
        budget_tier: data.budget_tier,
        favorite_stores: data.favorite_stores,
        style_tags: data.style_tags,
        color_palettes: data.color_palettes,
        pinterest_board_url: data.pinterest_board_url || null,
        sizes: data.sizes,
      });
      navigate('/dashboard');
    } catch (e) {
      console.error(e);
      setSaveError(e.message || 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center px-6 py-12">
      {/* Logo */}
      <button onClick={() => navigate('/')} className="flex items-center gap-2 mb-10">
        <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
          <span className="text-primary-foreground font-serif text-sm font-bold">m</span>
        </div>
        <span className="font-serif text-base tracking-tight">mylilshopper</span>
      </button>

      {/* Progress bar */}
      <div className="w-full max-w-xl mb-10">
        <div className="flex justify-between mb-2">
          {STEPS.map((s, i) => (
            <span key={s} className={`text-[10px] uppercase tracking-wider ${i === step ? 'text-primary' : i < step ? 'text-foreground' : 'text-muted-foreground/40'}`}>
              {i < step ? '✓' : s}
            </span>
          ))}
        </div>
        <div className="h-px bg-border w-full">
          <div
            className="h-px bg-primary transition-all duration-500"
            style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }}
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.28 }}
          className="w-full max-w-xl"
        >

          {/* ── Step 0: Budget ── */}
          {step === 0 && (
            <div>
              <h2 className="font-serif text-3xl tracking-tight mb-1">What's your budget range?</h2>
              <p className="text-sm text-muted-foreground mb-8">Your shopper will prioritize stores in this range.</p>
              <div className="space-y-3">
                {BUDGET_OPTIONS.map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => { setData(p => ({ ...p, budget_tier: opt.key })); next(); }}
                    className="w-full flex items-center justify-between px-5 py-4 border border-border hover:border-foreground/40 transition text-left group"
                  >
                    <div>
                      <div className="text-sm font-medium text-foreground">{opt.label}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{opt.desc}</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 1: Stores ── */}
          {step === 1 && (
            <div>
              <h2 className="font-serif text-3xl tracking-tight mb-1">Favorite stores?</h2>
              <p className="text-sm text-muted-foreground mb-8">Pick every store you shop at or would like to. Your shopper checks these first.</p>
              <div className="space-y-6 mb-8">
                {Object.entries(STORES).map(([category, stores]) => (
                  <div key={category}>
                    <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">{category}</div>
                    <TagGrid options={stores} selected={data.favorite_stores} onToggle={v => toggle('favorite_stores', v)} />
                  </div>
                ))}
              </div>
              <button onClick={next} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 text-sm hover:opacity-90 transition">
                Continue <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* ── Step 2: Style vibe ── */}
          {step === 2 && (
            <div>
              <h2 className="font-serif text-3xl tracking-tight mb-1">What's your vibe?</h2>
              <p className="text-sm text-muted-foreground mb-8">Pick everything that feels like you. The more you select the better your shopper knows you.</p>
              <TagGrid options={STYLE_TAGS} selected={data.style_tags} onToggle={v => toggle('style_tags', v)} />
              <button onClick={next} className="mt-8 inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 text-sm hover:opacity-90 transition">
                Continue <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* ── Step 3: Colors ── */}
          {step === 3 && (
            <div>
              <h2 className="font-serif text-3xl tracking-tight mb-1">Color preferences?</h2>
              <p className="text-sm text-muted-foreground mb-8">Which palettes show up most in your wardrobe?</p>
              <div className="grid grid-cols-2 gap-3 mb-8">
                {COLOR_PALETTES.map(p => {
                  const active = data.color_palettes.includes(p.key);
                  return (
                    <button
                      key={p.key}
                      onClick={() => toggle('color_palettes', p.key)}
                      className={`flex items-center gap-3 px-4 py-3 border transition text-left ${active ? 'border-primary' : 'border-border hover:border-foreground/30'}`}
                    >
                      <div className="flex gap-0.5">
                        {p.swatches.map((c, i) => (
                          <div key={i} className="w-4 h-8 rounded-sm" style={{ background: c }} />
                        ))}
                      </div>
                      <span className={`text-xs uppercase tracking-wider ${active ? 'text-primary' : 'text-muted-foreground'}`}>{p.label}</span>
                    </button>
                  );
                })}
              </div>
              <button onClick={next} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 text-sm hover:opacity-90 transition">
                Continue <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* ── Step 4: Photo uploads ── */}
          {step === 4 && (
            <div>
              <h2 className="font-serif text-3xl tracking-tight mb-1">Show your shopper your style.</h2>
              <p className="text-sm text-muted-foreground mb-2">
                This is the most powerful step. Upload as many photos as you can — the more your shopper sees, the better it knows your taste.
              </p>
              <p className="text-xs text-primary mb-8 uppercase tracking-wider">More photos = smarter picks</p>
              <div className="space-y-8 mb-8">
                {PHOTO_CATEGORIES.map(cat => (
                  <div key={cat.key}>
                    <div className="mb-1">
                      <h3 className="text-sm font-medium text-foreground">{cat.title}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{cat.hint}</p>
                    </div>
                    {/* Upload button */}
                    <label className="mt-3 flex items-center gap-3 border border-dashed border-border p-4 cursor-pointer hover:border-foreground/30 transition group">
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        className="hidden"
                        onChange={e => handlePhotoUpload(cat.key, Array.from(e.target.files ?? []))}
                      />
                      {uploading[cat.key]
                        ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                        : <Upload className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition" />
                      }
                      <span className="text-xs text-muted-foreground uppercase tracking-wider">
                        {uploads[cat.key].length > 0
                          ? `${uploads[cat.key].length} uploaded — add more`
                          : 'Upload photos'}
                      </span>
                    </label>
                    {/* Thumbnails */}
                    {uploads[cat.key].length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {uploads[cat.key].map(url => (
                          <div key={url} className="relative w-16 h-16 group/thumb">
                            <img src={url} alt="" className="w-full h-full object-cover" />
                            <button
                              onClick={() => removePhoto(cat.key, url)}
                              className="absolute -top-1 -right-1 w-4 h-4 bg-background border border-border rounded-full flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <button onClick={next} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 text-sm hover:opacity-90 transition">
                  Continue <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button onClick={next} className="text-xs text-muted-foreground hover:text-foreground transition">
                  Skip for now
                </button>
              </div>
            </div>
          )}

          {/* ── Step 5: Optional details ── */}
          {step === 5 && (
            <div>
              <h2 className="font-serif text-3xl tracking-tight mb-1">A few last details.</h2>
              <p className="text-sm text-muted-foreground mb-8">Optional — but the more your shopper knows, the better the fit.</p>

              <div className="space-y-5 mb-8">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Tops / Shirts size</label>
                  <select
                    value={data.sizes.tops}
                    onChange={e => setData(p => ({ ...p, sizes: { ...p.sizes, tops: e.target.value } }))}
                    className="w-full bg-card border border-border px-4 py-3 text-sm text-foreground outline-none focus:border-foreground/40"
                  >
                    <option value="">Select</option>
                    {['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Bottoms / Pants size</label>
                  <input
                    type="text"
                    value={data.sizes.bottoms}
                    onChange={e => setData(p => ({ ...p, sizes: { ...p.sizes, bottoms: e.target.value } }))}
                    placeholder="e.g. 32x30, M, 8"
                    className="w-full bg-card border border-border px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-foreground/40"
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Shoe size</label>
                  <input
                    type="text"
                    value={data.sizes.shoes}
                    onChange={e => setData(p => ({ ...p, sizes: { ...p.sizes, shoes: e.target.value } }))}
                    placeholder="e.g. US 10, EU 44"
                    className="w-full bg-card border border-border px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-foreground/40"
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Pinterest board URL</label>
                  <input
                    type="url"
                    value={data.pinterest_board_url}
                    onChange={e => setData(p => ({ ...p, pinterest_board_url: e.target.value }))}
                    placeholder="https://pinterest.com/yourboard"
                    className="w-full bg-card border border-border px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-foreground/40"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={next} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 text-sm hover:opacity-90 transition">
                  Continue <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button onClick={next} className="text-xs text-muted-foreground hover:text-foreground transition">
                  Skip
                </button>
              </div>
            </div>
          )}

          {/* ── Step 6: Done ── */}
          {step === 6 && (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto mb-6">
                <Check className="w-7 h-7 text-primary" />
              </div>
              <h2 className="font-serif text-4xl tracking-tight mb-3">Your shopper is ready.</h2>
              <p className="text-sm text-muted-foreground mb-2 max-w-sm mx-auto">
                Profile saved. Your shopper knows your budget, stores, style, and colors.
              </p>
              <p className="text-xs text-muted-foreground/60 max-w-sm mx-auto mb-10">
                The more you shop, the smarter it gets. You can always update your Style Vault later.
              </p>
              <button
                onClick={finish}
                disabled={saving}
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-3.5 text-sm hover:opacity-90 transition disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Start shopping'} <ArrowRight className="w-3.5 h-3.5" />
              </button>
              {saveError && (
                <p className="mt-4 text-xs text-destructive max-w-sm mx-auto">{saveError}</p>
              )}
            </div>
          )}

        </motion.div>
      </AnimatePresence>
    </div>
  );
}
