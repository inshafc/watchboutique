-- Sprint 23: Invoicing data-layer rebuild
-- Run in the Supabase SQL editor, top to bottom, in one sitting.
--
-- CONTEXT — resolves 4 conflicts between the requested schema and what's
-- actually live (see the audit given alongside this file):
--   1. There is no `sales` table — the real transaction entity is `deals`.
--      invoices.deal_id already exists and is kept; no sale_id is added.
--   2. `invoices.type` ('sale' | 'general' | 'sourcing') is a BUSINESS-type
--      column that sourced_orders depends on. doc_type ('proforma' |
--      'invoice' | 'credit_note') is a different axis — the DOCUMENT kind —
--      so it is ADDED alongside `type`, not instead of it.
--   3. client_name/address/phone are renamed to bill_to_* (the "snapshot at
--      issue time" fields this sprint asks for), plus a new bill_to_email.
--   4. The old status enum had 'overdue'; the new one does not (status now
--      derives purely from payments). Existing 'overdue' rows backfill to
--      'issued' — overdue-ness becomes a UI-computed thing (due date vs.
--      today) if it's wanted later, not a stored state.
--
-- Idempotent throughout — every ALTER/CREATE uses IF NOT EXISTS / IF EXISTS
-- / OR REPLACE / DROP POLICY IF EXISTS, so re-running this file is safe.

-- ════════════════════════════════════════════════════════════════════════
-- STAGE 1 — SCHEMA
-- ════════════════════════════════════════════════════════════════════════

-- ── invoices: rename client_* → bill_to_*, add doc_type + snapshot/lock
--    columns ──────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'client_name') THEN
    ALTER TABLE invoices RENAME COLUMN client_name TO bill_to_name;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'client_address') THEN
    ALTER TABLE invoices RENAME COLUMN client_address TO bill_to_address;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'client_phone') THEN
    ALTER TABLE invoices RENAME COLUMN client_phone TO bill_to_phone;
  END IF;
END $$;

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS bill_to_email      text,
  ADD COLUMN IF NOT EXISTS doc_type           text NOT NULL DEFAULT 'invoice',
  ADD COLUMN IF NOT EXISTS subtotal           decimal(14,2),
  ADD COLUMN IF NOT EXISTS discount           decimal(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total              decimal(14,2),
  ADD COLUMN IF NOT EXISTS total_lkr          decimal(14,2),
  ADD COLUMN IF NOT EXISTS bank_snapshot      jsonb,
  ADD COLUMN IF NOT EXISTS related_invoice_id uuid REFERENCES invoices(id),
  ADD COLUMN IF NOT EXISTS issued_at          timestamptz,
  ADD COLUMN IF NOT EXISTS issued_by          uuid REFERENCES profiles(id);

ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_doc_type_check;
ALTER TABLE invoices ADD CONSTRAINT invoices_doc_type_check
  CHECK (doc_type IN ('proforma', 'invoice', 'credit_note'));

-- terms_and_conditions (sprint11b.sql) already covers the "terms" field
-- asked for — no duplicate column added.

-- ── invoices: new status enum (draft | issued | partially_paid | paid |
--    cancelled), replacing draft | advance_paid | paid_in_full | overdue ──
-- Backfilled in Stage 2 BEFORE the constraint below is applied, so existing
-- rows never violate it.

-- ── invoice_items: relational line items — add the columns the JSONB
--    mirror never had, keep reference/serial_number/photo_url/sort_order
--    as-is (sound, reused), rename watch_name → description, amount →
--    line_total, add watch_id FK, quantity, unit_price ────────────────────

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoice_items' AND column_name = 'watch_name') THEN
    ALTER TABLE invoice_items RENAME COLUMN watch_name TO description;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoice_items' AND column_name = 'amount') THEN
    ALTER TABLE invoice_items RENAME COLUMN amount TO line_total;
  END IF;
END $$;

ALTER TABLE invoice_items
  ADD COLUMN IF NOT EXISTS quantity   int DEFAULT 1,
  ADD COLUMN IF NOT EXISTS unit_price decimal(14,2);

ALTER TABLE invoice_items DROP CONSTRAINT IF EXISTS invoice_items_watch_id_fkey;
ALTER TABLE invoice_items ADD CONSTRAINT invoice_items_watch_id_fkey
  FOREIGN KEY (watch_id) REFERENCES watches(id);

-- ── invoice_payments — new, append-only ledger ─────────────────────────────

CREATE TABLE IF NOT EXISTS invoice_payments (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id    uuid NOT NULL REFERENCES invoices(id),
  amount        decimal(14,2) NOT NULL,
  currency      text NOT NULL,
  exchange_rate decimal(12,4) NOT NULL DEFAULT 1,
  amount_lkr    decimal(14,2) NOT NULL,
  method        text,
  reference     text,
  paid_at       date NOT NULL,
  recorded_by   uuid REFERENCES profiles(id),
  notes         text,
  created_at    timestamptz DEFAULT now()
);

-- ── invoice_counters — gapless numbering, locked FOR UPDATE by
--    issue_invoice() below. No RLS policy is defined for it further down,
--    which (with RLS enabled) locks it to nobody except SECURITY DEFINER
--    functions — exactly right for a counter that must never be touched
--    by hand ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS invoice_counters (
  prefix      text NOT NULL,
  year        int  NOT NULL,
  last_number int  NOT NULL DEFAULT 0,
  PRIMARY KEY (prefix, year)
);

ALTER TABLE invoice_counters ENABLE ROW LEVEL SECURITY;

-- ════════════════════════════════════════════════════════════════════════
-- STAGE 2 — BACKFILL
-- ════════════════════════════════════════════════════════════════════════

-- ── Status: map old values onto the new enum before the CHECK is added ──

UPDATE invoices SET status = 'issued' WHERE status IN ('advance_paid', 'overdue');
UPDATE invoices SET status = 'paid'   WHERE status = 'paid_in_full';
-- advance_paid/overdue rows that already have money in (amount_paid or,
-- for sourcing invoices, advance_paid) are really partially_paid:
UPDATE invoices SET status = 'partially_paid'
WHERE status = 'issued' AND COALESCE(amount_paid, advance_paid, 0) > 0;

ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check;
ALTER TABLE invoices ADD CONSTRAINT invoices_status_check
  CHECK (status IN ('draft', 'issued', 'partially_paid', 'paid', 'cancelled'));

-- ── issued_at / issued_by: every pre-existing row already has a number,
--    so under the new model it was effectively issued at creation time ──

UPDATE invoices SET issued_at = created_at WHERE issued_at IS NULL AND status <> 'draft';

-- ── subtotal / total / total_lkr: derive from invoice_items.line_total
--    (now populated below) per invoice, for every already-numbered row ──

UPDATE invoice_items SET unit_price = line_total WHERE unit_price IS NULL;

WITH sums AS (
  SELECT invoice_id, COALESCE(SUM(line_total), 0) AS s
  FROM invoice_items
  GROUP BY invoice_id
)
UPDATE invoices i
SET subtotal  = COALESCE(sums.s, 0),
    total     = COALESCE(sums.s, 0) - COALESCE(i.discount, 0),
    total_lkr = (COALESCE(sums.s, 0) - COALESCE(i.discount, 0))
                * CASE WHEN i.currency = 'LKR' THEN 1 ELSE COALESCE(i.exchange_rate, 1) END
FROM sums
WHERE i.id = sums.invoice_id AND i.subtotal IS NULL;

UPDATE invoices SET subtotal = 0, total = 0, total_lkr = 0
WHERE subtotal IS NULL;

-- ── bank_snapshot: freeze whatever saved_banks row each invoice currently
--    points to, since bank_id used to be a live reference ────────────────

UPDATE invoices i
SET bank_snapshot = (
  SELECT jsonb_build_object(
    'bank_name', b.bank_name, 'account_name', b.account_name,
    'account_number', b.account_number, 'branch', b.branch,
    'swift_code', b.swift_code, 'address', b.address
  )
  FROM saved_banks b WHERE b.id = i.bank_id
)
WHERE i.bank_id IS NOT NULL AND i.bank_snapshot IS NULL;

-- ── invoice_payments: one row per legacy amount_paid/advance_paid value,
--    clearly marked as migrated rather than a real recorded payment ──────

INSERT INTO invoice_payments (invoice_id, amount, currency, exchange_rate, amount_lkr, method, paid_at, notes)
SELECT id,
       COALESCE(amount_paid, advance_paid),
       currency,
       COALESCE(exchange_rate, 1),
       COALESCE(amount_paid, advance_paid) * CASE WHEN currency = 'LKR' THEN 1 ELSE COALESCE(exchange_rate, 1) END,
       payment_method,
       COALESCE(date, created_at::date),
       'Migrated from legacy amount_paid/advance_paid column (sprint23)'
FROM invoices
WHERE COALESCE(amount_paid, advance_paid) IS NOT NULL
  AND COALESCE(amount_paid, advance_paid) > 0
  AND NOT EXISTS (
    SELECT 1 FROM invoice_payments p
    WHERE p.invoice_id = invoices.id AND p.notes LIKE 'Migrated from legacy%'
  );

-- status, now that payments exist, re-derived once more for correctness:
UPDATE invoices i SET status = 'paid'
WHERE i.status = 'partially_paid'
  AND i.total_lkr > 0
  AND (SELECT COALESCE(SUM(amount_lkr), 0) FROM invoice_payments p WHERE p.invoice_id = i.id) >= i.total_lkr;

-- ── invoice_counters: seed last_number per prefix/year from the highest
--    TWB-YYYY-NNNN already issued, so future numbers never collide with
--    history ─────────────────────────────────────────────────────────────

INSERT INTO invoice_counters (prefix, year, last_number)
SELECT split_part(invoice_number, '-', 1),
       split_part(invoice_number, '-', 2)::int,
       MAX(split_part(invoice_number, '-', 3)::int)
FROM invoices
WHERE invoice_number SIMILAR TO '[A-Za-z]+-[0-9]{4}-[0-9]+'
GROUP BY split_part(invoice_number, '-', 1), split_part(invoice_number, '-', 2)::int
ON CONFLICT (prefix, year) DO UPDATE SET last_number = GREATEST(invoice_counters.last_number, EXCLUDED.last_number);

-- ════════════════════════════════════════════════════════════════════════
-- STAGE 3 — FUNCTIONS
-- ════════════════════════════════════════════════════════════════════════

-- ── issue_invoice(): the ONLY path that assigns an invoice_number. Locks
--    the counter row FOR UPDATE so two concurrent issues can never collide
--    (the bug sprint10b.sql had to clean up after). SECURITY DEFINER so it
--    can flip status/issued_at/issued_by even though the RLS policy below
--    only lets an enterer UPDATE a row while it is still 'draft' ─────────

CREATE OR REPLACE FUNCTION issue_invoice(p_invoice_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role       text := get_my_role();
  v_doc_type   text;
  v_status     text;
  v_year       int := EXTRACT(YEAR FROM now())::int;
  v_prefix     text;
  v_next       int;
  v_number     text;
BEGIN
  IF auth.uid() IS NULL OR v_role NOT IN ('super_admin', 'enterer') THEN
    RAISE EXCEPTION 'Not authorized to issue invoices';
  END IF;

  SELECT doc_type, status INTO v_doc_type, v_status
  FROM invoices WHERE id = p_invoice_id AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice not found';
  END IF;
  IF v_status <> 'draft' THEN
    RAISE EXCEPTION 'Only a draft can be issued';
  END IF;

  SELECT COALESCE(value, 'TWB') INTO v_prefix FROM app_settings WHERE key = 'invoice_number_prefix';
  IF v_doc_type = 'credit_note' THEN
    v_prefix := v_prefix || '-CN';
  END IF;

  INSERT INTO invoice_counters (prefix, year, last_number) VALUES (v_prefix, v_year, 0)
    ON CONFLICT (prefix, year) DO NOTHING;

  UPDATE invoice_counters
  SET last_number = last_number + 1
  WHERE prefix = v_prefix AND year = v_year
  RETURNING last_number INTO v_next;

  v_number := v_prefix || '-' || v_year::text || '-' || LPAD(v_next::text, 4, '0');

  UPDATE invoices
  SET invoice_number = v_number, status = 'issued', issued_at = now(), issued_by = auth.uid()
  WHERE id = p_invoice_id;

  RETURN v_number;
END;
$$;

REVOKE ALL ON FUNCTION issue_invoice(uuid) FROM public;
GRANT EXECUTE ON FUNCTION issue_invoice(uuid) TO authenticated;

-- ── record_invoice_payment(): append-only insert + status re-derivation.
--    SECURITY DEFINER for the same reason as above — recording a payment
--    must be able to update invoices.status on a non-draft row ───────────

CREATE OR REPLACE FUNCTION record_invoice_payment(
  p_invoice_id   uuid,
  p_amount       decimal,
  p_currency     text,
  p_exchange_rate decimal,
  p_method       text,
  p_reference    text,
  p_paid_at      date,
  p_notes        text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role     text := get_my_role();
  v_status   text;
  v_total    decimal;
  v_paid     decimal;
  v_payment_id uuid;
  v_amount_lkr decimal;
BEGIN
  IF auth.uid() IS NULL OR v_role NOT IN ('super_admin', 'enterer') THEN
    RAISE EXCEPTION 'Not authorized to record payments';
  END IF;

  SELECT status, total_lkr INTO v_status, v_total FROM invoices WHERE id = p_invoice_id AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice not found';
  END IF;
  IF v_status NOT IN ('issued', 'partially_paid') THEN
    RAISE EXCEPTION 'Payments can only be recorded on an issued invoice';
  END IF;
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be greater than 0';
  END IF;

  v_amount_lkr := p_amount * CASE WHEN p_currency = 'LKR' THEN 1 ELSE COALESCE(p_exchange_rate, 1) END;

  INSERT INTO invoice_payments (invoice_id, amount, currency, exchange_rate, amount_lkr, method, reference, paid_at, recorded_by, notes)
  VALUES (p_invoice_id, p_amount, p_currency, COALESCE(p_exchange_rate, 1), v_amount_lkr, p_method, p_reference, p_paid_at, auth.uid(), p_notes)
  RETURNING id INTO v_payment_id;

  SELECT COALESCE(SUM(amount_lkr), 0) INTO v_paid FROM invoice_payments WHERE invoice_id = p_invoice_id;

  UPDATE invoices
  SET status = CASE
    WHEN v_total > 0 AND v_paid >= v_total THEN 'paid'
    WHEN v_paid > 0 THEN 'partially_paid'
    ELSE 'issued'
  END
  WHERE id = p_invoice_id;

  RETURN v_payment_id;
END;
$$;

REVOKE ALL ON FUNCTION record_invoice_payment(uuid, decimal, text, decimal, text, text, date, text) FROM public;
GRANT EXECUTE ON FUNCTION record_invoice_payment(uuid, decimal, text, decimal, text, text, date, text) TO authenticated;

-- ── create_credit_note(): starts a draft credit note linked to an issued
--    invoice, snapshotting its bill-to/currency/bank so the enterer only
--    has to add the (negative) line items before issuing it ─────────────

CREATE OR REPLACE FUNCTION create_credit_note(p_related_invoice_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text := get_my_role();
  v_src  invoices%ROWTYPE;
  v_new_id uuid;
BEGIN
  IF auth.uid() IS NULL OR v_role NOT IN ('super_admin', 'enterer') THEN
    RAISE EXCEPTION 'Not authorized to create credit notes';
  END IF;

  SELECT * INTO v_src FROM invoices WHERE id = p_related_invoice_id AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice not found';
  END IF;
  IF v_src.status = 'draft' THEN
    RAISE EXCEPTION 'Cannot credit a draft invoice — it has not been issued';
  END IF;

  INSERT INTO invoices (
    doc_type, type, status, client_id, bill_to_name, bill_to_address, bill_to_phone, bill_to_email,
    deal_id, currency, exchange_rate, bank_id, bank_snapshot, related_invoice_id
  ) VALUES (
    'credit_note', v_src.type, 'draft', v_src.client_id, v_src.bill_to_name, v_src.bill_to_address, v_src.bill_to_phone, v_src.bill_to_email,
    v_src.deal_id, v_src.currency, v_src.exchange_rate, v_src.bank_id, v_src.bank_snapshot, p_related_invoice_id
  )
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$;

REVOKE ALL ON FUNCTION create_credit_note(uuid) FROM public;
GRANT EXECUTE ON FUNCTION create_credit_note(uuid) TO authenticated;

-- ════════════════════════════════════════════════════════════════════════
-- STAGE 4 — RLS
-- ════════════════════════════════════════════════════════════════════════
-- super_admin: full access, everywhere.
-- enterer: create drafts; edit only while draft (issuing/payments go through
--   the SECURITY DEFINER functions above, which bypass this restriction);
--   never update/delete a payment once recorded (append-only ledger).
-- viewer: read-only. Purchase cost is never selected on invoice screens in
--   the app (it lives on watches.purchase_cost), so no column-level rule is
--   needed for that — enforced by the queries, same as it is today.

ALTER TABLE invoices        ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_all_invoices"      ON invoices;
DROP POLICY IF EXISTS "authenticated_all_invoice_items" ON invoice_items;

DROP POLICY IF EXISTS "super_admin_all_invoices" ON invoices;
CREATE POLICY "super_admin_all_invoices" ON invoices
  FOR ALL TO authenticated USING (get_my_role() = 'super_admin') WITH CHECK (get_my_role() = 'super_admin');

DROP POLICY IF EXISTS "viewer_read_invoices" ON invoices;
CREATE POLICY "viewer_read_invoices" ON invoices
  FOR SELECT TO authenticated USING (get_my_role() IN ('viewer', 'enterer'));

DROP POLICY IF EXISTS "enterer_insert_invoices" ON invoices;
CREATE POLICY "enterer_insert_invoices" ON invoices
  FOR INSERT TO authenticated WITH CHECK (get_my_role() = 'enterer' AND status = 'draft');

DROP POLICY IF EXISTS "enterer_update_draft_invoices" ON invoices;
CREATE POLICY "enterer_update_draft_invoices" ON invoices
  FOR UPDATE TO authenticated
  USING (get_my_role() = 'enterer' AND status = 'draft')
  WITH CHECK (get_my_role() = 'enterer' AND status = 'draft');

DROP POLICY IF EXISTS "super_admin_all_invoice_items" ON invoice_items;
CREATE POLICY "super_admin_all_invoice_items" ON invoice_items
  FOR ALL TO authenticated USING (get_my_role() = 'super_admin') WITH CHECK (get_my_role() = 'super_admin');

DROP POLICY IF EXISTS "viewer_read_invoice_items" ON invoice_items;
CREATE POLICY "viewer_read_invoice_items" ON invoice_items
  FOR SELECT TO authenticated USING (get_my_role() IN ('viewer', 'enterer'));

DROP POLICY IF EXISTS "enterer_write_draft_invoice_items" ON invoice_items;
CREATE POLICY "enterer_write_draft_invoice_items" ON invoice_items
  FOR ALL TO authenticated
  USING (get_my_role() = 'enterer' AND EXISTS (SELECT 1 FROM invoices i WHERE i.id = invoice_items.invoice_id AND i.status = 'draft'))
  WITH CHECK (get_my_role() = 'enterer' AND EXISTS (SELECT 1 FROM invoices i WHERE i.id = invoice_items.invoice_id AND i.status = 'draft'));

DROP POLICY IF EXISTS "super_admin_all_invoice_payments" ON invoice_payments;
CREATE POLICY "super_admin_all_invoice_payments" ON invoice_payments
  FOR ALL TO authenticated USING (get_my_role() = 'super_admin') WITH CHECK (get_my_role() = 'super_admin');

DROP POLICY IF EXISTS "read_invoice_payments" ON invoice_payments;
CREATE POLICY "read_invoice_payments" ON invoice_payments
  FOR SELECT TO authenticated USING (get_my_role() IN ('viewer', 'enterer'));

DROP POLICY IF EXISTS "enterer_insert_invoice_payments" ON invoice_payments;
CREATE POLICY "enterer_insert_invoice_payments" ON invoice_payments
  FOR INSERT TO authenticated WITH CHECK (get_my_role() = 'enterer');

-- invoice_counters: RLS is enabled above with NO policies defined — every
-- role, including super_admin, is blocked from touching it directly.
-- Only the SECURITY DEFINER functions (which run as the table owner and
-- bypass RLS) can read or increment it.

-- ── activity_log.action_type: widen the CHECK (sprint20.sql) to allow the
--    3 new action types the UI logs for issuing/payments/credit notes ────

ALTER TABLE activity_log DROP CONSTRAINT IF EXISTS activity_log_action_type_check;
ALTER TABLE activity_log ADD CONSTRAINT activity_log_action_type_check CHECK (action_type IN (
  'login', 'logout', 'login_failed',
  'password_reset_self', 'password_reset_by_admin',
  'role_changed', 'user_deactivated', 'user_activated', 'user_created',
  'watch_created', 'watch_updated', 'watch_deleted', 'watch_duplicated',
  'sale_created', 'sale_updated', 'sale_deleted',
  'client_created', 'client_updated', 'client_deleted',
  'invoice_created', 'invoice_updated', 'invoice_deleted',
  'invoice_downloaded', 'invoice_printed',
  'invoice_issued', 'invoice_payment_recorded', 'credit_note_created',
  'watch_shared', 'settings_updated'
));

-- ── Verify afterward ───────────────────────────────────────────────────
-- select id, invoice_number, doc_type, status, total, total_lkr, issued_at
-- from invoices order by created_at desc limit 20;
--
-- select prefix, year, last_number from invoice_counters order by 1, 2;
