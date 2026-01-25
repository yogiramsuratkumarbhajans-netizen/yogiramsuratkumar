-- SQL script to identify and delete duplicate Nama Banks
-- Run this in Supabase SQL Editor after reviewing the duplicates

-- Step 1: View duplicates (run this first to review)
SELECT name, COUNT(*) as count, array_agg(id ORDER BY created_at) as ids
FROM nama_accounts
GROUP BY name
HAVING COUNT(*) > 1;

-- Step 2: Delete duplicates keeping the oldest entry
-- This deletes all but the first (oldest) entry for each duplicate name
-- IMPORTANT: Review the above query results before running this!
DELETE FROM nama_accounts
WHERE id IN (
    SELECT id FROM (
        SELECT id,
               ROW_NUMBER() OVER (PARTITION BY name ORDER BY created_at ASC) as rn
        FROM nama_accounts
    ) t
    WHERE t.rn > 1
);

-- Alternative: Delete duplicates keeping the newest entry
-- Uncomment below if you prefer to keep the newest entries instead
/*
DELETE FROM nama_accounts
WHERE id IN (
    SELECT id FROM (
        SELECT id,
               ROW_NUMBER() OVER (PARTITION BY name ORDER BY created_at DESC) as rn
        FROM nama_accounts
    ) t
    WHERE t.rn > 1
);
*/
