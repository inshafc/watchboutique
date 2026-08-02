-- supabase/drafts-autosave.sql
-- Recovery-draft storage for new-entry forms (Add Watch, New Sale, invoice
-- editing). Holds raw, unsubmitted form state as jsonb only — never a
-- source of truth for any live money column. One draft per user per
-- module; a later autosave for the same module overwrites the earlier one.

create table drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  module text not null check (module in ('inventory','sale','invoice')),
  draft_data jsonb not null,
  updated_at timestamptz default now(),
  created_at timestamptz default now(),
  unique (user_id, module)
);

-- RLS — critical: this table can hold unsaved prices and investor splits.
-- Own-user only, both directions.
alter table drafts enable row level security;

create policy "own_drafts" on drafts
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
