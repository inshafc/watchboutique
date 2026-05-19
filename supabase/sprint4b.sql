-- Sprint 4b — fix duplicate brands
-- Run this once in the Supabase SQL editor.

-- 1. Remove duplicate brand rows, keeping the row with the lowest UUID per name
--    (effectively the first one inserted, since gen_random_uuid is time-ordered)
DELETE FROM brands
WHERE id NOT IN (
  SELECT DISTINCT ON (name) id
  FROM brands
  ORDER BY name, id
);

-- 2. Prevent future duplicates
ALTER TABLE brands
  ADD CONSTRAINT brands_name_unique UNIQUE (name);
