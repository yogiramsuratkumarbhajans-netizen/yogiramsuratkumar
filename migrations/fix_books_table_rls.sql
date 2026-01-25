-- TEMPORARY DEBUG POLICY: Allow public insert to books table
-- This is to verify if the auth/moderator check is the blocker
DROP POLICY IF EXISTS "Moderators can insert books" ON books;
CREATE POLICY "Public insert books debug"
ON books FOR INSERT
TO public
WITH CHECK (true);

-- Ensure public can also update for metadata sync if needed
DROP POLICY IF EXISTS "Moderators can update books" ON books;
CREATE POLICY "Public update books debug"
ON books FOR UPDATE
TO public
USING (true);

-- Ensure public read remains
DROP POLICY IF EXISTS "Public can read books" ON books;
CREATE POLICY "Public read books debug"
ON books FOR SELECT
TO public
USING (true);
