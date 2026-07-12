-- Sprint 22: Bank Address field

-- NOTE: the "bank accounts" table is named `saved_banks` in this schema
-- (there is no `bank_accounts` table).
ALTER TABLE saved_banks ADD COLUMN IF NOT EXISTS address text;
