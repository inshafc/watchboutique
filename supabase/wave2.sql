-- supabase/wave2.sql
-- Consignment + actual-close price. Reuses purchase_cost and selling_price.

ALTER TABLE watches ADD COLUMN IF NOT EXISTS inventory_type text DEFAULT 'twb' CHECK (inventory_type IN ('twb','consign'));
ALTER TABLE watches ADD COLUMN IF NOT EXISTS consignee_name text;
ALTER TABLE watches ADD COLUMN IF NOT EXISTS sold_price numeric;

UPDATE watches SET inventory_type = 'twb' WHERE inventory_type IS NULL;

-- Backfill sold_price for sales that closed before this column existed, so profit
-- and investor-split math (which now reads sold_price, falling back to
-- deals.sale_price when null) has real data for historical watches too.
-- Picks the most recently closed Delivered deal per watch.
UPDATE watches w
SET sold_price = sub.sale_price
FROM (
  SELECT DISTINCT ON (watch_id) watch_id, sale_price
  FROM deals
  WHERE stage = 'Delivered' AND deleted_at IS NULL AND sale_price IS NOT NULL
  ORDER BY watch_id, closed_at DESC NULLS LAST, created_at DESC
) sub
WHERE sub.watch_id = w.id
  AND w.sold_price IS NULL;
