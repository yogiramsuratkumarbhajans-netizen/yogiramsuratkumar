-- ============================================
-- Fix nama_entries RLS Policy
-- ============================================
-- This migration enables public read access to the nama_entries table
-- so that aggregate counts and statistics can be displayed on the public website

-- Ensure RLS is enabled on the table
ALTER TABLE nama_entries ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they conflict (optional, run if you have existing policies)
-- DROP POLICY IF EXISTS "Allow public read access to nama_entries" ON nama_entries;

-- Create policy to allow public (anonymous and authenticated) SELECT access
CREATE POLICY "Allow public read access to nama_entries"
ON nama_entries
FOR SELECT
TO anon, authenticated
USING (true);

-- Verify the policy was created
-- You can run this query to check:
-- SELECT * FROM pg_policies WHERE tablename = 'nama_entries';
