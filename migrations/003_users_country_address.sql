-- Add country_code and address to users table.
-- country_code drives regional search results (SerpAPI gl= parameter).
-- address is for future shipping / order delivery.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS country_code TEXT NOT NULL DEFAULT 'us',
  ADD COLUMN IF NOT EXISTS address      TEXT;
