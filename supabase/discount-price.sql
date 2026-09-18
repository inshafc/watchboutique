-- supabase/discount-price.sql
-- "Sale Price" — an optional discounted price shown alongside the struck-through
-- selling price in the inventory section.
--
-- NAMING: the UI label is "Sale Price"; the column is discount_price. sale_price
-- (deals), sold_price (watches) and sale_date already exist and mean the actual
-- transacted price/date — discount_price is display only and must never feed
-- gross profit, investor payouts, deals, invoices or exports.
--
-- Run in the Supabase SQL editor. Idempotent — safe to re-run.

-- ── Columns ──────────────────────────────────────────────────────────────────
-- NO BACKFILL: existing inventory stays NULL = not on sale.
ALTER TABLE watches
  ADD COLUMN IF NOT EXISTS discount_price            numeric(12,2),
  ADD COLUMN IF NOT EXISTS discount_price_updated_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS discount_price_updated_at timestamptz;

-- ── Constraint ───────────────────────────────────────────────────────────────
-- The listed price column on watches is selling_price (there is no asking_price).
-- `selling_price IS NOT NULL` is part of the check on purpose: without it,
-- `discount_price < NULL` evaluates to NULL and Postgres would ACCEPT a sale
-- price on a watch that has no listed price to discount from — which the
-- display helper could not render as "original struck through, sale beside it".
ALTER TABLE watches DROP CONSTRAINT IF EXISTS watches_discount_price_check;
ALTER TABLE watches ADD CONSTRAINT watches_discount_price_check
  CHECK (
    discount_price IS NULL
    OR (discount_price > 0 AND selling_price IS NOT NULL AND discount_price < selling_price)
  );

-- Partial index — the "On Sale" inventory filter only ever looks for non-NULL.
CREATE INDEX IF NOT EXISTS idx_watches_discount_price
  ON watches (discount_price) WHERE discount_price IS NOT NULL;

-- ── Server-side audit stamping ───────────────────────────────────────────────
-- Stamped by a BEFORE trigger rather than by the client, so every write path
-- (the edit form's plain UPDATE, the add form's INSERT, the RPC below, or a
-- hand-written SQL update) is stamped identically and the client can never
-- forge or freeze the trail. When discount_price is unchanged the previous
-- stamp is restored, so an unrelated watch edit does not re-date the sale.
--
-- _updated_by is resolved through a subselect on profiles rather than taking
-- auth.uid() directly. An auth.users row with no matching profiles row (users
-- predating sprint17.sql, or a profile deleted by hand — the
-- on_auth_user_created trigger prevents new ones) would otherwise violate the
-- FK and abort the whole write with a raw constraint error the moment that
-- user touched a Sale Price. This degrades attribution to NULL instead;
-- _updated_at still stamps, and the detail page already falls back to
-- "set by a team member" when the name does not resolve.
CREATE OR REPLACE FUNCTION stamp_discount_price_audit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.discount_price IS NOT NULL THEN
      NEW.discount_price_updated_by := (SELECT id FROM profiles WHERE id = auth.uid());
      NEW.discount_price_updated_at := now();
    ELSE
      NEW.discount_price_updated_by := NULL;
      NEW.discount_price_updated_at := NULL;
    END IF;
  ELSIF NEW.discount_price IS DISTINCT FROM OLD.discount_price THEN
    -- set, changed OR cleared — all three stamp.
    NEW.discount_price_updated_by := (SELECT id FROM profiles WHERE id = auth.uid());
    NEW.discount_price_updated_at := now();
  ELSE
    NEW.discount_price_updated_by := OLD.discount_price_updated_by;
    NEW.discount_price_updated_at := OLD.discount_price_updated_at;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS watches_discount_price_audit ON watches;
CREATE TRIGGER watches_discount_price_audit
  BEFORE INSERT OR UPDATE ON watches
  FOR EACH ROW EXECUTE FUNCTION stamp_discount_price_audit();

-- ── Narrow write path ────────────────────────────────────────────────────────
-- Every authenticated role may set/change/clear a Sale Price. The existing
-- watches UPDATE policy is deliberately LEFT AS IS — this function exists so a
-- role that cannot (or in future may not) open the full edit form still has a
-- path that touches ONLY discount_price and its two audit columns, instead of
-- widening the table-level policy. Pass NULL to clear.
CREATE OR REPLACE FUNCTION set_discount_price(p_watch_id uuid, p_price numeric)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_selling numeric;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT selling_price INTO v_selling
  FROM watches WHERE id = p_watch_id AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Watch not found';
  END IF;

  IF p_price IS NOT NULL THEN
    IF v_selling IS NULL THEN
      RAISE EXCEPTION 'Set a selling price before adding a Sale Price';
    END IF;
    IF p_price <= 0 THEN
      RAISE EXCEPTION 'Sale Price must be greater than 0';
    END IF;
    IF p_price >= v_selling THEN
      RAISE EXCEPTION 'Sale Price must be lower than the selling price';
    END IF;
  END IF;

  -- Only discount_price is written; the trigger above stamps the audit columns.
  UPDATE watches SET discount_price = p_price WHERE id = p_watch_id;

  RETURN p_price;
END;
$$;

REVOKE ALL ON FUNCTION set_discount_price(uuid, numeric) FROM public;
GRANT EXECUTE ON FUNCTION set_discount_price(uuid, numeric) TO authenticated;

-- ── Audit display ────────────────────────────────────────────────────────────
-- profiles SELECT is restricted to a user's own row (super_admin sees all), so
-- a plain join on discount_price_updated_by returns NULL for most roles. This
-- returns the display name and nothing else, mirroring get_my_role() in
-- sprint17.sql.
CREATE OR REPLACE FUNCTION get_profile_display_name(p_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(NULLIF(full_name, ''), email) FROM profiles WHERE id = p_id;
$$;

REVOKE ALL ON FUNCTION get_profile_display_name(uuid) FROM public;
GRANT EXECUTE ON FUNCTION get_profile_display_name(uuid) TO authenticated;
