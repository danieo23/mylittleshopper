import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { ShoppingBag, Shirt, PackageCheck, LogOut, Menu, X, User, ChevronDown, Check } from 'lucide-react';
import { supabase } from '@/api/client';

const NAV = [
  { to: '/dashboard',    icon: ShoppingBag,  label: 'My Shopper' },
  { to: '/style-vault',  icon: Shirt,        label: 'Style Vault' },
  { to: '/orders',       icon: PackageCheck, label: 'My Orders' },
];

const COUNTRIES = [
  { code: 'us', label: 'United States' },
  { code: 'gb', label: 'United Kingdom' },
  { code: 'ca', label: 'Canada' },
  { code: 'au', label: 'Australia' },
  { code: 'fr', label: 'France' },
  { code: 'de', label: 'Germany' },
  { code: 'it', label: 'Italy' },
  { code: 'es', label: 'Spain' },
  { code: 'nl', label: 'Netherlands' },
  { code: 'jp', label: 'Japan' },
  { code: 'kr', label: 'South Korea' },
  { code: 'br', label: 'Brazil' },
  { code: 'mx', label: 'Mexico' },
];

function UserInfoPanel({ userId }) {
  const [open,    setOpen]    = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [form,    setForm]    = useState({ name: '', location: '', country_code: 'us', address: '' });

  useEffect(() => {
    if (!userId) return;
    supabase.from('users').select('name, location, country_code, address').eq('id', userId).single()
      .then(({ data }) => {
        if (data) setForm({
          name:         data.name         ?? '',
          location:     data.location     ?? '',
          country_code: data.country_code ?? 'us',
          address:      data.address      ?? '',
        });
      });
  }, [userId]);

  const save = async () => {
    setSaving(true);
    await supabase.from('users').update({
      name:         form.name         || null,
      location:     form.location     || null,
      country_code: form.country_code || 'us',
      address:      form.address      || null,
    }).eq('id', userId);
    setSaving(false);
    setSaved(true);
    setTimeout(() => { setSaved(false); setEditing(false); }, 1200);
  };

  const countryLabel = COUNTRIES.find(c => c.code === form.country_code)?.label ?? form.country_code;

  return (
    <div className="px-3 pb-3 border-t border-border pt-3">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary rounded-sm transition"
      >
        <User className="w-4 h-4 shrink-0" />
        <span className="flex-1 text-left truncate">{form.name || 'My Profile'}</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="mt-2 px-1 space-y-2">
          {!editing ? (
            <>
              <div className="px-2 py-1.5 space-y-1">
                {form.location && (
                  <p className="text-xs text-muted-foreground truncate">{form.location}</p>
                )}
                <p className="text-xs text-muted-foreground">{countryLabel}</p>
                {form.address && (
                  <p className="text-xs text-muted-foreground truncate">{form.address}</p>
                )}
              </div>
              <button
                onClick={() => setEditing(true)}
                className="w-full text-xs text-primary hover:underline text-left px-2 py-1"
              >
                Edit info
              </button>
            </>
          ) : (
            <div className="space-y-2">
              <input
                className="w-full text-xs bg-secondary border border-border rounded px-2 py-1.5 focus:outline-none focus:border-primary"
                placeholder="Full name"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
              <input
                className="w-full text-xs bg-secondary border border-border rounded px-2 py-1.5 focus:outline-none focus:border-primary"
                placeholder="City, State"
                value={form.location}
                onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
              />
              <select
                className="w-full text-xs bg-secondary border border-border rounded px-2 py-1.5 focus:outline-none focus:border-primary"
                value={form.country_code}
                onChange={e => setForm(f => ({ ...f, country_code: e.target.value }))}
              >
                {COUNTRIES.map(c => (
                  <option key={c.code} value={c.code}>{c.label}</option>
                ))}
              </select>
              <input
                className="w-full text-xs bg-secondary border border-border rounded px-2 py-1.5 focus:outline-none focus:border-primary"
                placeholder="Shipping address"
                value={form.address}
                onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
              />
              <div className="flex gap-2">
                <button
                  onClick={save}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-1 text-xs bg-primary text-primary-foreground rounded px-2 py-1.5 hover:opacity-90 transition"
                >
                  {saved ? <><Check className="w-3 h-3" /> Saved</> : saving ? 'Saving…' : 'Save'}
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="text-xs text-muted-foreground hover:text-foreground px-2 py-1.5"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function DashboardLayout({ children }) {
  const navigate = useNavigate();
  const [open,   setOpen]   = useState(false);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data?.user?.id ?? null));
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Sidebar — desktop */}
      <aside className="hidden md:flex flex-col w-52 shrink-0 border-r border-border min-h-screen sticky top-0">
        {/* Logo */}
        <div className="h-14 flex items-center gap-2 px-5 border-b border-border">
          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-serif text-xs font-bold">m</span>
          </div>
          <span className="font-serif text-sm tracking-tight">mylilshopper</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-6 px-3 space-y-1">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 text-sm transition rounded-sm ${
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User info */}
        {userId && <UserInfoPanel userId={userId} />}

        {/* Logout */}
        <div className="px-3 pb-6">
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground transition w-full rounded-sm hover:bg-secondary"
          >
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 inset-x-0 z-50 h-14 bg-background border-b border-border flex items-center justify-between px-5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-serif text-xs font-bold">m</span>
          </div>
          <span className="font-serif text-sm tracking-tight">mylilshopper</span>
        </div>
        <button onClick={() => setOpen(o => !o)}>
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-40 bg-background pt-14">
          <nav className="p-5 space-y-2">
            {NAV.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 text-sm transition ${
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  }`
                }
              >
                <Icon className="w-4 h-4" /> {label}
              </NavLink>
            ))}
            {userId && (
              <div onClick={() => setOpen(false)}>
                <UserInfoPanel userId={userId} />
              </div>
            )}
            <button
              onClick={logout}
              className="flex items-center gap-3 px-4 py-3 text-sm text-muted-foreground w-full"
            >
              <LogOut className="w-4 h-4" /> Sign out
            </button>
          </nav>
        </div>
      )}

      {/* Page content */}
      <main className="flex-1 md:min-h-screen pt-14 md:pt-0">
        {children}
      </main>
    </div>
  );
}
