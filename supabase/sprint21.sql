-- Sprint 21: Amount invested per investor

ALTER TABLE investor_names ADD COLUMN IF NOT EXISTS amount_invested decimal(15,2) DEFAULT 0;

-- ============================================================
-- MANUAL — run by hand in the Supabase SQL editor
-- TWB / The Watch Boutique is the business itself, not an investor.
-- Confirmed live: investor_names has key='TWB', display_name='The Watch Boutique'.
-- The app now filters TWB out of investor stats/UI, but the row itself
-- should also be deleted so it can never resurface (e.g. via dropdowns
-- that read investor_names directly).
-- ============================================================
DELETE FROM investor_names WHERE key = 'TWB' OR key = 'twb';

-- Remove TWB default rows from watches that have NO other investor splits
-- (these are fully TWB-owned watches that got auto-assigned TWB at 100%)
DELETE FROM watch_investors
WHERE investor_name IN ('TWB', 'twb')
AND watch_id NOT IN (
  SELECT DISTINCT watch_id
  FROM watch_investors
  WHERE investor_name NOT IN ('TWB', 'twb')
);

-- Remove TWB from investor_names reference table
DELETE FROM investor_names
WHERE key IN ('TWB', 'twb')
OR display_name ILIKE '%watch boutique%';
