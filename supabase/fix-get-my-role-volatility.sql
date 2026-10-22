-- Fix: get_my_role() was marked VOLATILE (Postgres's default), which means
-- the query planner can never cache or inline it within a single query.
-- Since it's called from 30 RLS policies across almost every table
-- (watches, clients, invoices, deals, invoice_items, invoice_payments,
-- app_settings, ...), every row-level security check on every row of every
-- query against those tables re-runs the full function body (an auth.uid()
-- call + a SELECT against profiles) from scratch — instead of once per
-- query. This is a well-documented Postgres/Supabase RLS performance trap:
-- https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select
--
-- STABLE is the correct, safe marking here: within a single statement the
-- function's result for a given session can't change (nothing in its body
-- writes anything, and a user's own role doesn't change mid-query), so the
-- planner can now evaluate it once per query instead of once per row.
--
-- This is a metadata-only change — no data is touched, nothing about who
-- can do what changes, and it's trivially reversible if something about
-- this assumption turns out to be wrong.

ALTER FUNCTION get_my_role() STABLE;

-- ── Missing indexes on hot foreign keys ──────────────────────────────────
-- Postgres never auto-indexes the referencing side of a foreign key (only
-- the referenced primary key is indexed). invoice_items.invoice_id and
-- invoice_payments.invoice_id back every invoice detail page's two biggest
-- queries (.eq('invoice_id', id)); invoices.client_id backs any client ->
-- invoices lookup. Small tables today, but free to fix now rather than
-- when they're not.

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id    ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice_id ON invoice_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id          ON invoices(client_id);

-- ── Verify afterward ───────────────────────────────────────────────────
-- select proname, provolatile from pg_proc where proname = 'get_my_role';
-- provolatile should now be 's' (stable), not 'v' (volatile).
--
-- select indexname from pg_indexes where tablename in
--   ('invoice_items', 'invoice_payments', 'invoices') order by 1;
