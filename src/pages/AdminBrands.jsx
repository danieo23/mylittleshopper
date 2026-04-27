import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle, XCircle, RefreshCw, Plus, ToggleLeft, ToggleRight, ChevronDown, ChevronUp } from 'lucide-react';

// Auth: pass ?token=YOUR_ADMIN_ACCESS_TOKEN in URL.
// TODO: replace with proper session auth before launch.
const ADMIN_TOKEN = new URLSearchParams(window.location.search).get('token') ?? '';

const API = '/api/admin-brands';

const headers = {
  'Content-Type': 'application/json',
  'x-admin-token': ADMIN_TOKEN,
};

async function apiFetch(method, body) {
  const res = await fetch(`${API}?token=${ADMIN_TOKEN}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? res.statusText);
  }
  return res.json();
}

const TIER_COLORS = {
  budget:  'bg-green-100 text-green-800',
  mid:     'bg-blue-100 text-blue-800',
  premium: 'bg-purple-100 text-purple-800',
  luxury:  'bg-yellow-100 text-yellow-800',
};

const TIERS     = ['budget', 'mid', 'premium', 'luxury'];
const GENDERS   = ['all', 'mens', 'womens', 'unisex'];
const REGIONS   = ['US', 'EU', 'GB', 'JP', 'AU', 'CA'];

const EMPTY_FORM = {
  name: '', slug: '', domain: '', shopify_base_url: '', shopify_collection_slugs: '',
  is_shopify: true, price_tier: 'mid', typical_price_min: '', typical_price_max: '',
  aesthetic_tags: '', cultural_signals: '', typical_colors: '', typical_fits: '',
  gender_focus: 'all', geo_region: 'US', notes: '',
};

function parseArrayField(val) {
  if (!val || !val.trim()) return [];
  return val.split(',').map(s => s.trim()).filter(Boolean);
}

function fmtVerified(ts) {
  if (!ts) return <span className="text-red-500 text-xs">unverified</span>;
  return <span className="text-green-600 text-xs">{new Date(ts).toLocaleDateString()}</span>;
}

// ── Add Brand Form ────────────────────────────────────────────────────────
function AddBrandForm({ onAdded }) {
  const [form,    setForm]    = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const [open,    setOpen]    = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload = {
        ...form,
        shopify_collection_slugs: parseArrayField(form.shopify_collection_slugs),
        aesthetic_tags:           parseArrayField(form.aesthetic_tags),
        cultural_signals:         parseArrayField(form.cultural_signals),
        typical_colors:           parseArrayField(form.typical_colors),
        typical_fits:             parseArrayField(form.typical_fits),
        typical_price_min:        form.typical_price_min ? parseInt(form.typical_price_min) : null,
        typical_price_max:        form.typical_price_max ? parseInt(form.typical_price_max) : null,
        shopify_base_url:         form.shopify_base_url || `https://${form.domain}`,
      };
      await apiFetch('POST', payload);
      setForm(EMPTY_FORM);
      setOpen(false);
      onAdded();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border border-border rounded-lg mb-6">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-left"
      >
        <span className="flex items-center gap-2"><Plus className="w-4 h-4" /> Add New Brand</span>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {open && (
        <form onSubmit={submit} className="p-4 border-t border-border grid grid-cols-2 gap-3 text-sm">
          {error && <p className="col-span-2 text-red-500 text-xs">{error}</p>}
          {[
            ['name','Name*',''],
            ['slug','Slug* (url-safe)',''],
            ['domain','Domain* (no https)','brand.com'],
            ['shopify_base_url','Shopify Base URL','https://brand.com'],
          ].map(([k, label, placeholder]) => (
            <label key={k} className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">{label}</span>
              <input className="border border-border rounded px-2 py-1.5 bg-background text-xs focus:outline-none focus:border-primary"
                placeholder={placeholder} value={form[k]} onChange={e => set(k, e.target.value)} />
            </label>
          ))}
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Price Tier*</span>
            <select className="border border-border rounded px-2 py-1.5 bg-background text-xs focus:outline-none"
              value={form.price_tier} onChange={e => set('price_tier', e.target.value)}>
              {TIERS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Gender Focus</span>
            <select className="border border-border rounded px-2 py-1.5 bg-background text-xs focus:outline-none"
              value={form.gender_focus} onChange={e => set('gender_focus', e.target.value)}>
              {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Geo Region</span>
            <select className="border border-border rounded px-2 py-1.5 bg-background text-xs focus:outline-none"
              value={form.geo_region} onChange={e => set('geo_region', e.target.value)}>
              {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Min Price ($)</span>
            <input type="number" className="border border-border rounded px-2 py-1.5 bg-background text-xs focus:outline-none"
              value={form.typical_price_min} onChange={e => set('typical_price_min', e.target.value)} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Max Price ($)</span>
            <input type="number" className="border border-border rounded px-2 py-1.5 bg-background text-xs focus:outline-none"
              value={form.typical_price_max} onChange={e => set('typical_price_max', e.target.value)} />
          </label>
          {[
            ['aesthetic_tags',           'Aesthetic Tags (comma-separated)'],
            ['cultural_signals',         'Cultural Signals (comma-separated)'],
            ['typical_colors',           'Typical Colors (comma-separated)'],
            ['typical_fits',             'Typical Fits (comma-separated)'],
            ['shopify_collection_slugs', 'Collection Slugs (comma-separated)'],
          ].map(([k, label]) => (
            <label key={k} className="col-span-2 flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">{label}</span>
              <input className="border border-border rounded px-2 py-1.5 bg-background text-xs focus:outline-none focus:border-primary"
                value={form[k]} onChange={e => set(k, e.target.value)} />
            </label>
          ))}
          <label className="col-span-2 flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Notes</span>
            <textarea className="border border-border rounded px-2 py-1.5 bg-background text-xs focus:outline-none focus:border-primary resize-none h-14"
              value={form.notes} onChange={e => set('notes', e.target.value)} />
          </label>
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input type="checkbox" checked={form.is_shopify} onChange={e => set('is_shopify', e.target.checked)} />
            Is Shopify
          </label>
          <div className="col-span-2 flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setOpen(false)}
              className="text-xs text-muted-foreground px-3 py-1.5">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="text-xs bg-primary text-primary-foreground rounded px-4 py-1.5 hover:opacity-90 disabled:opacity-50">
              {loading ? 'Adding…' : 'Add Brand'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

// ── Brand Row ─────────────────────────────────────────────────────────────
function BrandRow({ brand, onUpdate }) {
  const [verifying, setVerifying] = useState(false);
  const [result,    setResult]    = useState(null);

  const verify = async () => {
    setVerifying(true);
    setResult(null);
    try {
      const r = await apiFetch('POST', { action: 'verify', id: brand.id });
      setResult(r);
      onUpdate();
    } catch (err) {
      setResult({ ok: false, productCount: 0, error: err.message });
    } finally {
      setVerifying(false);
    }
  };

  const toggleActive = async () => {
    try {
      await apiFetch('PUT', { id: brand.id, is_active: !brand.is_active });
      onUpdate();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <tr className={`border-b border-border text-sm ${brand.is_active ? '' : 'opacity-40'}`}>
      <td className="py-2 px-3 font-medium">
        <div>{brand.name}</div>
        <div className="text-xs text-muted-foreground">{brand.domain}</div>
      </td>
      <td className="py-2 px-3">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TIER_COLORS[brand.price_tier] ?? ''}`}>
          {brand.price_tier}
        </span>
      </td>
      <td className="py-2 px-3 text-xs text-muted-foreground">
        {brand.gender_focus}
      </td>
      <td className="py-2 px-3">
        <div className="flex flex-wrap gap-1">
          {(brand.aesthetic_tags ?? []).slice(0, 3).map(t => (
            <span key={t} className="text-xs bg-secondary rounded px-1.5 py-0.5">{t}</span>
          ))}
          {(brand.aesthetic_tags ?? []).length > 3 && (
            <span className="text-xs text-muted-foreground">+{brand.aesthetic_tags.length - 3}</span>
          )}
        </div>
      </td>
      <td className="py-2 px-3">
        {brand.is_shopify
          ? <span className="text-xs text-green-600">Shopify</span>
          : <span className="text-xs text-muted-foreground">custom</span>}
      </td>
      <td className="py-2 px-3">{fmtVerified(brand.last_verified_at)}</td>
      <td className="py-2 px-3">
        <div className="flex items-center gap-2">
          {brand.is_shopify && (
            <button
              onClick={verify}
              disabled={verifying}
              title="Test Shopify endpoint"
              className="flex items-center gap-1 text-xs text-primary hover:underline disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${verifying ? 'animate-spin' : ''}`} />
              {verifying ? 'testing…' : 'verify'}
            </button>
          )}
          {result && (
            result.ok
              ? <CheckCircle className="w-4 h-4 text-green-600" title={`${result.productCount} products`} />
              : <XCircle    className="w-4 h-4 text-red-500"   title={result.error ?? 'no products'} />
          )}
          <button onClick={toggleActive} title={brand.is_active ? 'Deactivate' : 'Activate'}>
            {brand.is_active
              ? <ToggleRight className="w-5 h-5 text-primary" />
              : <ToggleLeft  className="w-5 h-5 text-muted-foreground" />}
          </button>
        </div>
      </td>
    </tr>
  );
}

// ── Main Admin Page ───────────────────────────────────────────────────────
export default function AdminBrands() {
  const [brands,       setBrands]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [bulkRunning,  setBulkRunning]  = useState(false);
  const [bulkReport,   setBulkReport]   = useState(null);
  const [filterTier,   setFilterTier]   = useState('all');
  const [filterSearch, setFilterSearch] = useState('');

  const load = useCallback(async () => {
    try {
      const { brands: data } = await apiFetch('GET');
      setBrands(data ?? []);
      setError(null);
    } catch (err) {
      if (err.message.includes('Unauthorized')) {
        setError('Not authorized. Pass ?token=YOUR_ADMIN_ACCESS_TOKEN in the URL.');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const bulkVerify = async () => {
    setBulkRunning(true);
    setBulkReport(null);
    try {
      const { report } = await apiFetch('POST', { action: 'bulk-verify' });
      setBulkReport(report);
      await load();
    } catch (err) {
      setBulkReport([{ name: 'Error', ok: false, error: err.message }]);
    } finally {
      setBulkRunning(false);
    }
  };

  const displayed = brands.filter(b => {
    if (filterTier !== 'all' && b.price_tier !== filterTier) return false;
    if (filterSearch) {
      const q = filterSearch.toLowerCase();
      return b.name.toLowerCase().includes(q) || (b.aesthetic_tags ?? []).some(t => t.includes(q));
    }
    return true;
  });

  const tierCounts = TIERS.reduce((acc, t) => {
    acc[t] = brands.filter(b => b.price_tier === t).length;
    return acc;
  }, {});

  if (!ADMIN_TOKEN) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 text-center">
        <div>
          <h1 className="text-lg font-semibold mb-2">Admin Access Required</h1>
          <p className="text-sm text-muted-foreground">Pass <code>?token=YOUR_ADMIN_ACCESS_TOKEN</code> in the URL.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">Curated Brand Catalog</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {brands.length} brands · {brands.filter(b => b.is_active).length} active ·{' '}
            {brands.filter(b => b.last_verified_at).length} verified
          </p>
        </div>
        <button
          onClick={bulkVerify}
          disabled={bulkRunning}
          className="flex items-center gap-2 text-sm bg-primary text-primary-foreground rounded px-4 py-2 hover:opacity-90 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${bulkRunning ? 'animate-spin' : ''}`} />
          {bulkRunning ? 'Verifying…' : 'Bulk Verify All'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 mb-4 text-sm">{error}</div>
      )}

      {/* Bulk verify report */}
      {bulkReport && (
        <div className="mb-4 p-3 bg-secondary rounded text-xs max-h-40 overflow-y-auto">
          {bulkReport.map((r, i) => (
            <div key={i} className={`flex gap-2 ${r.ok ? 'text-green-700' : 'text-red-600'}`}>
              {r.ok ? '✓' : '✗'} {r.name}
              {r.ok ? ` — ${r.productCount} products (slug: ${r.workingSlug})` : ` — ${r.note ?? r.error ?? 'no products'}`}
            </div>
          ))}
        </div>
      )}

      {/* Add brand form */}
      <AddBrandForm onAdded={load} />

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <input
          placeholder="Search name or tag…"
          value={filterSearch}
          onChange={e => setFilterSearch(e.target.value)}
          className="text-sm border border-border rounded px-3 py-1.5 bg-background focus:outline-none focus:border-primary w-56"
        />
        <div className="flex gap-1">
          {['all', ...TIERS].map(t => (
            <button
              key={t}
              onClick={() => setFilterTier(t)}
              className={`text-xs px-3 py-1.5 rounded border transition ${
                filterTier === t
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground hover:border-foreground'
              }`}
            >
              {t}{t !== 'all' ? ` (${tierCounts[t] ?? 0})` : ''}
            </button>
          ))}
        </div>
      </div>

      {/* Brand table */}
      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-12">Loading…</p>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-secondary text-xs text-muted-foreground">
              <tr>
                <th className="py-2 px-3 font-medium">Brand</th>
                <th className="py-2 px-3 font-medium">Tier</th>
                <th className="py-2 px-3 font-medium">Gender</th>
                <th className="py-2 px-3 font-medium">Tags</th>
                <th className="py-2 px-3 font-medium">Platform</th>
                <th className="py-2 px-3 font-medium">Verified</th>
                <th className="py-2 px-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map(brand => (
                <BrandRow key={brand.id} brand={brand} onUpdate={load} />
              ))}
              {!displayed.length && (
                <tr><td colSpan={7} className="py-8 text-center text-sm text-muted-foreground">No brands found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
