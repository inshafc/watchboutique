-- supabase/wave2b.sql
-- Per-investor default profit split. Stored on investor_names; only read at the
-- moment a watch's investor row is created (auto-fill), never live thereafter.

ALTER TABLE investor_names ADD COLUMN IF NOT EXISTS default_split_investor_pct numeric DEFAULT 50 CHECK (default_split_investor_pct >= 0 AND default_split_investor_pct <= 100);

UPDATE investor_names SET default_split_investor_pct = 50 WHERE default_split_investor_pct IS NULL;

UPDATE investor_names SET default_split_investor_pct = 60 WHERE key = 'AO';
