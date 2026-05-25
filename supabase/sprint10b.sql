-- Sprint 10b: App settings, logo storage, invoice number fix

-- Global key-value settings table
CREATE TABLE IF NOT EXISTS app_settings (
  key        text PRIMARY KEY,
  value      text,
  updated_at timestamptz DEFAULT now()
);

-- Supabase storage bucket for invoice assets (logos, etc.)
INSERT INTO storage.buckets (id, name, public)
VALUES ('invoice-assets', 'invoice-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: authenticated read/write
CREATE POLICY "Authenticated can upload invoice assets"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'invoice-assets');

CREATE POLICY "Public can read invoice assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'invoice-assets');

CREATE POLICY "Authenticated can update invoice assets"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'invoice-assets');

CREATE POLICY "Authenticated can delete invoice assets"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'invoice-assets');

-- Fix any invoice numbers that don't match TWB-YYYY-NNNN format
-- Renumbers them sequentially by created_at within their year
WITH ranked AS (
  SELECT id,
         EXTRACT(YEAR FROM created_at)::int AS yr,
         ROW_NUMBER() OVER (
           PARTITION BY EXTRACT(YEAR FROM created_at)
           ORDER BY created_at
         ) AS rn
  FROM invoices
  WHERE invoice_number NOT SIMILAR TO 'TWB-[0-9]{4}-[0-9]{4}'
)
UPDATE invoices
SET invoice_number = 'TWB-' || ranked.yr::text || '-' || LPAD(ranked.rn::text, 4, '0')
FROM ranked
WHERE invoices.id = ranked.id;
