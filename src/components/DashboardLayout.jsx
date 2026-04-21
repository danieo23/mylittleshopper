import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { ShoppingBag, Shirt, PackageCheck, LogOut, Menu, X } from 'lucide-react';
import { supabase } from '@/api/client';

const NAV = [
  { to: '/dashboard',    icon: ShoppingBag,  label: 'My Shopper' },
  { to: '/style-vault',  icon: Shirt,        label: 'Style Vault' },
  { to: '/orders',       icon: PackageCheck, label: 'My Orders' },
];

export default function DashboardLayout({ children }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

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
