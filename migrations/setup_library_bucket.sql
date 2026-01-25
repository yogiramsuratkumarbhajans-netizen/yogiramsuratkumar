-- NUCLEAR OPTION: Public Write Access to 'library' bucket
-- Use this to unblock uploads if Authentication is failing
DROP POLICY IF EXISTS "Library Authenticated Upload" ON storage.objects;
DROP POLICY IF EXISTS "Library Authenticated Update" ON storage.objects;
DROP POLICY IF EXISTS "Library Authenticated Delete" ON storage.objects;
DROP POLICY IF EXISTS "Library Public Read" ON storage.objects;

DROP POLICY IF EXISTS "Library Public Upload" ON storage.objects;
DROP POLICY IF EXISTS "Library Public Update" ON storage.objects;
DROP POLICY IF EXISTS "Library Public Delete" ON storage.objects;
DROP POLICY IF EXISTS "Library Public Select" ON storage.objects;

-- 1. Allowed Public Upload
CREATE POLICY "Library Public Upload"
ON storage.objects FOR INSERT
TO public
WITH CHECK ( bucket_id = 'library' );

-- 2. Allow Public Update
CREATE POLICY "Library Public Update"
ON storage.objects FOR UPDATE
TO public
USING ( bucket_id = 'library' );

-- 3. Allow Public Delete
CREATE POLICY "Library Public Delete"
ON storage.objects FOR DELETE
TO public
USING ( bucket_id = 'library' );

-- 4. Public Access (Read)
CREATE POLICY "Library Public Read"
ON storage.objects FOR SELECT
TO public
USING ( bucket_id = 'library' );
