-- Sprint 15: Extended Settings — investors, KPI targets, sales manager targets

-- Add email + is_active to sales_managers
ALTER TABLE sales_managers ADD COLUMN IF NOT EXISTS email     text;
ALTER TABLE sales_managers ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Investor display names
CREATE TABLE IF NOT EXISTS investor_names (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key          text NOT NULL UNIQUE,
  display_name text NOT NULL,
  is_default   boolean DEFAULT false,
  created_at   timestamptz DEFAULT now()
);

INSERT INTO investor_names (key, display_name, is_default) VALUES
  ('TWB',        'TWB',        true),
  ('Investor 1', 'Investor 1', false),
  ('Investor 2', 'Investor 2', false),
  ('Investor 3', 'Investor 3', false)
ON CONFLICT (key) DO NOTHING;

ALTER TABLE investor_names ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff_all_investor_names" ON investor_names FOR ALL USING (true) WITH CHECK (true);

-- Monthly KPI targets
CREATE TABLE IF NOT EXISTS kpi_targets (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year                int  NOT NULL,
  month               int  NOT NULL,
  gross_profit_value  numeric,
  gross_profit_pct    numeric,
  net_profit_value    numeric,
  net_profit_pct      numeric,
  total_revenue       numeric,
  club_twb_watches    int,
  club_twb_revenue    numeric,
  created_at          timestamptz DEFAULT now(),
  CONSTRAINT kpi_targets_ym_key UNIQUE (year, month)
);

ALTER TABLE kpi_targets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff_all_kpi_targets" ON kpi_targets FOR ALL USING (true) WITH CHECK (true);

-- Per sales-manager monthly targets
CREATE TABLE IF NOT EXISTS sales_manager_targets (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year                int  NOT NULL,
  month               int  NOT NULL,
  sales_manager_id    uuid REFERENCES sales_managers(id) ON DELETE CASCADE,
  watch_count_target  int,
  revenue_target      numeric,
  created_at          timestamptz DEFAULT now(),
  CONSTRAINT sm_targets_ym_key UNIQUE (year, month, sales_manager_id)
);

ALTER TABLE sales_manager_targets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff_all_sm_targets" ON sales_manager_targets FOR ALL USING (true) WITH CHECK (true);
