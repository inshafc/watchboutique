-- ============================================================
-- WatchBoutique ERP — Sprint 2: Client CRM
-- Run this in the Supabase SQL editor
-- ============================================================

-- clients
CREATE TABLE clients (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  name       text        NOT NULL,
  whatsapp   text,
  email      text,
  phone      text,
  instagram  text,
  is_vip     boolean     DEFAULT false,
  club_twb   boolean     DEFAULT false,
  notes      text,
  created_at timestamptz DEFAULT now()
);

-- wishlists
CREATE TABLE wishlists (
  id         uuid          DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id  uuid          NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  brand      text,
  reference  text,
  max_budget decimal(12,2),
  currency   text          DEFAULT 'LKR',
  notes      text,
  created_at timestamptz   DEFAULT now()
);

-- contact_log
CREATE TABLE contact_log (
  id         uuid          DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id  uuid          NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  note       text          NOT NULL,
  channel    text,         -- 'WhatsApp' | 'Instagram' | 'Phone' | 'In Person'
  created_at timestamptz   DEFAULT now()
);

-- ============================================================
-- Row Level Security (open for now — auth in Sprint 3)
-- ============================================================
ALTER TABLE clients     ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlists   ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_all_clients"     ON clients     FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "staff_all_wishlists"   ON wishlists   FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "staff_all_contact_log" ON contact_log FOR ALL USING (true) WITH CHECK (true);
