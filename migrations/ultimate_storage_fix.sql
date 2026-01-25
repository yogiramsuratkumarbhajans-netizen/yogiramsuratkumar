-- 1. Ensure the "library" bucket exists in the database with correct settings
INSERT INTO storage.buckets (id, name, public)
VALUES ('library', 'library', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Clear out all old conflicting policies
DROP POLICY IF EXISTS "Library Authenticated Upload" ON storage.objects;
DROP POLICY IF EXISTS "Library Authenticated Update" ON storage.objects;
DROP POLICY IF EXISTS "Library Authenticated Delete" ON storage.objects;
DROP POLICY IF EXISTS "Library Public Read" ON storage.objects;
DROP POLICY IF EXISTS "Library Public Upload" ON storage.objects;
DROP POLICY IF EXISTS "Library Public Update" ON storage.objects;
DROP POLICY IF EXISTS "Library Public Delete" ON storage.objects;
DROP POLICY IF EXISTS "Library Public Select" ON storage.objects;
DROP POLICY IF EXISTS "library_all_access" ON storage.objects;

-- 3. Create a single, absolute catch-all policy for the 'library' bucket
-- This allows anyone (Public) to do anything to this specific bucket
CREATE POLICY "library_all_access"
ON storage.objects
FOR ALL
TO public
USING (bucket_id = 'library')
WITH CHECK (bucket_id = 'library');

-- 4. Just in case, grant all permissions to the 'authenticated' and 'anon' roles for the 'storage' schema
GRANT ALL ON SCHEMA storage TO authenticated, anon;
GRANT ALL ON ALL TABLES IN SCHEMA storage TO authenticated, anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA storage TO authenticated, anon;
