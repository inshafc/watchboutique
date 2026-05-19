-- Sprint 4: Brands table, watch_status, bank_name

CREATE TABLE IF NOT EXISTS brands (
  id    uuid primary key default gen_random_uuid(),
  name  text not null,
  color text
);

INSERT INTO brands (name, color) VALUES
  ('Rolex',           '#006039'),
  ('Audemars Piguet', '#003087'),
  ('Omega',           '#B01C2E'),
  ('Patek Philippe',  '#1B3A6B'),
  ('Richard Mille',   '#E31E24'),
  ('Tudor',           '#000000')
ON CONFLICT DO NOTHING;

ALTER TABLE watches ADD COLUMN IF NOT EXISTS brand_id     uuid REFERENCES brands(id);
ALTER TABLE watches ADD COLUMN IF NOT EXISTS watch_status text DEFAULT 'Available';

ALTER TABLE deals   ADD COLUMN IF NOT EXISTS bank_name    text;
