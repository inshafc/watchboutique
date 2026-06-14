-- Sprint 11: Itemised Other Costs + Investor Dashboard

CREATE TABLE IF NOT EXISTS deal_expenses (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id      uuid REFERENCES deals(id) ON DELETE CASCADE,
  category     text NOT NULL,
  custom_label text,
  amount       decimal(15,2) NOT NULL DEFAULT 0,
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE deal_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff_all_deal_expenses" ON deal_expenses FOR ALL USING (true) WITH CHECK (true);
