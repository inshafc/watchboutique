-- supabase/wave2.sql
-- Consignment + actual-close price. Reuses purchase_cost and selling_price.

ALTER TABLE watches ADD COLUMN IF NOT EXISTS inventory_type text DEFAULT 'twb' CHECK (inventory_type IN ('twb','consign'));
ALTER TABLE watches ADD COLUMN IF NOT EXISTS consignee_name text;
ALTER TABLE watches ADD COLUMN IF NOT EXISTS sold_price numeric;

UPDATE watches SET inventory_type = 'twb' WHERE inventory_type IS NULL;
