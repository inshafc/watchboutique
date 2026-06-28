-- Sprint 18: Tighten RLS — require authenticated role on all app tables
-- Run in Supabase SQL editor after sprint17.sql

-- ── Tables that already have RLS enabled — update policies ───────────────────

-- watches
DROP POLICY IF EXISTS "staff_all_watches" ON watches;
CREATE POLICY "authenticated_all_watches" ON watches
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- watch_investors
DROP POLICY IF EXISTS "staff_all_investors" ON watch_investors;
CREATE POLICY "authenticated_all_watch_investors" ON watch_investors
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- clients
DROP POLICY IF EXISTS "staff_all_clients" ON clients;
CREATE POLICY "authenticated_all_clients" ON clients
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- wishlists
DROP POLICY IF EXISTS "staff_all_wishlists" ON wishlists;
CREATE POLICY "authenticated_all_wishlists" ON wishlists
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- contact_log
DROP POLICY IF EXISTS "staff_all_contact_log" ON contact_log;
CREATE POLICY "authenticated_all_contact_log" ON contact_log
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- deals
DROP POLICY IF EXISTS "open_deals" ON deals;
CREATE POLICY "authenticated_all_deals" ON deals
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- installments
DROP POLICY IF EXISTS "open_installments" ON installments;
CREATE POLICY "authenticated_all_installments" ON installments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- trade_ins
DROP POLICY IF EXISTS "open_trade_ins" ON trade_ins;
CREATE POLICY "authenticated_all_trade_ins" ON trade_ins
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- targets
DROP POLICY IF EXISTS "staff_all_targets" ON targets;
CREATE POLICY "authenticated_all_targets" ON targets
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- sales_managers
DROP POLICY IF EXISTS "staff_all_sales_managers" ON sales_managers;
CREATE POLICY "authenticated_all_sales_managers" ON sales_managers
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- deal_expenses
DROP POLICY IF EXISTS "staff_all_deal_expenses" ON deal_expenses;
CREATE POLICY "authenticated_all_deal_expenses" ON deal_expenses
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- sourced_orders
DROP POLICY IF EXISTS "staff_all_sourced_orders" ON sourced_orders;
CREATE POLICY "authenticated_all_sourced_orders" ON sourced_orders
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- investor_names
DROP POLICY IF EXISTS "staff_all_investor_names" ON investor_names;
CREATE POLICY "authenticated_all_investor_names" ON investor_names
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- kpi_targets
DROP POLICY IF EXISTS "staff_all_kpi_targets" ON kpi_targets;
CREATE POLICY "authenticated_all_kpi_targets" ON kpi_targets
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- sales_manager_targets
DROP POLICY IF EXISTS "staff_all_sm_targets" ON sales_manager_targets;
CREATE POLICY "authenticated_all_sm_targets" ON sales_manager_targets
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── Tables without RLS — enable it and add policies ──────────────────────────

ALTER TABLE brands        ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_banks   ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices      ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_all_brands"        ON brands;
DROP POLICY IF EXISTS "authenticated_all_saved_banks"   ON saved_banks;
DROP POLICY IF EXISTS "authenticated_all_invoices"      ON invoices;
DROP POLICY IF EXISTS "authenticated_all_invoice_items" ON invoice_items;

CREATE POLICY "authenticated_all_brands" ON brands
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_all_saved_banks" ON saved_banks
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_all_invoices" ON invoices
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_all_invoice_items" ON invoice_items
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── Storage: watch-photos bucket — authenticated upload, public read ──────────
-- Run only if the watch-photos bucket exists

INSERT INTO storage.buckets (id, name, public)
VALUES ('watch-photos', 'watch-photos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Authenticated can upload watch photos"  ON storage.objects;
DROP POLICY IF EXISTS "Public can read watch photos"           ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can update watch photos"  ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can delete watch photos"  ON storage.objects;

CREATE POLICY "Authenticated can upload watch photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'watch-photos');

CREATE POLICY "Public can read watch photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'watch-photos');

CREATE POLICY "Authenticated can update watch photos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'watch-photos');

CREATE POLICY "Authenticated can delete watch photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'watch-photos');
