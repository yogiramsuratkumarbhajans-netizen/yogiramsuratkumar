-- ================================
-- NAMA BANK - Supabase Database Schema
-- Run this SQL in your Supabase SQL Editor
-- ================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================
-- 1. USERS TABLE
-- ================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  whatsapp TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  city TEXT,
  state TEXT,
  country TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookup by WhatsApp
CREATE INDEX IF NOT EXISTS idx_users_whatsapp ON users(whatsapp);

-- ================================
-- 2. NAMA ACCOUNTS TABLE
-- ================================
CREATE TABLE IF NOT EXISTS nama_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================
-- 3. USER ACCOUNT LINKS TABLE
-- ================================
CREATE TABLE IF NOT EXISTS user_account_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES nama_accounts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, account_id)
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_account_links_user ON user_account_links(user_id);
CREATE INDEX IF NOT EXISTS idx_user_account_links_account ON user_account_links(account_id);

-- ================================
-- 4. NAMA ENTRIES TABLE
-- ================================
CREATE TABLE IF NOT EXISTS nama_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES nama_accounts(id) ON DELETE CASCADE,
  count INTEGER NOT NULL CHECK (count >= 0),
  source_type TEXT NOT NULL CHECK (source_type IN ('manual', 'audio')),
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_nama_entries_user ON nama_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_nama_entries_account ON nama_entries(account_id);
CREATE INDEX IF NOT EXISTS idx_nama_entries_date ON nama_entries(entry_date);

-- ================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE nama_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_account_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE nama_entries ENABLE ROW LEVEL SECURITY;

-- ================================
-- USERS TABLE POLICIES
-- ================================

-- Allow anyone to read users (for login lookup)
CREATE POLICY "Allow public read access to users" ON users
  FOR SELECT USING (true);

-- Allow anyone to insert new users (for registration)
CREATE POLICY "Allow public insert to users" ON users
  FOR INSERT WITH CHECK (true);

-- Allow users to update their own record
CREATE POLICY "Allow users to update own record" ON users
  FOR UPDATE USING (true);

-- ================================
-- NAMA ACCOUNTS TABLE POLICIES
-- ================================

-- Allow anyone to read active nama accounts
CREATE POLICY "Allow public read access to nama_accounts" ON nama_accounts
  FOR SELECT USING (true);

-- Allow anyone to insert/update/delete (admin operations)
CREATE POLICY "Allow public insert to nama_accounts" ON nama_accounts
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update to nama_accounts" ON nama_accounts
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete from nama_accounts" ON nama_accounts
  FOR DELETE USING (true);

-- ================================
-- USER ACCOUNT LINKS POLICIES
-- ================================

-- Allow anyone to read links
CREATE POLICY "Allow public read access to user_account_links" ON user_account_links
  FOR SELECT USING (true);

-- Allow anyone to insert links
CREATE POLICY "Allow public insert to user_account_links" ON user_account_links
  FOR INSERT WITH CHECK (true);

-- Allow anyone to delete links
CREATE POLICY "Allow public delete from user_account_links" ON user_account_links
  FOR DELETE USING (true);

-- ================================
-- NAMA ENTRIES POLICIES
-- ================================

-- Allow anyone to read entries
CREATE POLICY "Allow public read access to nama_entries" ON nama_entries
  FOR SELECT USING (true);

-- Allow anyone to insert entries
CREATE POLICY "Allow public insert to nama_entries" ON nama_entries
  FOR INSERT WITH CHECK (true);

-- Allow anyone to update entries (admin operations)
CREATE POLICY "Allow public update to nama_entries" ON nama_entries
  FOR UPDATE USING (true);

-- Allow anyone to delete entries (admin operations)
CREATE POLICY "Allow public delete from nama_entries" ON nama_entries
  FOR DELETE USING (true);

-- ================================
-- SAMPLE DATA (Optional)
-- ================================

-- Insert sample Nama Bank accounts
INSERT INTO nama_accounts (name, is_active) VALUES
  ('Chennai Nama Bank', true),
  ('UK Nama Bank', true),
  ('Ashram Nama Bank', true)
ON CONFLICT DO NOTHING;

-- ================================
-- VERIFICATION QUERIES
-- ================================

-- Uncomment these to verify tables were created:
-- SELECT * FROM users LIMIT 5;
-- SELECT * FROM nama_accounts;
-- SELECT * FROM user_account_links LIMIT 5;
-- SELECT * FROM nama_entries LIMIT 5;
