import React, { useEffect, useState } from 'react';
import { Upload, ExternalLink, Loader2, Plus, X } from 'lucide-react';
import { base44 } from '@/api/client';

const STYLE_TAGS = [
  'Minimal', 'Streetwear', 'Old Money', 'Y2K', 'Preppy', 'Coastal', 'Techwear',
  'Vintage', 'Business Casual', 'Athleisure', 'Bohemian', 'Grunge', 'Dark Academia',
  'Cottagecore', 'Hypebeast', 'Smart Casual', 'Avant-garde', 'Normcore', 'Rockstar',
  'Festival', 'Resort / Vacation', 'Date Night', 'Workwear', 'Quiet Luxury',
];

const PHOTO_TABS = [
  { key: 'wardrobe', label: 'Wardrobe' },
  { key: 'outfit',   label: 'Past Outfits' },
  { key: 'inspo',    label: 'Inspo' },
];

export default function StyleVault() {
  const [profile, setProfile] = useState(null);
  const [items, setItems] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('wardrobe');

  const load = async () => {
    try {
      const me = await base44.auth.me();
      const profiles = await base44.entities.StyleProfile.filter({ user_id: me.id }, '-created_at', 1);
      setProfile(profiles[0] ?? null);
      const wardrobe = await base44.entities.WardrobeItem.filter({ user_id: me.id }, '-created_at');
      setItems(wardrobe);
    } catch {
      // not authenticated
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    try {
      const me = await base44.auth.me();
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        await base44.entities.WardrobeItem.create({ user_id: me.id, image_url: file_url, category: activeTab });
      }
      await load();
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <div className="p-12 text-center text-muted-foreground text-sm">Loading…</div>;

  if (!profile) return (
    <div className="p-12 text-center">
      <p className="text-sm text-muted-foreground">No style profile found.</p>
      <a href="/onboarding" className="mt-2 inline-block text-xs text-primary underline underline-offset-2">Complete your profile →</a>
    </div>
  );

  const allTags = [...(profile.style_tags ?? []), ...(profile.learned_tags ?? [])];
  const tabItems = items.filter(it => it.category === activeTab);

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <div className="mb-10 border-b border-border pb-8">
        <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-3">Style vault</div>
        <h1 className="font-serif text-5xl tracking-tight text-foreground">Your taste, on file.</h1>
      </div>

      {/* Style tags */}
      <Section title="Style tags" subtitle="What your shopper knows about you.">
        <div className="flex flex-wrap gap-2">
          {STYLE_TAGS.map(t => {
            const active = allTags.includes(t);
            return (
              <span
                key={t}
                className={`px-3 py-1.5 border text-[11px] uppercase tracking-wider ${active ? 'border-primary text-primary' : 'border-border text-muted-foreground'}`}
              >
                {t}
              </span>
            );
          })}
        </div>
      </Section>

      {/* Photo wardrobe */}
      <Section
        title="My photos"
        subtitle="The more you upload, the better your shopper knows your look."
        action={
          <label className="inline-flex items-center gap-2 px-4 py-2 border border-foreground text-foreground text-xs uppercase tracking-widest cursor-pointer hover:bg-foreground hover:text-background transition">
            <input type="file" multiple accept="image/*" className="hidden" onChange={handleUpload} />
            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Add photos
          </label>
        }
      >
        {/* Tabs */}
        <div className="flex gap-0 border-b border-border mb-5">
          {PHOTO_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-xs uppercase tracking-wider border-b-2 transition -mb-px ${
                activeTab === tab.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
              <span className="ml-1.5 text-[10px] opacity-60">
                ({items.filter(i => i.category === tab.key).length})
              </span>
            </button>
          ))}
        </div>

        {tabItems.length === 0 ? (
          <label className="block border border-dashed border-border p-10 text-center cursor-pointer hover:border-foreground/30 transition">
            <input type="file" multiple accept="image/*" className="hidden" onChange={handleUpload} />
            <Upload className="w-5 h-5 mx-auto text-muted-foreground mb-3" />
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Upload photos</div>
            <div className="text-xs text-muted-foreground/50 mt-1">
              {activeTab === 'wardrobe' && 'Clothes you own'}
              {activeTab === 'outfit' && 'Looks you\'ve worn and loved'}
              {activeTab === 'inspo' && 'Aspirational style, screenshots, saves'}
            </div>
          </label>
        ) : (
          <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-px bg-border border border-border">
            {tabItems.map(it => (
              <div key={it.id} className="aspect-square overflow-hidden bg-muted">
                <img src={it.image_url} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Pinterest */}
      <Section title="Pinterest board" subtitle="Your shopper studies this for inspiration.">
        {profile.pinterest_board_url ? (
          <a
            href={profile.pinterest_board_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-4 py-3 border border-border text-foreground hover:border-foreground/50 transition"
          >
            <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-sm truncate max-w-md">{profile.pinterest_board_url}</span>
          </a>
        ) : (
          <span className="text-sm text-muted-foreground">No board linked yet.</span>
        )}
      </Section>

      {/* Favorite stores */}
      <Section title="Favorite stores" subtitle="Where your shopper hunts first.">
        <div className="flex flex-wrap gap-2">
          {(profile.favorite_stores ?? []).map(s => (
            <span key={s} className="px-3 py-1.5 border border-primary text-primary text-[11px] uppercase tracking-wider">{s}</span>
          ))}
          {(!profile.favorite_stores || profile.favorite_stores.length === 0) &&
            <span className="text-sm text-muted-foreground">None set.</span>}
        </div>
      </Section>

      {/* Sizes */}
      {profile.sizes && (
        <Section title="Sizes" subtitle="Used to filter search results.">
          <div className="flex flex-wrap gap-4">
            {Object.entries(profile.sizes).filter(([, v]) => v).map(([k, v]) => (
              <div key={k} className="border border-border px-4 py-2">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</div>
                <div className="text-sm text-foreground mt-0.5">{v}</div>
              </div>
            ))}
          </div>
        </Section>
      )}
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
