-- Sprint 7: Targets table

CREATE TABLE IF NOT EXISTS targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year int NOT NULL,
  month int, -- null means annual target
  metric text NOT NULL, -- 'watches_sold', 'gross_profit', 'total_sales', 'reseller_split', 'gp_margin'
  target_value decimal(15,2) NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT targets_year_month_metric_key UNIQUE (year, month, metric)
);

ALTER TABLE targets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff_all_targets" ON targets FOR ALL USING (true) WITH CHECK (true);

INSERT INTO targets (year, month, metric, target_value) VALUES
  (2026, NULL, 'watches_sold', 37),
  (2026, NULL, 'gross_profit', 15000000),
  (2026, NULL, 'total_sales', 150000000),
  (2026, NULL, 'reseller_split', 50),
  (2026, NULL, 'gp_margin', 12)
ON CONFLICT (year, month, metric) DO NOTHING;
