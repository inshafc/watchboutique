-- supabase/sales-manager-fk.sql
-- Convert clients.sales_manager / deals.sales_manager from free text to a
-- proper FK against sales_managers(id). The old text columns are KEPT
-- (not dropped) — the app now dual-writes both the new FK and the legacy
-- text column, so every existing display/filter that still reads the text
-- column keeps working during the transition. Drop the text columns only
-- once commission logic is verified working off the FK.
--
-- Mapping decisions applied to this backfill (confirmed by Inshaf):
--   1. deals.sales_manager   'Fatha' -> matched to sales_managers 'Fatha Fuard'
--      (matching only — the original text value is left untouched)
--   2. clients.sales_manager 'ty'    -> left unmatched (sales_manager_id stays NULL)
--   3. deals.sales_manager   NULL (1 pre-existing Delivered row, id
--      3ae8c155-6a05-459b-ba7e-b4bc8a9518bf) -> left NULL, not fabricated

ALTER TABLE deals   ADD COLUMN IF NOT EXISTS sales_manager_id uuid REFERENCES sales_managers(id) ON DELETE SET NULL;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS sales_manager_id uuid REFERENCES sales_managers(id) ON DELETE SET NULL;

-- Backfill deals: exact name match, with 'Fatha' treated as 'Fatha Fuard' for
-- matching purposes only.
UPDATE deals d
SET sales_manager_id = sm.id
FROM sales_managers sm
WHERE d.sales_manager IS NOT NULL
  AND sm.name = CASE WHEN d.sales_manager = 'Fatha' THEN 'Fatha Fuard' ELSE d.sales_manager END
  AND d.sales_manager_id IS NULL;

-- Backfill clients: exact name match. 'ty' matches no sales_managers row and
-- is excluded explicitly so the decision is documented here, not implicit.
UPDATE clients c
SET sales_manager_id = sm.id
FROM sales_managers sm
WHERE c.sales_manager IS NOT NULL
  AND c.sales_manager <> 'ty'
  AND sm.name = c.sales_manager
  AND c.sales_manager_id IS NULL;
