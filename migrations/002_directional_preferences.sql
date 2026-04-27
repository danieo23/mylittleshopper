-- Directional preference signals derived from swap actions.
-- Each row captures one attribute that moved in a direction when a user swapped items.
-- Used as training data; the attribute delta is the learning signal.

create table if not exists directional_preferences (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references users(id) on delete cascade,
  attribute_name text not null,   -- e.g. 'fit_type', 'style_category', 'brand', 'color'
  from_value     text,            -- the attribute of the rejected item
  to_value       text,            -- the attribute of the chosen item
  created_at     timestamptz not null default now()
);

create index if not exists directional_preferences_user_idx
  on directional_preferences (user_id, created_at desc);
