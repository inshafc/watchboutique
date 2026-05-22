-- Sprint 8 — Inventory module improvements
ALTER TABLE watches ADD COLUMN IF NOT EXISTS is_draft boolean DEFAULT false;
