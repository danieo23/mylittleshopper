import React from 'react';
import { PackageCheck } from 'lucide-react';

export default function Orders() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-14">
      <div className="mb-10 border-b border-border pb-8">
        <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-3">My Orders</div>
        <h1 className="font-serif text-5xl tracking-tight text-foreground">Order history.</h1>
      </div>

      <div className="flex flex-col items-center justify-center py-28 text-center">
        <PackageCheck className="w-10 h-10 text-border mb-5" />
        <p className="text-sm text-muted-foreground">No orders yet.</p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          Once your shopper checks out, your orders will appear here.
        </p>
      </div>
    </div>
  );
}
