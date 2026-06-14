-- Sprint 11b: Invoice improvements
-- Run this in the Supabase SQL editor

-- Add sort_order to invoice_items (was missing, caused line item insert to fail)
ALTER TABLE invoice_items
  ADD COLUMN IF NOT EXISTS sort_order int NOT NULL DEFAULT 0;

-- Add terms_and_conditions to invoices
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS terms_and_conditions text;
