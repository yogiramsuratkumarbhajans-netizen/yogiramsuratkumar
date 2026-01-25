-- Drop ALL potential existing policies to ensure clean state
DROP POLICY IF EXISTS "Moderators can upload books" ON storage.objects;
DROP POLICY IF EXISTS "Moderators can update books" ON storage.objects;
DROP POLICY IF EXISTS "Moderators can delete books" ON storage.objects;

DROP POLICY IF EXISTS "Authenticated upload books" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update books" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete books" ON storage.objects;
DROP POLICY IF EXISTS "Public Select Books" ON storage.objects;

-- 1. Authenticated Upload (Allows any logged-in user)
CREATE POLICY "Authenticated upload books"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'books' );

-- 2. Authenticated Update
CREATE POLICY "Authenticated update books"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'books' );

-- 3. Authenticated Delete
CREATE POLICY "Authenticated delete books"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'books' );

-- 4. Public Read
CREATE POLICY "Public Select Books"
ON storage.objects FOR SELECT
USING ( bucket_id = 'books' );
