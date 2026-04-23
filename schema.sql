-- ─────────────────────────────────────────────────────────────────
--  mylilshopper — full database schema
--  Run this in Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────

-- Users (mirrors auth.users, stores app-level profile data)
create table if not exists users (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text,
  email       text,
  location    text,
  fit_preference text,
  onboarding_complete boolean default false,
  created_at  timestamptz default now()
);

-- Style DNA (one row per user, upserted on every synthesis)
create table if not exists style_dna (
  user_id                      uuid primary key references auth.users(id) on delete cascade,
  primary_colors               text[],
  secondary_colors             text[],
  avoided_colors               text[],
  dominant_fit                 text,
  fit_consistency_score        integer,
  primary_style_category       text,
  secondary_categories         text[],
  formality_range_min          integer,
  formality_range_max          integer,
  brand_affinities             text[],
  brand_rejections             text[],
  explicit_dislikes            jsonb default '{}',
  aspiration_gap               text[],
  per_category_price_sensitivity jsonb default '{}',
  overall_confidence_score     text default 'low',
  last_synthesized_at          timestamptz
);

-- Wardrobe items (uploaded photos, analyzed clothing pieces)
create table if not exists wardrobe_items (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete cascade,
  image_url       text not null,
  category        text default 'other',  -- tops/bottoms/shoes/outerwear/dress/accessories/other
  colors          text[],
  fit_type        text,
  formality_score integer,
  style_category  text,
  brand           text,
  fabric          text,
  occasion_suitability text[],
  analyzed        boolean default false,
  uploaded_at     timestamptz default now()
);

-- Aspiration items (Pinterest pins, inspo uploads — not owned)
create table if not exists aspiration_items (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete cascade,
  source_type     text not null,  -- 'pinterest' | 'inspiration_upload'
  image_url       text not null,
  category        text,
  colors          text[],
  fit_type        text,
  formality_score integer,
  style_category  text,
  brand           text,
  analyzed_at     timestamptz default now()
);

-- Style profiles (onboarding answers — preferences and stated info)
create table if not exists style_profiles (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid references auth.users(id) on delete cascade,
  budget_tier         text,    -- 'low' | 'mid' | 'high'
  favorite_stores     text[],
  style_tags          text[],
  color_palettes      text[],
  learned_tags        text[],
  pinterest_board_url text,
  sizes               jsonb default '{}',
  created_at          timestamptz default now()
);

-- Orders
create table if not exists orders (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references auth.users(id) on delete cascade,
  items_json        jsonb not null,
  total_price       numeric not null,
  occasion          text,
  status            text default 'placed',  -- placed | delivered | cancelled
  followup_sent_at  timestamptz,
  followup_response text,
  created_at        timestamptz default now(),
  delivered_at      timestamptz
);

-- Feedback signals (every approval, rejection, swap, post-delivery)
create table if not exists feedback_signals (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid references auth.users(id) on delete cascade,
  signal_type           text not null,  -- approval | rejection | swap | post_delivery_positive | post_delivery_negative
  item_attributes_json  jsonb,
  inferred_reason       text,
  created_at            timestamptz default now()
);

-- Wallet
create table if not exists wallet (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  balance    numeric default 0,
  updated_at timestamptz default now()
);

-- Transactions
create table if not exists transactions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade,
  type        text not null,   -- 'credit' | 'debit'
  amount      numeric not null,
  description text,
  created_at  timestamptz default now()
);

-- ─── Migrations (run after initial schema if upgrading) ──────────

-- Multi-board Pinterest support (replaces single pinterest_board_url)
alter table style_profiles add column if not exists pinterest_board_urls text[] default '{}';

-- Owned-outfit Pinterest boards (treated as wardrobe in DNA synthesis)
alter table style_profiles add column if not exists wardrobe_board_urls text[] default '{}';

-- Pin-level source tracking + shopping results cache
alter table aspiration_items add column if not exists source_url text;
alter table aspiration_items add column if not exists shopping_results jsonb;

-- ─── Row Level Security ───────────────────────────────────────────

alter table users              enable row level security;
alter table style_dna          enable row level security;
alter table wardrobe_items     enable row level security;
alter table aspiration_items   enable row level security;
alter table style_profiles     enable row level security;
alter table orders             enable row level security;
alter table feedback_signals   enable row level security;
alter table wallet             enable row level security;
alter table transactions       enable row level security;

-- Users can only access their own data
create policy "own data" on users            for all using (auth.uid() = id);
create policy "own data" on style_dna        for all using (auth.uid() = user_id);
create policy "own data" on wardrobe_items   for all using (auth.uid() = user_id);
create policy "own data" on aspiration_items for all using (auth.uid() = user_id);
create policy "own data" on style_profiles   for all using (auth.uid() = user_id);
create policy "own data" on orders           for all using (auth.uid() = user_id);
create policy "own data" on feedback_signals for all using (auth.uid() = user_id);
create policy "own data" on wallet           for all using (auth.uid() = user_id);
create policy "own data" on transactions     for all using (auth.uid() = user_id);

-- Auto-create wallet row when user signs up
create or replace function create_user_wallet()
returns trigger language plpgsql security definer as $$
begin
  insert into wallet (user_id, balance) values (new.id, 0) on conflict do nothing;
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure create_user_wallet();
