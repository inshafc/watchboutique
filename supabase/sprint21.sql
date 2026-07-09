-- Sprint 21: Amount invested per investor

ALTER TABLE investor_names ADD COLUMN IF NOT EXISTS amount_invested decimal(15,2) DEFAULT 0;
