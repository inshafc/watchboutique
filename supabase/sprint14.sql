-- Sprint 14: Invoice-level amount_paid column
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS amount_paid numeric;
