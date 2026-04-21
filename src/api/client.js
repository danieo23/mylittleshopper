import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── Generic entity helper ────────────────────────────────────────
function entity(tableName) {
  return {
    async list(orderBy = 'created_at', limit = 50) {
      const col = orderBy.startsWith('-') ? orderBy.slice(1) : orderBy;
      const asc = !orderBy.startsWith('-');
      const { data, error } = await supabase
        .from(tableName).select('*')
        .order(col, { ascending: asc }).limit(limit);
      if (error) throw error;
      return data;
    },

    async filter(filters = {}, orderBy = 'created_at', limit = 50) {
      const col = orderBy.startsWith('-') ? orderBy.slice(1) : orderBy;
      const asc = !orderBy.startsWith('-');
      let q = supabase.from(tableName).select('*');
      Object.entries(filters).forEach(([k, v]) => { q = q.eq(k, v); });
      const { data, error } = await q.order(col, { ascending: asc }).limit(limit);
      if (error) throw error;
      return data;
    },

    async get(id) {
      const { data, error } = await supabase
        .from(tableName).select('*').eq('id', id).single();
      if (error) throw error;
      return data;
    },

    async create(payload) {
      const { data, error } = await supabase
        .from(tableName).insert(payload).select().single();
      if (error) throw error;
      return data;
    },

    async update(id, payload) {
      const { data, error } = await supabase
        .from(tableName).update(payload).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },

    async delete(id) {
      const { error } = await supabase.from(tableName).delete().eq('id', id);
      if (error) throw error;
    },
  };
}

// ─── Auth ─────────────────────────────────────────────────────────
export const auth = {
  async me() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) throw error ?? new Error('Not authenticated');
    return {
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name ?? user.email,
    };
  },

  async isAuthenticated() {
    const { data: { session } } = await supabase.auth.getSession();
    return !!session;
  },

  async logout() {
    await supabase.auth.signOut();
    window.location.href = '/';
  },

  redirectToLogin(nextUrl = '/dashboard') {
    window.location.href = `/login?next=${encodeURIComponent(nextUrl)}`;
  },
};

// ─── File upload (Supabase Storage) ──────────────────────────────
async function uploadFile({ file, bucket = 'wardrobe' }) {
  const ext = file.name.split('.').pop();
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file);
  if (error) throw error;
  const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);
  return { file_url: publicUrl };
}

// ─── Named export matching base44 import shape ────────────────────
export const base44 = {
  auth,
  entities: {
    StyleProfile:  entity('style_profiles'),
    WardrobeItem:  entity('wardrobe_items'),
    ShopRequest:   entity('shop_requests'),
    CartItem:      entity('cart_items'),
  },
  integrations: {
    Core: { UploadFile: uploadFile },
  },
};
