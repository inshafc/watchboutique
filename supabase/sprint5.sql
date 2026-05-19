-- Sprint 5 — soft-delete columns
-- Run once in the Supabase SQL editor.

ALTER TABLE watches ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE deals   ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
