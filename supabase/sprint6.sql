-- Sprint 6: Watch IDs, Sort Order, Labels, Sales Managers

ALTER TABLE watches ADD COLUMN IF NOT EXISTS watch_id    text    UNIQUE;
ALTER TABLE watches ADD COLUMN IF NOT EXISTS sort_order  integer DEFAULT 0;
ALTER TABLE watches ADD COLUMN IF NOT EXISTS labels      text[]  DEFAULT '{}';

ALTER TABLE clients ADD COLUMN IF NOT EXISTS labels      text[]  DEFAULT '{}';

CREATE TABLE IF NOT EXISTS sales_managers (
  id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL
);

INSERT INTO sales_managers (name) VALUES
  ('Ali Hussain'),
  ('Diluka Samarasinghe'),
  ('Dishan Jayawardena'),
  ('Emad Sangani'),
  ('Fatha Fuard'),
  ('Haran U')
ON CONFLICT DO NOTHING;

ALTER TABLE sales_managers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff_all_sales_managers" ON sales_managers
  FOR ALL USING (true) WITH CHECK (true);
