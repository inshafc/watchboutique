-- Sprint 9: Clients & Sales fixes
ALTER TABLE clients ADD COLUMN IF NOT EXISTS is_draft    boolean DEFAULT false;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS birthday    text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS anniversary text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS status_tier text DEFAULT 'General';
