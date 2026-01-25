-- Enable RLS on storage.objects (usually enabled by default)
-- Allow moderators to upload to "books" bucket
create policy "Moderators can upload books"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'books' AND
  (exists (select 1 from moderators where id = auth.uid()))
);

-- Allow moderators to update files in "books" bucket
create policy "Moderators can update books"
on storage.objects for update
to authenticated
using (
  bucket_id = 'books' AND
  (exists (select 1 from moderators where id = auth.uid()))
);

-- Allow moderators to delete files in "books" bucket
create policy "Moderators can delete books"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'books' AND
  (exists (select 1 from moderators where id = auth.uid()))
);

-- Allow public read (if not already handled by "Public Bucket" setting)
-- Public buckets handle this automatically for SELECT, but sometimes explicit policy helps debugging
-- create policy "Public Access"
-- on storage.objects for select
-- using ( bucket_id = 'books' );
