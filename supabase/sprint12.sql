-- Sprint 12: Sourced Orders
-- Run this in the Supabase SQL editor

CREATE TABLE IF NOT EXISTS sourced_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES invoices(id) ON DELETE SET NULL,
  watch_name text NOT NULL,
  reference text,
  serial_number text,
  year text,
  condition text,
  set_details text,
  purchase_cost decimal(15,2),
  selling_price decimal(15,2),
  supplier text,
  notes text,
  status text DEFAULT 'ordered',
  expected_date date,
  arrived_at timestamptz,
  added_to_inventory_at timestamptz,
  watch_id uuid REFERENCES watches(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE sourced_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_all_sourced_orders" ON sourced_orders
  FOR ALL USING (true) WITH CHECK (true);
