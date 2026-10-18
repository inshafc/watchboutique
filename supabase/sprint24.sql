-- Sprint 24: Invoice wizard support
-- Run after sprint23.sql, in the Supabase SQL editor.
--
-- Three additions driven by the redesigned "New Invoice" wizard:
--   1. invoice_items.set_details — a real column. It was only ever carried
--      in the old line_items JSONB blob (removed in sprint23.sql); the
--      relational invoice_items table never had it, so it silently never
--      saved. The wizard's line-item editor exposes it again.
--   2. invoice_items.field_visibility — per-item control over which of
--      reference/serial/year/set_details print on the invoice (the
--      invoice-level field_visibility on `invoices` already covered
--      phone/address/notes/terms/signatures; this is the line-item
--      equivalent the wizard adds).
--   3. peek_next_invoice_number() — a read-only, non-incrementing preview
--      of what issue_invoice() would assign right now, for the wizard's
--      Step 1 "Invoice Number" display. It must never touch
--      invoice_counters.last_number — only issue_invoice() may increment,
--      and only inside its own row lock.
--
-- Idempotent — safe to re-run.

ALTER TABLE invoice_items
  ADD COLUMN IF NOT EXISTS set_details      text,
  ADD COLUMN IF NOT EXISTS field_visibility jsonb NOT NULL DEFAULT
    '{"reference": true, "serial_number": true, "year": true, "set_details": true}'::jsonb;

CREATE OR REPLACE FUNCTION peek_next_invoice_number(p_doc_type text DEFAULT 'invoice')
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_year   int := EXTRACT(YEAR FROM now())::int;
  v_prefix text;
  v_next   int;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT COALESCE(value, 'TWB') INTO v_prefix FROM app_settings WHERE key = 'invoice_number_prefix';
  IF p_doc_type = 'credit_note' THEN
    v_prefix := v_prefix || '-CN';
  END IF;

  SELECT COALESCE(last_number, 0) + 1 INTO v_next
  FROM invoice_counters WHERE prefix = v_prefix AND year = v_year;

  v_next := COALESCE(v_next, 1);

  RETURN v_prefix || '-' || v_year::text || '-' || LPAD(v_next::text, 4, '0');
END;
$$;

REVOKE ALL ON FUNCTION peek_next_invoice_number(text) FROM public;
GRANT EXECUTE ON FUNCTION peek_next_invoice_number(text) TO authenticated;

-- NOTE: this preview can drift (another enterer issues an invoice between
-- the peek and this one's own Issue click) — issue_invoice() is still the
-- only source of truth and re-locks/re-reads the counter itself, so a
-- stale preview never causes a collision, only a cosmetic off-by-one in
-- the wizard until the page refreshes.
