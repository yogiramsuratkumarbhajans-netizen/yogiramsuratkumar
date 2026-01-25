-- Create books table
CREATE TABLE IF NOT EXISTS books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    year TEXT,
    month TEXT,
    country TEXT,
    city TEXT,
    language TEXT,
    edition_type TEXT,
    file_url TEXT NOT NULL,
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE books ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public can read books" ON books
    FOR SELECT USING (true);

-- Moderator write access (Insert, Update, Delete)
CREATE POLICY "Moderators can insert books" ON books
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM moderators WHERE id = auth.uid())
    );

CREATE POLICY "Moderators can update books" ON books
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM moderators WHERE id = auth.uid())
    );

CREATE POLICY "Moderators can delete books" ON books
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM moderators WHERE id = auth.uid())
    );

-- RPC for incrementing view count atomicly
CREATE OR REPLACE FUNCTION increment_book_view(book_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE books
  SET view_count = view_count + 1
  WHERE id = book_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
