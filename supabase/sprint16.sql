-- Sprint 16: KPI targets — monthly defaults (year=NULL, month=NULL) + annual target field

-- Make year/month nullable in kpi_targets so a NULL/NULL row can be the "monthly default"
ALTER TABLE kpi_targets ALTER COLUMN year  DROP NOT NULL;
ALTER TABLE kpi_targets ALTER COLUMN month DROP NOT NULL;
ALTER TABLE kpi_targets DROP CONSTRAINT IF EXISTS kpi_targets_ym_key;

-- One default row (NULL, NULL) enforced via partial unique index
CREATE UNIQUE INDEX IF NOT EXISTS kpi_targets_default_key
  ON kpi_targets ((TRUE))
  WHERE year IS NULL AND month IS NULL;

-- Unique per (year, month) for override rows
CREATE UNIQUE INDEX IF NOT EXISTS kpi_targets_ym_idx
  ON kpi_targets (year, month)
  WHERE year IS NOT NULL AND month IS NOT NULL;

-- Annual revenue target field (only stored on the default row)
ALTER TABLE kpi_targets ADD COLUMN IF NOT EXISTS annual_revenue_target numeric;

-- Same treatment for sales_manager_targets
ALTER TABLE sales_manager_targets ALTER COLUMN year  DROP NOT NULL;
ALTER TABLE sales_manager_targets ALTER COLUMN month DROP NOT NULL;
ALTER TABLE sales_manager_targets DROP CONSTRAINT IF EXISTS sm_targets_ym_key;

-- One default row per manager (NULL, NULL, manager_id)
CREATE UNIQUE INDEX IF NOT EXISTS sm_targets_default_key
  ON sales_manager_targets (sales_manager_id)
  WHERE year IS NULL AND month IS NULL;

-- Unique per (year, month, manager) for override rows
CREATE UNIQUE INDEX IF NOT EXISTS sm_targets_ym_idx
  ON sales_manager_targets (year, month, sales_manager_id)
  WHERE year IS NOT NULL AND month IS NOT NULL;
