import React, { useEffect, useRef, useState } from 'react';
import { Upload, Loader2, Plus, X, Check, Pencil, Trash2, ArrowRight, ChevronDown, ShoppingBag, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44, supabase } from '@/api/client';
import heic2any from 'heic2any';

// ─── Constants ────────────────────────────────────────────────────

const STYLE_TAGS = [
  'Minimal', 'Streetwear', 'Old Money', 'Y2K', 'Preppy', 'Coastal', 'Techwear',
  'Vintage', 'Business Casual', 'Athleisure', 'Bohemian', 'Grunge', 'Dark Academia',
  'Cottagecore', 'Hypebeast', 'Smart Casual', 'Avant-garde', 'Normcore', 'Rockstar',
  'Festival', 'Resort / Vacation', 'Date Night', 'Workwear', 'Quiet Luxury',
];

const POPULAR_STORES = [
  'Zara', 'H&M', 'ASOS', 'Uniqlo', 'Urban Outfitters', 'Mango', 'COS', '& Other Stories',
  'Pull&Bear', 'Massimo Dutti', 'Nordstrom', "Macy's", 'Bloomingdale\'s', 'Saks Fifth Avenue',
  'Revolve', 'SSENSE', 'Farfetch', 'Net-a-Porter', 'Matches Fashion',
  'Nike', 'Adidas', 'New Balance', 'Lululemon', 'Vuori',
  'Everlane', 'Reformation', 'Frank And Oak', 'Banana Republic', 'J.Crew', 'Gap',
  'Club Monaco', 'Theory', 'Rag & Bone', 'Acne Studios', 'A.P.C.',
  'Ralph Lauren', 'Tommy Hilfiger', 'Calvin Klein', 'Carhartt WIP', 'Stüssy',
  'Supreme', 'Palace', 'Noah', 'Kith', 'Free People', 'Anthropologie',
];

const SIZE_OPTIONS = {
  tops:      ['XXS', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'],
  bottoms:   ['24', '25', '26', '27', '28', '29', '30', '31', '32', '33', '34', '36', '38', '40', 'XS', 'S', 'M', 'L', 'XL', '2XL'],
  shoes:     ['5', '5.5', '6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '11.5', '12', '12.5', '13', '14', '15'],
  outerwear: ['XXS', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'],
};

const PHOTO_TABS = [
  { key: 'wardrobe', label: 'Wardrobe' },
  { key: 'outfit',   label: 'Past Outfits' },
  { key: 'inspo',    label: 'Inspo' },
];

// ─── Google Lens helpers ──────────────────────────────────────────

function inferItemCategory(name) {
  const t = (name ?? '').toLowerCase();
  if (/pant|trouser|jean|denim|chino|short|skirt|culotte|legging|jogger/.test(t)) return 'Bottoms';
  if (/dress|romper|jumpsuit|overall/.test(t))                                     return 'Dresses';
  if (/shoe|sneaker|boot|sandal|loafer|heel|mule|oxford|trainer|slipper/.test(t)) return 'Shoes';
  if (/jacket|coat|blazer|outerwear|parka|bomber|puffer|trench|windbreaker/.test(t)) return 'Outerwear';
  if (/sweater|hoodie|sweatshirt|knitwear|pullover|cardigan/.test(t))              return 'Knitwear';
  if (/shirt|tee|t-shirt|top|blouse|tank|cami|polo|henley|button/.test(t))        return 'Tops';
  if (/bag|purse|backpack|tote|clutch|handbag/.test(t))                            return 'Bags';
  if (/hat|cap|beanie|beret|bucket hat/.test(t))                                   return 'Hats';
  if (/glass|sunglass|goggle|eyewear/.test(t))                                     return 'Eyewear';
  if (/watch|necklace|earring|bracelet|ring|jewelry|belt|scarf|sock/.test(t))      return 'Accessories';
  return 'Similar Items';
}

function groupByItemType(products) {
  const order  = ['Tops', 'Bottoms', 'Dresses', 'Shoes', 'Outerwear', 'Knitwear', 'Bags', 'Hats', 'Eyewear', 'Accessories', 'Similar Items'];
  const groups = {};
  for (const p of products) {
    const cat = inferItemCategory(p.name);
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(p);
  }
  return order.filter(k => groups[k]).map(k => ({ category: k, products: groups[k] }));
}

// ─── Shoppable pin card ───────────────────────────────────────────

function ShoppablePinCard({ pin, onRemove, userId }) {
  const [open,        setOpen]        = useState(false);
  const [fetching,    setFetching]    = useState(false);
  const [lensResults, setLensResults] = useState(pin.shopping_results ?? null);

  const shopping  = lensResults?.shopping ?? [];
  const hasShop   = shopping.length > 0;
  const grouped   = groupByItemType(shopping);

  const fetchLens = async () => {
    setFetching(true);
    try {
      const res  = await fetch('/api/lens', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ imageUrl: pin.image_url, pinId: pin.id, userId }),
      });
      const data = await res.json();
      if (data.shopping_results) setLensResults(data.shopping_results);
    } catch {}
    setFetching(false);
  };

  const handleToggle = () => {
    if (!open && !hasShop && !fetching) fetchLens();
    setOpen(o => !o);
  };

  return (
    <div className="border border-border bg-card overflow-hidden flex flex-col">

      {/* Pin image */}
      <div className="relative aspect-[3/4] bg-muted overflow-hidden group">
        <img src={pin.image_url} alt="" className="w-full h-full object-cover" />
        <button
          onClick={() => onRemove(pin.id)}
          className="absolute top-1.5 right-1.5 z-10 w-6 h-6 flex items-center justify-center bg-black/60 text-white opacity-0 group-hover:opacity-100 transition"
          title="Remove pin"
        >
          <X className="w-3.5 h-3.5" />
        </button>
        {/* Style category overlay */}
        {pin.style_category && (
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent px-2 pt-4 pb-2">
            <span className="text-[9px] uppercase tracking-wider text-white/80">
              {pin.style_category.replace(/_/g, ' ')}
            </span>
          </div>
        )}
      </div>

      {/* Shop toggle bar */}
      <button
        onClick={handleToggle}
        className="flex items-center justify-between px-3 py-2.5 border-t border-border text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition w-full"
      >
        <span className="flex items-center gap-1.5">
          <ShoppingBag className="w-3 h-3" />
          Shop this look
          {hasShop && <span className="text-muted-foreground/40">· {shopping.length}</span>}
        </span>
        {fetching
          ? <Loader2 className="w-3 h-3 animate-spin" />
          : <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        }
      </button>

      {/* Expandable drawer */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden border-t border-border"
          >
            {fetching ? (
              <div className="py-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Finding products…
              </div>

            ) : !hasShop ? (
              <div className="py-5 px-3 text-center space-y-2">
                <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider">No products found</p>
                <button
                  onClick={fetchLens}
                  className="text-xs text-primary hover:underline"
                >
                  Try again
                </button>
              </div>

            ) : (
              <div className="py-3 space-y-4">
                {grouped.map(({ category, products }) => (
                  <div key={category}>
                    <div className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground/60 px-3 mb-2">
                      {category}
                    </div>
                    <div
                      className="flex gap-2 overflow-x-auto px-3 pb-1"
                      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                      {products.slice(0, 8).map((p, i) => (
                        <a
                          key={i}
                          href={p.product_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 w-20 group/item"
                        >
                          <div className="aspect-square bg-secondary overflow-hidden mb-1">
                            {p.image_url
                              ? <img
                                  src={p.image_url}
                                  alt={p.name}
                                  className="w-full h-full object-cover group-hover/item:scale-105 transition-transform duration-300"
                                  onError={e => { e.currentTarget.style.display = 'none'; }}
                                />
                              : <div className="w-full h-full flex items-center justify-center">
                                  <ShoppingBag className="w-4 h-4 text-muted-foreground/20" />
                                </div>
                            }
                          </div>
                          <div className="text-[9px] text-foreground leading-snug line-clamp-2 group-hover/item:text-primary transition">
                            {p.name}
                          </div>
                          <div className="text-[9px] text-muted-foreground/60 mt-0.5 truncate">
                            {p.store}{p.price ? ` · $${p.price}` : ''}
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────

function StoresDropdown({ selected, onChange }) {
  const [open, setOpen]       = useState(false);
  const [search, setSearch]   = useState('');
  const dropdownRef           = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (!dropdownRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = POPULAR_STORES.filter(s =>
    s.toLowerCase().includes(search.toLowerCase()) && !selected.includes(s)
  );
  const canAddCustom = search.trim() && !POPULAR_STORES.includes(search.trim()) && !selected.includes(search.trim());

  const add = (store) => { onChange([...selected, store]); setSearch(''); };
  const remove = (store) => onChange(selected.filter(s => s !== store));

  return (
    <div ref={dropdownRef} className="relative">
      {/* Current chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {selected.map(s => (
            <span key={s} className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-primary text-primary text-[11px] uppercase tracking-wider">
              {s}
              <button onClick={() => remove(s)} className="hover:text-foreground transition"><X className="w-3 h-3" /></button>
            </span>
          ))}
        </div>
      )}

      {/* Trigger */}
      <button
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-2 px-4 py-2 border border-border text-muted-foreground text-xs uppercase tracking-widest hover:text-foreground hover:border-foreground/40 transition"
      >
        <Plus className="w-3.5 h-3.5" /> Add stores <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 w-72 bg-card border border-border shadow-lg">
          <div className="p-2 border-b border-border">
            <input
              autoFocus
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && canAddCustom) { add(search.trim()); } }}
              placeholder="Search or add a store…"
              className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
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
                className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-secondary transition">
                {s}
              </button>
            ))}
            {filtered.length === 0 && !canAddCustom && (
              <p className="px-3 py-2 text-xs text-muted-foreground">No stores found</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StyleTagsSection({ profile, onSave }) {
  const activeTags               = profile.style_tags ?? [];
  const [styleInput, setStyleInput] = useState('');
  const [analyzing, setAnalyzing]   = useState(false);
  const [result, setResult]         = useState('');

  const removeTag = async (tag) => {
    const next = activeTags.filter(t => t !== tag);
    await onSave({ style_tags: next });
  };

  const analyzeStyle = async () => {
    if (!styleInput.trim() || analyzing) return;
    setAnalyzing(true);
    setResult('');
    try {
      const res = await fetch('/api/style-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: styleInput }),
      });
      const data = await res.json();
      const newTags = (data.tags ?? []).filter(t => !activeTags.includes(t));
      if (newTags.length > 0) {
        await onSave({ style_tags: [...activeTags, ...newTags] });
        setResult(`Added: ${newTags.join(', ')}`);
      } else {
        setResult('No new tags found — try describing more specifically.');
      }
      setStyleInput('');
    } catch {
      setResult('Something went wrong. Try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div>
      {/* Active tags */}
      {activeTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {activeTags.map(t => (
            <span key={t} className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-primary text-primary text-[11px] uppercase tracking-wider">
              {t}
              <button onClick={() => removeTag(t)} className="hover:text-foreground transition"><X className="w-3 h-3" /></button>
            </span>
          ))}
        </div>
      )}

      {/* AI chat box */}
      <div className="border border-border bg-card p-4">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-3">
          Describe your style — the AI will extract your tags
        </p>
        <div className="flex items-end gap-2">
          <textarea
            value={styleInput}
            onChange={e => setStyleInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); analyzeStyle(); } }}
            placeholder="e.g. I love clean, minimal looks with earth tones. I tend to wear oversized silhouettes and avoid anything too flashy…"
            rows={3}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground resize-none outline-none leading-relaxed"
          />
          <button
            onClick={analyzeStyle}
            disabled={analyzing || !styleInput.trim()}
            className="shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center hover:opacity-80 transition disabled:opacity-30"
          >
            {analyzing ? <Loader2 className="w-4 h-4 text-primary-foreground animate-spin" /> : <ArrowRight className="w-4 h-4 text-primary-foreground" />}
          </button>
        </div>
        {result && (
          <p className={`mt-2 text-xs ${result.startsWith('Added') ? 'text-primary' : 'text-muted-foreground'}`}>{result}</p>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────

export default function StyleVault() {
  const [profile, setProfile]     = useState(null);
  const [userId, setUserId]       = useState(null);
  const [items, setItems]             = useState([]);
  const [aspirationItems, setAspirationItems] = useState([]);
  const [previews, setPreviews]       = useState([]);
  const [uploadError, setUploadError] = useState('');
  const [uploading, setUploading]     = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeMsg, setAnalyzeMsg] = useState('');
  const [loading, setLoading]     = useState(true);
  const [activeTab, setActiveTab] = useState('wardrobe');
  const [dragOver, setDragOver]   = useState(false);
  const [analyzingWardrobe, setAnalyzingWardrobe] = useState(false);
  const [wardrobeAnalyzeMsg, setWardrobeAnalyzeMsg] = useState('');

  // Pinterest boards (multiple)
  const [addingBoard, setAddingBoard]   = useState(false);
  const [boardInput, setBoardInput]     = useState('');
  const [boardError, setBoardError]     = useState('');
  const [analyzingBoard, setAnalyzingBoard] = useState(null); // which board URL is currently analyzing

  // Sizes
  const [editingSizes, setEditingSizes] = useState(false);
  const [sizesInput, setSizesInput]     = useState({});

  const load = async () => {
    try {
      const me = await base44.auth.me();
      setUserId(me.id);
      const profiles = await base44.entities.StyleProfile.filter({ user_id: me.id }, '-created_at', 1);
      setProfile(profiles[0] ?? null);
      const wardrobe = await base44.entities.WardrobeItem.filter({ user_id: me.id }, '-uploaded_at');
      setItems(wardrobe);
      const { data: aspiration } = await supabase
        .from('aspiration_items')
        .select('*')
        .eq('user_id', me.id)
        .order('analyzed_at', { ascending: false });
      setAspirationItems(aspiration ?? []);
    } catch {
      // not authenticated
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const saveProfile = async (updates) => {
    const updated = await base44.entities.StyleProfile.update(profile.id, updates);
    setProfile(p => ({ ...p, ...updates, ...updated }));
  };

  // Stores
  const handleStoresChange = async (newStores) => {
    setProfile(p => ({ ...p, favorite_stores: newStores }));
    await base44.entities.StyleProfile.update(profile.id, { favorite_stores: newStores });
  };

  // Pinterest — multi-board management
  const boards = profile?.pinterest_board_urls ?? (profile?.pinterest_board_url ? [profile.pinterest_board_url] : []);

  const addBoard = async () => {
    const url = boardInput.trim();
    if (!url) return;
    setBoardError('');
    try {
      const next = [...new Set([...boards, url])];
      await saveProfile({ pinterest_board_urls: next });
      setBoardInput('');
      setAddingBoard(false);
      if (analyzingBoard) {
        setAnalyzeMsg('Board saved — click Re-analyze once the current analysis finishes.');
      } else {
        analyzeBoard(url);
      }
    } catch (err) {
      setBoardError(`Could not save board: ${err.message}`);
    }
  };

  const removeBoard = async (url) => {
    const next = boards.filter(b => b !== url);
    await saveProfile({ pinterest_board_urls: next });
    // Remove pins that came from this board
    const me = await base44.auth.me();
    await supabase.from('aspiration_items').delete()
      .eq('user_id', me.id).eq('source_type', 'pinterest').eq('source_url', url);
    const { data: fresh } = await supabase.from('aspiration_items').select('*')
      .eq('user_id', me.id).order('analyzed_at', { ascending: false });
    setAspirationItems(fresh ?? []);
    setAnalyzeMsg('');
  };

  const removePin = async (pinId) => {
    setAspirationItems(prev => prev.filter(p => p.id !== pinId));
    const res = await fetch('/api/analyze', {
      method:  'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ pinId }),
    });
    if (!res.ok) load(); // revert optimistic update if delete failed
  };

  const triggerWardrobeAnalysis = async (uid) => {
    if (analyzingWardrobe) return;
    setAnalyzingWardrobe(true);
    setWardrobeAnalyzeMsg('Analyzing your photos — up to 60 seconds…');
    try {
      const res  = await fetch('/api/analyze', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ userId: uid, type: 'wardrobe' }),
      });
      const data = await res.json();
      if (!data.success) {
        setWardrobeAnalyzeMsg(data.error ?? 'Analysis failed — try again.');
      } else if (data.alreadyDone) {
        setWardrobeAnalyzeMsg('All photos already analyzed — your Style DNA is up to date.');
      } else {
        setWardrobeAnalyzeMsg(`Done — ${data.analyzed} photo${data.analyzed !== 1 ? 's' : ''} analyzed.`);
      }
    } catch (err) {
      setWardrobeAnalyzeMsg(`Something went wrong: ${err.message}`);
    } finally {
      setAnalyzingWardrobe(false);
    }
  };

  // Analyzes one board — only replaces pins from that specific board URL
  const analyzeBoard = async (boardUrl) => {
    if (!boardUrl || analyzingBoard) return;
    setAnalyzingBoard(boardUrl);
    setAnalyzeMsg('Scraping board and running reverse image search — up to 60 seconds…');
    try {
      const res  = await fetch('/api/analyze', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ userId, type: 'pinterest', boardUrl }),
      });
      const data = await res.json();
      if (!data.success) {
        setAnalyzeMsg(data.userMessage ?? 'Analysis failed — try uploading screenshots instead.');
      } else {
        setAnalyzeMsg(`Done — ${data.analyzed} pins analyzed (${data.confidence} confidence).`);
        const me = await base44.auth.me();
        const { data: fresh } = await supabase.from('aspiration_items').select('*')
          .eq('user_id', me.id).order('analyzed_at', { ascending: false });
        setAspirationItems(fresh ?? []);
      }
    } catch (err) {
      setAnalyzeMsg(`Something went wrong: ${err.message}`);
    } finally {
      setAnalyzingBoard(null);
    }
  };

  // Sizes
  const startEditSizes = () => { setSizesInput(profile.sizes ?? {}); setEditingSizes(true); };
  const saveSizes = async () => { await saveProfile({ sizes: sizesInput }); setEditingSizes(false); };

  // Convert + compress any image to a JPEG data URL.
  // Handles HEIC/HEIF via heic2any before Canvas — works on Chrome where HEIC is unsupported.
  const compressImage = async (file) => {
    let source = file;

    // Convert HEIC/HEIF → JPEG blob first
    const isHeic = /\.(heic|heif)$/i.test(file.name) || file.type === 'image/heic' || file.type === 'image/heif';
    if (isHeic) {
      const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.85 });
      source = Array.isArray(converted) ? converted[0] : converted;
    }

    return new Promise((resolve, reject) => {
      const img  = new Image();
      const burl = URL.createObjectURL(source);
      img.onload = () => {
        const MAX = 900;
        let { naturalWidth: w, naturalHeight: h } = img;
        if (w > MAX || h > MAX) {
          const r = Math.min(MAX / w, MAX / h);
          w = Math.round(w * r);
          h = Math.round(h * r);
        }
        const canvas = document.createElement('canvas');
        canvas.width  = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(burl);
        canvas.toBlob(blob => {
          const reader = new FileReader();
          reader.onload  = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        }, 'image/jpeg', 0.82);
      };
      img.onerror = () => {
        URL.revokeObjectURL(burl);
        // Last-resort fallback: read raw file and send as-is
        const reader = new FileReader();
        reader.onload  = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      };
      img.src = burl;
    });
  };

  // Photo upload — compresses client-side, stores data URL directly in DB (no storage bucket)
  const uploadFiles = async (files) => {
    if (!files.length) return;
    setUploadError('');
    setUploading(true);

    // Show optimistic previews immediately using local blob URLs
    const localPreviews = files.map(f => ({
      id:        `preview-${Math.random()}`,
      image_url: URL.createObjectURL(f),
      category:  activeTab,
      _preview:  true,
    }));
    setPreviews(localPreviews);

    try {
      const me = await base44.auth.me();
      for (const file of files) {
        const dataUrl = await compressImage(file);
        const res = await fetch('/api/upload-wardrobe', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ userId: me.id, category: activeTab, dataUrl }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Upload failed');
        setItems(prev => [data.item, ...prev]);
      }
      triggerWardrobeAnalysis(me.id);
    } catch (err) {
      setUploadError(`Upload failed: ${err.message}`);
    } finally {
      setPreviews([]);
      setUploading(false);
      localPreviews.forEach(p => URL.revokeObjectURL(p.image_url));
    }
  };

  const handleUpload = (e) => uploadFiles(Array.from(e.target.files ?? []));

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    // Accept image/* MIME types plus HEIC/HEIF which some browsers report as empty string
    const files = Array.from(e.dataTransfer.files).filter(f =>
      f.type.startsWith('image/') || /\.(heic|heif|jpg|jpeg|png|gif|webp|avif|bmp|tiff)$/i.test(f.name)
    );
    uploadFiles(files);
  };

  const handleRemove = async (item) => {
    setItems(prev => prev.filter(it => it.id !== item.id));
    await fetch('/api/upload-wardrobe', {
      method:  'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ itemId: item.id }),
    }).catch(() => {});
  };

  if (loading) return <div className="p-12 text-center text-muted-foreground text-sm">Loading…</div>;

  if (!profile) return (
    <div className="p-12 text-center">
      <p className="text-sm text-muted-foreground">No style profile found.</p>
      <a href="/onboarding" className="mt-2 inline-block text-xs text-primary underline underline-offset-2">Complete your profile →</a>
    </div>
  );

  // Merge persisted items with optimistic previews for the active tab
  const allDisplayItems = [
    ...items.filter(it => it.category === activeTab),
    ...previews.filter(p => p.category === activeTab),
  ];

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <div className="mb-10 border-b border-border pb-8">
        <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-3">Style vault</div>
        <h1 className="font-serif text-5xl tracking-tight text-foreground">Your taste, on file.</h1>
      </div>

      {/* Style tags */}
      <Section title="Style tags" subtitle="Your tags power every recommendation.">
        <StyleTagsSection profile={profile} onSave={saveProfile} />
      </Section>

      {/* Photo wardrobe */}
      <Section
        title="My photos"
        subtitle="The more you upload, the better your shopper knows your look."
        action={
          <div className="flex items-center gap-2">
            {items.length > 0 && (
              <button
                onClick={() => triggerWardrobeAnalysis(userId)}
                disabled={analyzingWardrobe}
                className="inline-flex items-center gap-2 px-4 py-2 border border-border text-muted-foreground text-xs uppercase tracking-widest hover:text-foreground hover:border-foreground/40 transition disabled:opacity-40"
              >
                {analyzingWardrobe ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
                {analyzingWardrobe ? 'Analyzing…' : 'Analyze photos'}
              </button>
            )}
            <label className="inline-flex items-center gap-2 px-4 py-2 border border-foreground text-foreground text-xs uppercase tracking-widest cursor-pointer hover:bg-foreground hover:text-background transition">
              <input type="file" multiple accept="image/*,.heic,.heif" className="hidden" onChange={handleUpload} />
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Add photos
            </label>
          </div>
        }
      >
        <div className="flex gap-0 border-b border-border mb-5">
          {PHOTO_TABS.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-xs uppercase tracking-wider border-b-2 transition -mb-px ${
                activeTab === tab.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
              <span className="ml-1.5 text-[10px] opacity-60">({items.filter(i => i.category === tab.key).length})</span>
            </button>
          ))}
        </div>

        {uploadError && (
          <p className="mb-3 text-xs text-destructive">{uploadError}</p>
        )}

        {allDisplayItems.length === 0 ? (
          <label
            className={`block border border-dashed p-10 text-center cursor-pointer transition ${
              dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-foreground/30'
            }`}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <input type="file" multiple accept="image/*,.heic,.heif" className="hidden" onChange={handleUpload} />
            {uploading
              ? <Loader2 className="w-5 h-5 mx-auto text-muted-foreground mb-3 animate-spin" />
              : <Upload className="w-5 h-5 mx-auto text-muted-foreground mb-3" />
            }
            <div className="text-xs text-muted-foreground uppercase tracking-wider">
              {dragOver ? 'Drop to upload' : 'Upload or drop photos here'}
            </div>
            <div className="text-xs text-muted-foreground/50 mt-1">
              {activeTab === 'wardrobe' && 'Clothes you own'}
              {activeTab === 'outfit'   && "Looks you've worn and loved"}
              {activeTab === 'inspo'    && 'Aspirational style, screenshots, saves'}
            </div>
          </label>
        ) : (
          <div
            className={`flex flex-wrap gap-px border transition ${
              dragOver ? 'border-primary bg-primary/5' : 'border-transparent'
            }`}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            {allDisplayItems.map(it => (
              <div key={it.id} className="w-28 h-28 overflow-hidden bg-muted relative group shrink-0">
                <img src={it.image_url} alt="" className="w-full h-full object-cover" />
                {it._preview ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  </div>
                ) : (
                  <button
                    onClick={() => handleRemove(it)}
                    className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition"
                    title="Remove"
                  >
                    <Trash2 className="w-5 h-5 text-white" />
                  </button>
                )}
              </div>
            ))}
            {uploading && (
              <div className="w-28 h-28 bg-muted flex items-center justify-center shrink-0">
                <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
              </div>
            )}
          </div>
        )}

        {wardrobeAnalyzeMsg && (
          <p className={`mt-3 text-xs ${wardrobeAnalyzeMsg.startsWith('Done') ? 'text-primary' : 'text-muted-foreground'}`}>
            {wardrobeAnalyzeMsg}
          </p>
        )}
      </Section>

      {/* Pinterest boards */}
      <Section title="Pinterest boards" subtitle="Add multiple boards — each is analyzed separately and combined in your Style DNA.">
        <div className="space-y-2 mb-4">
          {boards.map(url => (
            <div key={url} className="flex items-center gap-3">
              <span className="text-sm text-foreground truncate flex-1 max-w-md px-4 py-2.5 border border-border bg-card">
                {url}
              </span>
              <button
                onClick={() => analyzeBoard(url)}
                disabled={!!analyzingBoard}
                className="inline-flex items-center gap-1.5 px-3 py-2 border border-border text-muted-foreground text-xs uppercase tracking-widest hover:text-foreground hover:border-foreground/40 transition disabled:opacity-40"
              >
                {analyzingBoard === url ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArrowRight className="w-3 h-3" />}
                {analyzingBoard === url ? 'Analyzing…' : 'Re-analyze'}
              </button>
              <button onClick={() => removeBoard(url)}
                className="p-2 text-muted-foreground hover:text-destructive transition" title="Remove board">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        {addingBoard ? (
          <div className="flex items-center gap-2 max-w-lg">
            <input
              autoFocus
              type="url"
              value={boardInput}
              onChange={e => setBoardInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addBoard(); }}
              placeholder="https://pinterest.com/yourname/boardname"
              className="flex-1 bg-card border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-foreground/40"
            />
            <button onClick={addBoard} className="p-2 border border-primary text-primary hover:bg-primary hover:text-primary-foreground transition">
              <Check className="w-4 h-4" />
            </button>
            <button onClick={() => setAddingBoard(false)} className="p-2 border border-border text-muted-foreground hover:text-foreground transition">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button onClick={() => setAddingBoard(true)}
            className="inline-flex items-center gap-2 px-4 py-2 border border-dashed border-border text-muted-foreground text-sm hover:border-foreground/40 hover:text-foreground transition">
            <Plus className="w-3.5 h-3.5" /> Add board
          </button>
        )}

        {boardError && (
          <p className="mt-3 text-xs text-destructive">{boardError}</p>
        )}

        {analyzeMsg && (
          <p className={`mt-3 text-xs ${analyzeMsg.startsWith('Done') ? 'text-primary' : 'text-muted-foreground'}`}>
            {analyzeMsg}
          </p>
        )}
      </Section>

      {/* Shoppable Pinterest pins */}
      {aspirationItems.length > 0 && (
        <Section title="Shoppable pins" subtitle="Tap 'Shop this look' on any pin to browse products Google Lens found — sorted by item.">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {aspirationItems
              .filter((pin, i, arr) => arr.findIndex(p => p.image_url === pin.image_url) === i)
              .map(pin => (
                <ShoppablePinCard
                  key={pin.id}
                  pin={pin}
                  onRemove={removePin}
                  userId={userId}
                />
              ))
            }
          </div>
        </Section>
      )}

      {/* Favorite stores */}
      <Section title="Favorite stores" subtitle="Where your shopper hunts first.">
        <StoresDropdown
          selected={profile.favorite_stores ?? []}
          onChange={handleStoresChange}
        />
      </Section>

      {/* Sizes */}
      <Section
        title="Sizes"
        subtitle="Used to filter search results."
        action={
          editingSizes ? (
            <button onClick={saveSizes} className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-primary text-primary text-xs uppercase tracking-widest hover:bg-primary hover:text-primary-foreground transition">
              <Check className="w-3 h-3" /> Save
            </button>
          ) : (
            <button onClick={startEditSizes} className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border text-muted-foreground text-xs uppercase tracking-widest hover:text-foreground transition">
              <Pencil className="w-3 h-3" /> Edit
            </button>
          )
        }
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(SIZE_OPTIONS).map(([key, options]) => (
            <div key={key} className="border border-border p-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">{key}</div>
              {editingSizes ? (
                <select
                  value={sizesInput[key] ?? ''}
                  onChange={e => setSizesInput(s => ({ ...s, [key]: e.target.value }))}
                  className="w-full bg-card border border-border px-2 py-1.5 text-sm text-foreground outline-none focus:border-foreground/40 cursor-pointer"
                >
                  <option value="">Select</option>
                  {options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <div className="text-sm text-foreground font-medium">
                  {profile.sizes?.[key] || <span className="text-muted-foreground/40 font-normal">—</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

function Section({ title, subtitle, action, children }) {
  return (
    <div className="mb-12">
      <div className="flex items-end justify-between mb-4 border-b border-border pb-3">
        <div>
          <h2 className="font-serif text-2xl text-foreground">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5 uppercase tracking-wider">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}
