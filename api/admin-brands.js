// Admin API for the curated_brands catalog.
// Protected by ADMIN_ACCESS_TOKEN env variable — checked on every request.
// TODO: replace token auth with proper session-based auth before public launch.

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const ADMIN_TOKEN = process.env.ADMIN_ACCESS_TOKEN;

function checkAuth(req) {
  if (!ADMIN_TOKEN) return false; // admin disabled if token not set
  const token = req.headers['x-admin-token'] ?? req.query?.token;
  return token === ADMIN_TOKEN;
}

// Verify a single brand's Shopify catalog endpoint.
// Returns { ok, productCount, testedAt } — used by both single and bulk verify.
async function verifyShopifyEndpoint(brand) {
  const base = (brand.shopify_base_url ?? `https://${brand.domain}`).replace(/\/$/, '');
  const slugsToTry = [
    ...(brand.shopify_collection_slugs ?? []),
    'all',
    'mens',
    't-shirts',
    'tops',
    'shirts',
    'bottoms',
    'outerwear',
  ];
  const deduped = [...new Set(slugsToTry)];

  let bestCount = 0;
  let workingSlug = null;

  for (const slug of deduped) {
    try {
      const url  = `${base}/collections/${slug}/products.json?limit=10`;
      const res  = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)' },
        signal:  AbortSignal.timeout(6000),
      });
      if (!res.ok) continue;
      const data  = await res.json();
      const count = data?.products?.length ?? 0;
      if (count > bestCount) {
        bestCount   = count;
        workingSlug = slug;
      }
      if (bestCount >= 5) break; // found a productive slug — stop
    } catch { continue; }
  }

  // Also try the bare /products.json if collections all failed
  if (!bestCount) {
    try {
      const res = await fetch(`${base}/products.json?limit=10`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)' },
        signal:  AbortSignal.timeout(6000),
      });
      if (res.ok) {
        const data  = await res.json();
        bestCount   = data?.products?.length ?? 0;
        workingSlug = 'products.json';
      }
    } catch { /* silent */ }
  }

  return {
    ok:           bestCount > 0,
    productCount: bestCount,
    workingSlug,
    testedAt:     new Date().toISOString(),
  };
}

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  if (!checkAuth(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { method } = req;

  // ── GET: list all brands ───────────────────────────────────────────────
  if (method === 'GET') {
    const { data, error } = await supabase
      .from('curated_brands')
      .select('*')
      .order('price_tier')
      .order('name');
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ brands: data });
  }

  // ── POST: add a brand or run verify/bulk-verify operations ────────────
  if (method === 'POST') {
    const body = req.body ?? {};

    // Verify a single brand's Shopify endpoint
    if (body.action === 'verify') {
      const { id } = body;
      if (!id) return res.status(400).json({ error: 'id required' });
      const { data: brand, error: fetchErr } = await supabase
        .from('curated_brands').select('*').eq('id', id).single();
      if (fetchErr || !brand) return res.status(404).json({ error: 'brand not found' });

      const result = await verifyShopifyEndpoint(brand);
      await supabase.from('curated_brands').update({
        last_verified_at: result.ok ? result.testedAt : null,
      }).eq('id', id);

      return res.status(200).json({ brand: brand.name, ...result });
    }

    // Bulk verify all active brands sequentially
    if (body.action === 'bulk-verify') {
      const { data: brands, error: listErr } = await supabase
        .from('curated_brands').select('*').eq('is_active', true);
      if (listErr) return res.status(500).json({ error: listErr.message });

      const report = [];
      for (const brand of brands ?? []) {
        if (!brand.is_shopify) {
          report.push({ name: brand.name, ok: false, note: 'non-Shopify, skipped' });
          continue;
        }
        const result = await verifyShopifyEndpoint(brand);
        await supabase.from('curated_brands').update({
          last_verified_at: result.ok ? result.testedAt : null,
        }).eq('id', brand.id);
        report.push({ name: brand.name, ...result });
      }
      return res.status(200).json({ report });
    }

    // Add a new brand
    const required = ['name', 'slug', 'domain', 'price_tier'];
    for (const field of required) {
      if (!body[field]) return res.status(400).json({ error: `${field} required` });
    }
    const { data, error } = await supabase.from('curated_brands').insert({
      name:                    body.name,
      slug:                    body.slug,
      domain:                  body.domain,
      shopify_base_url:        body.shopify_base_url        ?? `https://${body.domain}`,
      shopify_collection_slugs:body.shopify_collection_slugs ?? [],
      is_shopify:              body.is_shopify              ?? true,
      price_tier:              body.price_tier,
      typical_price_min:       body.typical_price_min       ?? null,
      typical_price_max:       body.typical_price_max       ?? null,
      aesthetic_tags:          body.aesthetic_tags          ?? [],
      cultural_signals:        body.cultural_signals        ?? [],
      typical_colors:          body.typical_colors          ?? [],
      typical_fits:            body.typical_fits            ?? [],
      gender_focus:            body.gender_focus            ?? 'all',
      geo_region:              body.geo_region              ?? 'US',
      is_active:               body.is_active               ?? true,
      notes:                   body.notes                   ?? null,
    }).select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json({ brand: data });
  }

  // ── PUT: update a brand (toggle active, update fields) ─────────────────
  if (method === 'PUT') {
    const { id, ...updates } = req.body ?? {};
    if (!id) return res.status(400).json({ error: 'id required' });

    const allowed = [
      'name','slug','domain','shopify_base_url','shopify_collection_slugs',
      'is_shopify','price_tier','typical_price_min','typical_price_max',
      'aesthetic_tags','cultural_signals','typical_colors','typical_fits',
      'gender_focus','geo_region','is_active','notes',
    ];
    const payload = {};
    for (const key of allowed) {
      if (key in updates) payload[key] = updates[key];
    }
    payload.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('curated_brands').update(payload).eq('id', id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ brand: data });
  }

  // ── DELETE: soft-delete (set is_active = false) ────────────────────────
  if (method === 'DELETE') {
    const { id } = req.body ?? {};
    if (!id) return res.status(400).json({ error: 'id required' });
    const { error } = await supabase
      .from('curated_brands').update({ is_active: false, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
