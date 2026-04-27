-- Curated brand catalog for product search.
-- Every product the agent recommends comes from a brand in this table.
-- Replacing open-ended Claude brand selection + SerpAPI Shopping with
-- a curated set of aesthetically tagged, Shopify-verified brands.

CREATE TABLE IF NOT EXISTS public.curated_brands (
  id                       UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name                     TEXT         NOT NULL UNIQUE,
  slug                     TEXT         NOT NULL UNIQUE,
  domain                   TEXT         NOT NULL,
  -- Full base URL used for Shopify catalog fetches (https://www.brand.com)
  shopify_base_url         TEXT,
  -- Brand-specific collection slugs tried in order before category defaults.
  -- Populated by the admin verification tool after confirming which slugs work.
  shopify_collection_slugs TEXT[]       NOT NULL DEFAULT '{}',
  is_shopify               BOOLEAN      NOT NULL DEFAULT TRUE,
  price_tier               TEXT         NOT NULL CHECK (price_tier IN ('budget', 'mid', 'premium', 'luxury')),
  typical_price_min        INTEGER,
  typical_price_max        INTEGER,
  -- Aesthetic tags: used for brand–profile matching (streetwear, minimal, coastal, etc.)
  aesthetic_tags           TEXT[]       NOT NULL DEFAULT '{}',
  -- Cultural signals: finer-grained identity markers (skate, surf, hip-hop, prep, etc.)
  cultural_signals         TEXT[]       NOT NULL DEFAULT '{}',
  typical_colors           TEXT[]       NOT NULL DEFAULT '{}',
  typical_fits             TEXT[]       NOT NULL DEFAULT '{}',
  -- mens | womens | unisex | all
  gender_focus             TEXT         NOT NULL DEFAULT 'all' CHECK (gender_focus IN ('mens', 'womens', 'unisex', 'all')),
  geo_region               TEXT         NOT NULL DEFAULT 'US',
  is_active                BOOLEAN      NOT NULL DEFAULT TRUE,
  notes                    TEXT,
  -- Set by the admin verification tool when a live catalog fetch succeeds.
  -- NULL means unverified or previously failed.
  last_verified_at         TIMESTAMPTZ,
  created_at               TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS curated_brands_slug_idx      ON public.curated_brands (slug);
CREATE        INDEX IF NOT EXISTS curated_brands_active_idx    ON public.curated_brands (is_active);
CREATE        INDEX IF NOT EXISTS curated_brands_tier_idx      ON public.curated_brands (price_tier);
CREATE        INDEX IF NOT EXISTS curated_brands_gender_idx    ON public.curated_brands (gender_focus);
-- GIN indexes for array containment queries (aesthetic_tags @> '{streetwear}')
CREATE        INDEX IF NOT EXISTS curated_brands_aesthetic_idx ON public.curated_brands USING GIN (aesthetic_tags);
CREATE        INDEX IF NOT EXISTS curated_brands_cultural_idx  ON public.curated_brands USING GIN (cultural_signals);
