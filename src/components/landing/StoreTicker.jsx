import React from 'react';

const STORES = [
  'Zara', 'H&M', 'ASOS', 'Pacsun', 'Nike', 'Depop', 'Uniqlo',
  'Mango', 'Burlington', 'Urban Outfitters', 'Reformation', 'Everlane',
  'Banana Republic', 'J.Crew', 'Free People', 'Revolve', 'Nordstrom',
];

const doubled = [...STORES, ...STORES];

export default function StoreTicker() {
  return (
    <div className="border-y border-border py-4 overflow-hidden">
      <div className="flex ticker-track whitespace-nowrap">
        {doubled.map((store, i) => (
          <span key={i} className="inline-flex items-center gap-6 px-6 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            {store}
            <span className="w-1 h-1 rounded-full bg-border inline-block" />
          </span>
        ))}
      </div>
    </div>
  );
}
