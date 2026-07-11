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
