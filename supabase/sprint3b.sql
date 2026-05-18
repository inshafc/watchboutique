-- ============================================================
-- WatchBoutique ERP — Sprint 3b: Sales module updates
-- Run this in the Supabase SQL editor
-- ============================================================

ALTER TABLE deals
  ADD COLUMN IF NOT EXISTS other_costs         boolean      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS other_costs_amount  numeric(12,2),
  ADD COLUMN IF NOT EXISTS commission_payable  boolean      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS commission_amount   numeric(12,2) DEFAULT 50000,
  ADD COLUMN IF NOT EXISTS new_client          boolean      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sale_date           date,
  ADD COLUMN IF NOT EXISTS delivery_status     text;

-- delivery_status: reserved for future use; stage field now includes 'Delivered'
-- stage values: 'Inquiry' | 'Offer' | 'Negotiation' | 'Closed' | 'Delivered' | 'Lost'

CREATE TABLE trade_ins (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id          uuid         NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  brand            text,
  reference        text,
  serial_number    text,
  year             text,
  condition        text,
  set_details      text,
  value            numeric(12,2),
  add_to_inventory boolean      NOT NULL DEFAULT false,
  watch_id         uuid         REFERENCES watches(id) ON DELETE SET NULL,
  created_at       timestamptz  NOT NULL DEFAULT now()
);

ALTER TABLE trade_ins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open_trade_ins" ON trade_ins FOR ALL USING (true) WITH CHECK (true);
