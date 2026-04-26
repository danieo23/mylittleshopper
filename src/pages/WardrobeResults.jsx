import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/api/client';
import { ArrowRight, Loader2, ExternalLink, ShoppingBag, RefreshCw, Star } from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────

function formatPrice(price, currency = 'USD') {
  if (price == null) return null;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(price);
}

function capitalize(s) {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ── Sub-components ────────────────────────────────────────────────

function Section({ title, subtitle, action, children }) {
  return (
    <div className="mb-14">
      <div className="flex items-end justify-between mb-5 border-b border-border pb-3">
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

// Insight cards + shopping profile — same markup as StyleVault's WardrobeProfileDisplay
function WardrobeProfilePanel({ profile }) {
  const { insights = [], shopping_profile } = profile;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {insights.map((ins, i) => (
          <div key={i} className="border border-border bg-card p-4">
            <div className="flex items-start gap-3">
              <span className="text-xl leading-none mt-0.5">{ins.emoji}</span>
              <div>
                <h3 className="font-serif text-base text-foreground mb-1">{ins.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{ins.body}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      {shopping_profile && (
        <div className="border border-border bg-card p-5">
          <h3 className="font-serif text-lg text-foreground mb-4">Shopping Profile</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {shopping_profile.loves?.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Loves</p>
                <div className="flex flex-wrap gap-1.5">
                  {shopping_profile.loves.map((item, i) => (
                    <span key={i} className="px-2 py-0.5 bg-primary/10 border border-primary/20 text-primary text-[11px]">{item}</span>
                  ))}
                </div>
              </div>
            )}
            {shopping_profile.brands?.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Brands you'd respond to</p>
                <div className="flex flex-wrap gap-1.5">
                  {shopping_profile.brands.map((b, i) => (
                    <span key={i} className="px-2 py-0.5 border border-border text-foreground text-[11px]">{b}</span>
                  ))}
                </div>
              </div>
            )}
            {shopping_profile.gravitates_toward?.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Gravitates toward</p>
                <ul className="space-y-0.5">
                  {shopping_profile.gravitates_toward.map((g, i) => (
                    <li key={i} className="text-xs text-muted-foreground">— {g}</li>
                  ))}
                </ul>
              </div>
            )}
            {shopping_profile.shopping_behavior && (
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Shopping behavior</p>
                <p className="text-xs text-muted-foreground italic">{shopping_profile.shopping_behavior}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// A single matched product card — wardrobe item thumbnail on the left, product details on the right
function ProductMatchCard({ match, featured = false }) {
  const { wardrobe_image_url, wardrobe_item_type, matched_product, match_score, match_reason, is_top_pick } = match;
  const product = matched_product ?? {};

  return (
    <div className={`border border-border bg-card overflow-hidden flex flex-col relative ${featured ? 'h-full' : ''}`}>
      {is_top_pick && (
        <div className="absolute top-2 left-2 z-10 flex items-center gap-1 bg-foreground text-background px-2 py-0.5 text-[9px] uppercase tracking-widest">
          <Star className="w-2.5 h-2.5" fill="currentColor" />
          Top Pick
        </div>
      )}

      {/* Product image */}
      <div className={`relative bg-muted overflow-hidden ${featured ? 'aspect-[3/4]' : 'aspect-[4/3]'}`}>
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name ?? ''}
            className="w-full h-full object-cover"
            onError={e => { e.currentTarget.style.display = 'none'; }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingBag className="w-8 h-8 text-muted-foreground/20" />
          </div>
        )}
      </div>

      {/* Details */}
      <div className="p-3 flex flex-col gap-2 flex-1">
        {/* Wardrobe item label */}
        {wardrobe_item_type && (
          <div className="flex items-center gap-1.5">
            {wardrobe_image_url && (
              <img
                src={wardrobe_image_url}
                alt=""
                className="w-6 h-6 object-cover border border-border shrink-0"
                onError={e => { e.currentTarget.style.display = 'none'; }}
              />
            )}
            <span className="text-[9px] uppercase tracking-widest text-muted-foreground">
              Matches your {capitalize(wardrobe_item_type)}
            </span>
          </div>
        )}

        {/* Product name */}
        <p className="text-xs text-foreground leading-snug line-clamp-2 font-medium">
          {product.name ?? 'Product'}
        </p>

        {/* Brand + price row */}
        <div className="flex items-center justify-between gap-2 mt-auto">
          <div>
            {product.brand && (
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide truncate max-w-[120px]">{product.brand}</p>
            )}
            {product.price != null && (
              <p className="text-sm font-semibold text-foreground tabular-nums">{formatPrice(product.price)}</p>
            )}
          </div>
          {product.product_url && (
            <a
              href={product.product_url}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 border border-border text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground hover:border-foreground/40 transition"
            >
              Shop <ExternalLink className="w-2.5 h-2.5" />
            </a>
          )}
        </div>

        {/* Match reason */}
        {match_reason && (
          <p className="text-[10px] text-muted-foreground/60 italic leading-relaxed border-t border-border pt-2">
            {match_reason}
          </p>
        )}
      </div>
    </div>
  );
}

// Skeleton card shown while matching is in progress
function SkeletonCard() {
  return (
    <div className="border border-border bg-card overflow-hidden animate-pulse">
      <div className="aspect-[4/3] bg-muted" />
      <div className="p-3 space-y-2">
        <div className="h-2 w-16 bg-muted rounded" />
        <div className="h-3 w-full bg-muted rounded" />
        <div className="h-3 w-3/4 bg-muted rounded" />
        <div className="h-4 w-12 bg-muted rounded" />
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────

export default function WardrobeResults() {
  const navigate = useNavigate();

  const [userId,    setUserId]    = useState(null);
  const [data,      setData]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [matching,  setMatching]  = useState(false);
  const [error,     setError]     = useState(null);

  // Fetch current user then load results
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { navigate('/login'); return; }
      setUserId(user.id);
      loadResults(user.id);
    });
  }, []);

  const loadResults = useCallback(async (uid) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/wardrobe-matches?userId=${uid}`);
      const d   = await res.json();
      if (d.error) throw new Error(d.error);
      setData(d);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const runMatching = async () => {
    if (!userId || matching) return;
    setMatching(true);
    try {
      const res = await fetch('/api/wardrobe-matches', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ userId }),
      });
      const d = await res.json();
      if (d.error) throw new Error(d.error);
      await loadResults(userId);
    } catch (err) {
      setError(err.message);
    } finally {
      setMatching(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16">
        <div className="mb-10">
          <div className="h-8 w-56 bg-muted animate-pulse rounded mb-2" />
          <div className="h-3 w-80 bg-muted animate-pulse rounded" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center">
        <p className="text-sm text-muted-foreground mb-4">{error}</p>
        <button onClick={() => loadResults(userId)} className="text-xs underline underline-offset-4 text-foreground">
          Try again
        </button>
      </div>
    );
  }

  const hasMatches   = data?.item_matches?.length > 0;
  const hasProfile   = !!data?.wardrobe_profile;
  const topPicks     = data?.top_picks ?? [];
  const allMatches   = data?.item_matches ?? [];
  const nonTopPicks  = allMatches.filter(m => !m.is_top_pick);
  const catalogTotal = data?.catalog_total ?? 0;

  // No analyzed items at all
  if (!hasMatches && data?.unmatched_count === 0) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center space-y-4">
        <h1 className="font-serif text-3xl">Shopping Results</h1>
        <p className="text-sm text-muted-foreground">
          No analyzed items yet. Go to your Style Vault, upload some photos, and hit Analyze.
        </p>
        <button
          onClick={() => navigate('/style-vault')}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-foreground text-background text-xs uppercase tracking-widest hover:opacity-80 transition"
        >
          Go to Style Vault <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">

      {/* Page header */}
      <div className="mb-10 flex items-end justify-between">
        <div>
          <h1 className="font-serif text-4xl text-foreground">Shopping Results</h1>
          <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">
            Real products matched to your actual wardrobe
          </p>
        </div>
        <button
          onClick={runMatching}
          disabled={matching}
          className="inline-flex items-center gap-2 px-4 py-2 border border-border text-muted-foreground text-xs uppercase tracking-widest hover:text-foreground hover:border-foreground/40 transition disabled:opacity-40"
        >
          {matching
            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Finding matches…</>
            : <><RefreshCw className="w-3.5 h-3.5" /> {hasMatches ? 'Refresh matches' : 'Find matches'}</>
          }
        </button>
      </div>

      {/* Unmatched items banner */}
      {!hasMatches && data?.unmatched_count > 0 && (
        <div className="border border-border bg-card p-6 mb-10 text-center space-y-3">
          <p className="text-sm text-foreground">
            You have {data.unmatched_count} analyzed item{data.unmatched_count !== 1 ? 's' : ''} ready to match.
          </p>
          <button
            onClick={runMatching}
            disabled={matching}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-foreground text-background text-xs uppercase tracking-widest hover:opacity-80 transition disabled:opacity-40"
          >
            {matching
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Finding matches…</>
              : <><ShoppingBag className="w-3.5 h-3.5" /> Find matches for my wardrobe</>
            }
          </button>
          {matching && (
            <p className="text-[10px] text-muted-foreground">This takes ~1 minute for a full wardrobe. Sit tight.</p>
          )}
        </div>
      )}

      {matching && hasMatches && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-8">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Refreshing matches in the background…
        </div>
      )}

      {/* Wardrobe profile */}
      {hasProfile && (
        <Section
          title="What Your Wardrobe Says About You"
          subtitle="AI-generated insights from your analyzed items"
        >
          <WardrobeProfilePanel profile={data.wardrobe_profile} />
        </Section>
      )}

      {hasMatches && (
        <>
          {/* Top 5 picks */}
          {topPicks.length > 0 && (
            <Section
              title="Top Picks"
              subtitle={`The ${topPicks.length} highest-matched products for your style`}
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {topPicks.map((match, i) => (
                  <ProductMatchCard key={match.wardrobe_item_id ?? i} match={match} featured />
                ))}
              </div>
            </Section>
          )}

          {/* All matches */}
          {nonTopPicks.length > 0 && (
            <Section
              title="Full Wardrobe Matches"
              subtitle={`${allMatches.length} item${allMatches.length !== 1 ? 's' : ''} matched`}
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {nonTopPicks.map((match, i) => (
                  <ProductMatchCard key={match.wardrobe_item_id ?? i} match={match} />
                ))}
              </div>
            </Section>
          )}

          {/* Catalog total */}
          {catalogTotal > 0 && (
            <div className="border border-border bg-card p-6 mt-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif text-xl text-foreground">Full Catalog Value</h3>
                <span className="font-serif text-2xl text-foreground tabular-nums">
                  {formatPrice(catalogTotal)}
                </span>
              </div>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {allMatches
                  .filter(m => m.matched_product?.price != null)
                  .map((m, i) => (
                    <div key={i} className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="truncate max-w-[70%]">
                        {m.matched_product.name ?? capitalize(m.wardrobe_item_type) ?? 'Item'}
                      </span>
                      <span className="tabular-nums shrink-0">{formatPrice(m.matched_product.price)}</span>
                    </div>
                  ))
                }
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
