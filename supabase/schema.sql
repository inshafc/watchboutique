-- ============================================================
-- WatchBoutique ERP — Sprint 1 Schema
-- Run this in the Supabase SQL editor (fresh database)
-- For existing Sprint 1 databases, see the ALTER statement below
-- ============================================================

-- Enum types
-- NOTE: 'Brand New' added in Sprint 1 redesign
CREATE TYPE watch_condition  AS ENUM ('Brand New', 'Excellent', 'Good', 'Fair', 'Poor');
CREATE TYPE watch_set_details AS ENUM ('Box and Papers', 'Box and Watch', 'Watch Only');
CREATE TYPE watch_status     AS ENUM ('Available', 'On Hold', 'Sold', 'Consigned');

-- ── If upgrading an existing database, run this instead of the CREATE TYPE above:
-- ALTER TYPE watch_condition ADD VALUE 'Brand New' BEFORE 'Excellent';

-- watches
CREATE TABLE watches (
  id             uuid          DEFAULT gen_random_uuid() PRIMARY KEY,
  watch_name     text          NOT NULL,
  reference      text,
  serial_number  text,
  date_on_card   date,
  -- year is derived: EXTRACT(YEAR FROM date_on_card)
  condition      watch_condition   NOT NULL,
  set_details    watch_set_details NOT NULL,
  purchased_from text,
  purchase_cost  decimal(12, 2),
  currency       text          DEFAULT 'LKR',
  status         watch_status  NOT NULL DEFAULT 'Available',
  selling_price  decimal(12, 2),
  comments       text,
  photos         text[]        DEFAULT '{}',
  -- max 4 photos enforced in app layer; stored as Supabase Storage public URLs
  created_at     timestamptz   DEFAULT now()
);

-- watch_investors
CREATE TABLE watch_investors (
  id             uuid          DEFAULT gen_random_uuid() PRIMARY KEY,
  watch_id       uuid          NOT NULL REFERENCES watches(id) ON DELETE CASCADE,
  investor_name  text          NOT NULL,
  percentage     decimal(5, 2) NOT NULL CHECK (percentage > 0 AND percentage <= 100)
  -- percentages must total 100 per watch — enforced in app layer
);

-- ============================================================
-- Row Level Security
-- Auth is added in Sprint 2. Open policies for now.
-- ============================================================
ALTER TABLE watches         ENABLE ROW LEVEL SECURITY;
ALTER TABLE watch_investors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_all_watches"    ON watches         FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "staff_all_investors"  ON watch_investors FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- Storage
-- The "watch-photos" bucket must be created manually:
-- Supabase Dashboard → Storage → New bucket
--   Name: watch-photos
--   Public: YES (required for public image URLs)
-- ============================================================
