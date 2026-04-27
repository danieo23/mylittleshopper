-- Product feature cache: stores Claude Vision analysis results for product thumbnails.
-- Keyed on product_url (canonical product page URL) with a 7-day TTL.
-- Allows score_product_match to use real image-derived attributes instead of title regex.

create table if not exists product_embeddings (
  id            uuid primary key default gen_random_uuid(),
  product_url   text unique not null,
  image_url     text,
  item_type     text,
  dominant_colors   text[],
  secondary_colors  text[],
  fit_type      text,
  fabric        text,
  formality_score   integer,
  style_category    text,
  brand         text,
  occasion_suitability  text[],
  ocr_text      text,
  cultural_signals  text[],
  confidence    text,
  analyzed_at   timestamptz not null default now(),
  expires_at    timestamptz not null,
  created_at    timestamptz not null default now()
);

create index if not exists product_embeddings_url_idx
  on product_embeddings (product_url);

create index if not exists product_embeddings_expires_idx
  on product_embeddings (expires_at);

-- Style DNA synthesis status — lets frontend poll readiness after async synthesis.
alter table style_dna
  add column if not exists synthesis_status text not null default 'fresh';
