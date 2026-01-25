-- ================================
-- NAMA BANK - Complete Database Schema
-- Run this SQL in your Supabase SQL Editor
-- This includes ALL tables including new moderator features
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
  profile_photo TEXT,
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
  description TEXT,
  created_by_moderator UUID,
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
-- 5. MODERATORS TABLE (NEW)
-- ================================
CREATE TABLE IF NOT EXISTS moderators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE nama_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_account_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE nama_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderators ENABLE ROW LEVEL SECURITY;

-- ================================
-- USERS TABLE POLICIES
-- ================================
DO $$ BEGIN
  CREATE POLICY "Allow public read access to users" ON users FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Allow public insert to users" ON users FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Allow users to update own record" ON users FOR UPDATE USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ================================
-- NAMA ACCOUNTS TABLE POLICIES
-- ================================
DO $$ BEGIN
  CREATE POLICY "Allow public read access to nama_accounts" ON nama_accounts FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Allow public insert to nama_accounts" ON nama_accounts FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Allow public update to nama_accounts" ON nama_accounts FOR UPDATE USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Allow public delete from nama_accounts" ON nama_accounts FOR DELETE USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ================================
-- USER ACCOUNT LINKS POLICIES
-- ================================
DO $$ BEGIN
  CREATE POLICY "Allow public read access to user_account_links" ON user_account_links FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Allow public insert to user_account_links" ON user_account_links FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Allow public delete from user_account_links" ON user_account_links FOR DELETE USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ================================
-- NAMA ENTRIES POLICIES
-- ================================
DO $$ BEGIN
  CREATE POLICY "Allow public read access to nama_entries" ON nama_entries FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Allow public insert to nama_entries" ON nama_entries FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Allow public update to nama_entries" ON nama_entries FOR UPDATE USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Allow public delete from nama_entries" ON nama_entries FOR DELETE USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ================================
-- MODERATORS POLICIES
-- ================================
DO $$ BEGIN
  CREATE POLICY "Allow public read access to moderators" ON moderators FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Allow public insert to moderators" ON moderators FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Allow public update to moderators" ON moderators FOR UPDATE USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Allow public delete from moderators" ON moderators FOR DELETE USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ================================
-- SAMPLE DATA
-- ================================

-- Insert sample Nama Bank accounts
INSERT INTO nama_accounts (name, is_active) VALUES
  ('Chennai Nama Bank', true),
  ('UK Nama Bank', true),
  ('Ashram Nama Bank', true)
ON CONFLICT DO NOTHING;

-- Insert sample moderator (Username: moderator, Password: namamod2024)
INSERT INTO moderators (name, username, password_hash, is_active) VALUES
  ('Default Moderator', 'moderator', 'namamod2024', true)
ON CONFLICT (username) DO NOTHING;

-- ================================
-- VERIFICATION QUERIES (Uncomment to test)
-- ================================
-- SELECT * FROM users LIMIT 5;
-- SELECT * FROM nama_accounts;
-- SELECT * FROM user_account_links LIMIT 5;
-- SELECT * FROM nama_entries LIMIT 5;
-- SELECT * FROM moderators;
