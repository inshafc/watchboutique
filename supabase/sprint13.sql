-- Sprint 13: Sourced watch integration & invoice client linking
-- Run this in the Supabase SQL editor

-- Add sourced_watch_id to invoices for linking back to the sourced watch
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS sourced_watch_id uuid
  REFERENCES watches(id) ON DELETE SET NULL;

-- Allow 'sourced' as a valid watch_status value
ALTER TABLE watches DROP CONSTRAINT IF EXISTS watches_watch_status_check;
ALTER TABLE watches ADD CONSTRAINT watches_watch_status_check
  CHECK (watch_status IN ('Available','On Hold','Offered','Sold','Consigned','sourced'));
