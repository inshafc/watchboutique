-- supabase/profile-avatar.sql
-- Adds avatar_url so staff can set a profile photo from the dashboard header
-- popover. Uploaded files reuse the existing public "watch-photos" storage
-- bucket (under an avatars/ prefix) — no new bucket needed.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url text;
