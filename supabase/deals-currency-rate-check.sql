-- supabase/deals-currency-rate-check.sql
-- Enforce at the DB level what AddDealForm/EditDealForm already enforce in
-- the UI: a non-LKR deal must carry a positive exchange_rate. Client-side
-- validation alone left a hole — components/deals/DealDetailActions.tsx and
-- components/deals/DealList.tsx both insert duplicate deals directly via
-- supabase.from('deals').insert(...), bypassing both forms' checks.
--
-- Verified before writing this migration: 0 of 36 existing deals rows would
-- violate this constraint (checked via a live SELECT — no currency != 'LKR'
-- rows exist yet, so nothing needs to be fixed up first).

ALTER TABLE deals
  ADD CONSTRAINT deals_currency_rate_check
  CHECK (currency = 'LKR' OR (exchange_rate IS NOT NULL AND exchange_rate > 0));
