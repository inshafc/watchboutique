-- ============================================================
-- WatchBoutique ERP — Sprint 3: Deals Module
-- Run this in the Supabase SQL editor
-- ============================================================

CREATE TABLE deals (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  watch_id       uuid REFERENCES watches(id)  ON DELETE SET NULL,
  client_id      uuid REFERENCES clients(id)  ON DELETE SET NULL,
  deal_type      text        NOT NULL,                   -- 'Sale' | 'Purchase' | 'Trade'
  stage          text        NOT NULL DEFAULT 'Inquiry', -- 'Inquiry' | 'Offer' | 'Negotiation' | 'Closed' | 'Lost'
  offered_price  numeric(12,2),
  sale_price     numeric(12,2),
  trade_value    numeric(12,2),
  adjustment     numeric(12,2),
  commission     numeric(12,2),
  payment_method text,                                   -- 'Cash' | 'Bank Transfer' | 'Installment'
  currency       text        NOT NULL DEFAULT 'LKR',
  notes          text,
  sales_manager  text,
  closed_at      timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE installments (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id   uuid        NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  amount    numeric(12,2) NOT NULL,
  due_date  date,
  paid_at   timestamptz,
  status    text        NOT NULL DEFAULT 'Pending',     -- 'Pending' | 'Paid' | 'Overdue'
  notes     text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE deals        ENABLE ROW LEVEL SECURITY;
ALTER TABLE installments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "open_deals"        ON deals        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open_installments" ON installments FOR ALL USING (true) WITH CHECK (true);
