-- ============================================================
-- WatchBoutique ERP — Sprint 2b: Expanded Client Fields
-- Run this in the Supabase SQL editor
-- ============================================================

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS address       text,
  ADD COLUMN IF NOT EXISTS lead_referral text,
  ADD COLUMN IF NOT EXISTS client_type   text,
  ADD COLUMN IF NOT EXISTS sales_manager text,
  ADD COLUMN IF NOT EXISTS profile_notes text,
  ADD COLUMN IF NOT EXISTS avatar_color  text;

-- lead_referral: 'Socials' | 'Referral' | 'Website' | 'Hotline'
-- client_type:   'Retail'  | 'Reseller'
-- avatar_color:  Tailwind class string, e.g. 'bg-sky-100 text-sky-600'
-- profile_notes: replaces/alongside the original 'notes' field
