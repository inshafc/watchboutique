-- Sprint 10: Invoicing Module

-- Bank accounts
CREATE TABLE IF NOT EXISTS saved_banks (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  bank_name      text NOT NULL,
  account_name   text,
  account_number text,
  branch         text,
  swift_code     text,
  is_active      boolean DEFAULT true,
  created_at     timestamptz DEFAULT now()
);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number    text NOT NULL UNIQUE,
  type              text NOT NULL DEFAULT 'general',    -- sale | general | sourcing
  status            text NOT NULL DEFAULT 'draft',      -- draft | advance_paid | paid_in_full | overdue
  client_id         uuid REFERENCES clients(id),
  client_name       text,
  client_address    text,
  client_phone      text,
  deal_id           uuid REFERENCES deals(id),
  date              date DEFAULT CURRENT_DATE,
  currency          text DEFAULT 'LKR',
  exchange_rate     numeric,
  sales_manager     text,
  payment_method    text,
  bank_id           uuid REFERENCES saved_banks(id),
  show_bank_details boolean DEFAULT false,
  show_signatures   boolean DEFAULT false,
  advance_paid      numeric,
  notes             text,
  deleted_at        timestamptz,
  created_at        timestamptz DEFAULT now()
);

-- Invoice line items (max 2 per invoice enforced in app)
CREATE TABLE IF NOT EXISTS invoice_items (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id     uuid REFERENCES invoices(id) ON DELETE CASCADE,
  watch_id       uuid,
  watch_name     text NOT NULL DEFAULT '',
  reference      text,
  serial_number  text,
  year           text,
  condition      text,
  photo_url      text,
  amount         numeric,
  sort_order     integer DEFAULT 0,
  created_at     timestamptz DEFAULT now()
);
