import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, Upload, X, Loader2, Plus, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/client';

// Compress image to JPEG dataUrl for upload (same approach as StyleVault)
async function compressImage(file) {
  return new Promise((resolve, reject) => {
    const img  = new Image();
    const burl = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 900;
      let { naturalWidth: w, naturalHeight: h } = img;
      if (w > MAX || h > MAX) {
        const r = Math.min(MAX / w, MAX / h);
        w = Math.round(w * r); h = Math.round(h * r);
      }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(burl);
      canvas.toBlob(blob => {
        const reader = new FileReader();
        reader.onload  = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      }, 'image/jpeg', 0.82);
    };
    img.onerror = () => { URL.revokeObjectURL(burl); reject(new Error('Could not load image')); };
    img.src = burl;
  });
}

// ─── Data ─────────────────────────────────────────────────────────

const BUDGET_PRESETS = [75, 150, 300, 500, 750, 1000];

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

const GENDER_OPTIONS = [
  { key: 'women',     label: 'Women',                      desc: "Women's clothing & sizing" },
  { key: 'men',       label: 'Men',                        desc: "Men's clothing & sizing" },
  { key: 'nonbinary', label: 'Non-binary / Gender fluid',  desc: 'Mix of both or neither' },
  { key: 'prefer_not', label: 'Prefer not to say',         desc: 'Shop across all sections' },
];

const AGE_RANGE_OPTIONS = [
  { key: 'under_18', label: 'Under 18',  desc: 'Gen Z, trend-forward' },
  { key: '18_24',    label: '18 – 24',   desc: 'Early style era, exploring' },
  { key: '25_34',    label: '25 – 34',   desc: 'Style maturing, quality matters' },
  { key: '35_44',    label: '35 – 44',   desc: 'Classic with a modern edge' },
  { key: '45_54',    label: '45 – 54',   desc: 'Refined, timeless' },
  { key: '55_plus',  label: '55 +',      desc: 'Quality and comfort first' },
];

const STORE_TIERS = [
  {
    key:      'mainstream',
    label:    'Mainstream',
    sub:      'Well-known brands and retailers you trust',
    examples: 'H&M, Zara, Nike, ASOS, Gap, Nordstrom, PacSun, Hollister',
  },
  {
    key:      'mixed',
    label:    'Mainstream + indie',
    sub:      'Established stores plus smaller or emerging brands',
    examples: 'Everything above, boutiques, Revolve, smaller online stores',
  },
  {
    key:      'open',
    label:    'Anywhere',
    sub:      "I'll shop wherever the best find is",
    examples: 'eBay, TikTok Shop, Depop, indie brands, marketplace sellers',
  },
];

// ─── Step labels ──────────────────────────────────────────────────
const STEPS = ['Gender', 'Age', 'Budget', 'Stores', 'Shopping Style', 'Vibe', 'Colors', 'Photos', 'Details', 'Done'];

// ─── Stores dropdown (reused from StyleVault) ─────────────────────
const ALL_STORES = [
  'Zara', 'H&M', 'ASOS', 'Uniqlo', 'Urban Outfitters', 'Mango', 'COS', '& Other Stories',
  'Pull&Bear', 'Massimo Dutti', 'Nordstrom', "Macy's", "Bloomingdale's", 'Saks Fifth Avenue',
  'Revolve', 'SSENSE', 'Farfetch', 'Net-a-Porter', 'Nike', 'Adidas', 'New Balance',
  'Lululemon', 'Vuori', 'Everlane', 'Reformation', 'Banana Republic', 'J.Crew', 'Gap',
  'Club Monaco', 'Theory', 'Rag & Bone', 'Acne Studios', 'A.P.C.', 'Ralph Lauren',
  'Tommy Hilfiger', 'Calvin Klein', 'Carhartt WIP', 'Stüssy', 'Supreme', 'Palace',
  'Noah', 'Kith', 'Free People', 'Anthropologie', 'Depop', 'ThredUp', 'Poshmark',
  'Shein', 'Boohoo', 'Target', 'Pacsun', 'Abercrombie', 'American Eagle', "Levi's",
];

function StoresDropdown({ selected, onChange }) {
  const [open, setOpen]     = useState(false);
  const [search, setSearch] = useState('');
  const ref                 = useRef(null);

  useEffect(() => {
    const h = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const filtered    = ALL_STORES.filter(s => s.toLowerCase().includes(search.toLowerCase()) && !selected.includes(s));
  const canAddCustom = search.trim() && !ALL_STORES.includes(search.trim()) && !selected.includes(search.trim());
  const add  = (s)  => { onChange([...selected, s]); setSearch(''); };
  const remove = (s) => onChange(selected.filter(x => x !== s));

  return (
    <div ref={ref} className="relative">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {selected.map(s => (
            <span key={s} className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-primary text-primary text-[11px] uppercase tracking-wider">
              {s} <button onClick={() => remove(s)}><X className="w-3 h-3" /></button>
            </span>
          ))}
        </div>
      )}
      <button onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-2 px-4 py-2.5 border border-border text-muted-foreground text-sm hover:text-foreground hover:border-foreground/40 transition">
        <Plus className="w-3.5 h-3.5" /> Add stores <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 w-72 bg-card border border-border shadow-lg">
          <div className="p-2 border-b border-border">
            <input autoFocus type="text" value={search} onChange={e => setSearch(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && canAddCustom) add(search.trim()); }}
              placeholder="Search or add a store…"
              className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none" />
          </div>
          <div className="max-h-52 overflow-y-auto py-1">
            {canAddCustom && (
              <button onClick={() => add(search.trim())}
                className="w-full text-left px-3 py-2 text-xs text-primary hover:bg-primary/10 transition flex items-center gap-2">
                <Plus className="w-3 h-3" /> Add "{search.trim()}"
              </button>
            )}
            {filtered.map(s => (
              <button key={s} onClick={() => add(s)}
                className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-secondary transition">{s}</button>
            ))}
            {!filtered.length && !canAddCustom && <p className="px-3 py-2 text-xs text-muted-foreground">No stores found</p>}
          </div>
        </div>
      )}
    </div>
  );
}

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

  const [uploadError, setUploadError] = useState('');
  const [data, setData] = useState({
    gender: '',
    age_range: '',
    budget: 200,
    favorite_stores: [],
    store_openness_tiers: [],
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
    setUploadError('');
    setUploading(u => ({ ...u, [category]: true }));
    try {
      const me = await base44.auth.me();
      for (const file of files) {
        const dataUrl = await compressImage(file);
        const res  = await fetch('/api/upload-wardrobe', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ userId: me.id, category, dataUrl }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Upload failed');
        setUploads(u => ({ ...u, [category]: [...u[category], data.item?.image_url ?? dataUrl] }));
      }
    } catch (e) {
      console.error(e);
      setUploadError(e.message ?? 'Upload failed — please try again.');
    } finally {
      setUploading(u => ({ ...u, [category]: false }));
    }
  };

  const removePhoto = (category, url) =>
    setUploads(u => ({ ...u, [category]: u[category].filter(x => x !== url) }));

  const saveProfile = async () => {
    const me = await base44.auth.me();
    const boardUrl = data.pinterest_board_url.trim();
    await base44.entities.StyleProfile.create({
      user_id:               me.id,
      gender:                data.gender || null,
      age_range:             data.age_range || null,
      budget_tier:           String(data.budget),
      favorite_stores:       data.favorite_stores,
      store_openness_tiers:  data.store_openness_tiers,
      style_tags:            data.style_tags,
      color_palettes:        data.color_palettes,
      pinterest_board_url:   boardUrl || null,
      pinterest_board_urls:  boardUrl ? [boardUrl] : [],
      sizes:                 data.sizes,
    });
  };

  const finish = async () => {
    setSaving(true);
    setSaveError('');
    try {
      await saveProfile();
      navigate('/dashboard');
    } catch (e) {
      console.error(e);
      setSaveError(e.message || 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const goToQuiz = async () => {
    setSaving(true);
    setSaveError('');
    try {
      await saveProfile();
      navigate('/style-quiz');
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

          {/* ── Step 0: Gender ── */}
          {step === 0 && (
            <div>
              <h2 className="font-serif text-3xl tracking-tight mb-1">Who are you shopping for?</h2>
              <p className="text-sm text-muted-foreground mb-8">Helps your shopper search the right sections and find your size.</p>
              <div className="space-y-3">
                {GENDER_OPTIONS.map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => { setData(p => ({ ...p, gender: opt.key })); next(); }}
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

          {/* ── Step 1: Age ── */}
          {step === 1 && (
            <div>
              <h2 className="font-serif text-3xl tracking-tight mb-1">How old are you?</h2>
              <p className="text-sm text-muted-foreground mb-8">Helps personalize recommendations — especially early on before your full style profile is built.</p>
              <div className="space-y-3">
                {AGE_RANGE_OPTIONS.map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => { setData(p => ({ ...p, age_range: opt.key })); next(); }}
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
              <button onClick={next} className="mt-6 text-xs text-muted-foreground hover:text-foreground transition">
                Prefer not to say
              </button>
            </div>
          )}

          {/* ── Step 2: Budget ── */}
          {step === 2 && (
            <div>
              <h2 className="font-serif text-3xl tracking-tight mb-1">What's your budget?</h2>
              <p className="text-sm text-muted-foreground mb-10">How much do you want to spend per outfit? You can always say a specific amount in chat — this is just your default.</p>
              <div className="px-2 mb-10">
                <div className="text-center mb-8">
                  <span className="font-serif text-6xl tracking-tight">${data.budget}</span>
                  <span className="text-muted-foreground text-sm ml-2">per outfit</span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={1000}
                  step={25}
                  value={data.budget}
                  onChange={e => setData(p => ({ ...p, budget: Number(e.target.value) }))}
                  className="w-full accent-primary cursor-pointer"
                />
                <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                  <span>$50</span>
                  <div className="flex gap-3">
                    {BUDGET_PRESETS.map(v => (
                      <button key={v} onClick={() => setData(p => ({ ...p, budget: v }))}
                        className={`text-[10px] uppercase tracking-wider transition ${data.budget === v ? 'text-primary' : 'text-muted-foreground/40 hover:text-muted-foreground'}`}>
                        ${v}
                      </button>
                    ))}
                  </div>
                  <span>$1,000</span>
                </div>
              </div>
              <button onClick={next} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 text-sm hover:opacity-90 transition">
                Continue <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* ── Step 3: Stores ── */}
          {step === 3 && (
            <div>
              <h2 className="font-serif text-3xl tracking-tight mb-1">Favorite stores?</h2>
              <p className="text-sm text-muted-foreground mb-8">Pick every store you shop at or would like to. Your shopper checks these first.</p>
              <div className="mb-8">
                <StoresDropdown
                  selected={data.favorite_stores}
                  onChange={v => setData(p => ({ ...p, favorite_stores: v }))}
                />
              </div>
              <button onClick={next} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 text-sm hover:opacity-90 transition">
                Continue <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* ── Step 4: Shopping Style / Store openness ── */}
          {step === 4 && (
            <div>
              <h2 className="font-serif text-3xl tracking-tight mb-1">Where do you shop?</h2>
              <p className="text-sm text-muted-foreground mb-8">Select all that apply — this shapes where your shopper looks for finds.</p>
              <div className="space-y-3 mb-8">
                {STORE_TIERS.map(tier => {
                  const active = data.store_openness_tiers.includes(tier.key);
                  return (
                    <button
                      key={tier.key}
                      onClick={() => toggle('store_openness_tiers', tier.key)}
                      className={`w-full flex items-start justify-between px-5 py-4 border transition text-left group ${
                        active ? 'border-primary' : 'border-border hover:border-foreground/40'
                      }`}
                    >
                      <div className="flex-1 pr-4">
                        <div className={`text-sm font-medium transition ${active ? 'text-primary' : 'text-foreground'}`}>{tier.label}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{tier.sub}</div>
                        <div className="text-[10px] text-muted-foreground/50 mt-1 uppercase tracking-wider">{tier.examples}</div>
                      </div>
                      <div className={`w-4 h-4 border flex-shrink-0 mt-0.5 flex items-center justify-center transition ${
                        active ? 'border-primary bg-primary' : 'border-border group-hover:border-foreground/40'
                      }`}>
                        {active && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={next}
                  disabled={data.store_openness_tiers.length === 0}
                  className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 text-sm hover:opacity-90 transition disabled:opacity-40"
                >
                  Continue <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button onClick={next} className="text-xs text-muted-foreground hover:text-foreground transition">
                  Skip
                </button>
              </div>
            </div>
          )}

          {/* ── Step 5: Style vibe ── */}
          {step === 5 && (
            <div>
              <h2 className="font-serif text-3xl tracking-tight mb-1">What's your vibe?</h2>
              <p className="text-sm text-muted-foreground mb-8">Pick everything that feels like you. The more you select the better your shopper knows you.</p>
              <TagGrid options={STYLE_TAGS} selected={data.style_tags} onToggle={v => toggle('style_tags', v)} />
              <button onClick={next} className="mt-8 inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 text-sm hover:opacity-90 transition">
                Continue <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* ── Step 6: Colors ── */}
          {step === 6 && (
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

          {/* ── Step 7: Photo uploads ── */}
          {step === 7 && (
            <div>
              <h2 className="font-serif text-3xl tracking-tight mb-1">Show your shopper your style.</h2>
              <p className="text-sm text-muted-foreground mb-2">
                This is the most powerful step. Upload as many photos as you can — the more your shopper sees, the better it knows your taste.
              </p>
              <p className="text-xs text-primary mb-8 uppercase tracking-wider">More photos = smarter picks</p>
              {uploadError && (
                <p className="mb-4 text-xs text-destructive">{uploadError}</p>
              )}
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

          {/* ── Step 8: Optional details ── */}
          {step === 8 && (
            <div>
              <h2 className="font-serif text-3xl tracking-tight mb-1">A few last details.</h2>
              <p className="text-sm text-muted-foreground mb-8">Optional — but the more your shopper knows, the better the fit.</p>

              <div className="space-y-5 mb-8">
                {[
                  { key: 'tops',      label: 'Tops / Shirts',    options: ['XXS', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'] },
                  { key: 'bottoms',   label: 'Bottoms / Pants',  options: ['24', '25', '26', '27', '28', '29', '30', '31', '32', '33', '34', '36', '38', '40', 'XS', 'S', 'M', 'L', 'XL', '2XL'] },
                  { key: 'shoes',     label: 'Shoes (US)',        options: ['5', '5.5', '6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '11.5', '12', '12.5', '13', '14', '15'] },
                  { key: 'outerwear', label: 'Outerwear / Coats', options: ['XXS', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'] },
                ].map(({ key, label, options }) => (
                  <div key={key}>
                    <label className="block text-[11px] uppercase tracking-wider text-muted-foreground mb-2">{label}</label>
                    <select
                      value={data.sizes[key] ?? ''}
                      onChange={e => setData(p => ({ ...p, sizes: { ...p.sizes, [key]: e.target.value } }))}
                      className="w-full bg-card border border-border px-4 py-3 text-sm text-foreground outline-none focus:border-foreground/40 cursor-pointer"
                    >
                      <option value="">Select size</option>
                      {options.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                ))}
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

          {/* ── Step 9: Done / Quiz entry ── */}
          {step === 9 && (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto mb-6">
                <Check className="w-7 h-7 text-primary" />
              </div>
              <h2 className="font-serif text-4xl tracking-tight mb-3">Almost done.</h2>
              <p className="text-sm text-muted-foreground mb-2 max-w-sm mx-auto">
                One last step — a quick style quiz so your shopper knows exactly what you love to wear.
              </p>
              <p className="text-xs text-muted-foreground/60 max-w-sm mx-auto mb-10">
                Takes 2 minutes. The more you tell it, the smarter your picks.
              </p>
              <button
                onClick={goToQuiz}
                disabled={saving}
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-3.5 text-sm hover:opacity-90 transition disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Take the Style Quiz'} <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <div className="mt-4">
                <button
                  onClick={finish}
                  disabled={saving}
                  className="text-xs text-muted-foreground hover:text-foreground transition"
                >
                  Skip and go to dashboard
                </button>
              </div>
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
