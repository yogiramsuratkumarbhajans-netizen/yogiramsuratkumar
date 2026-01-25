-- ==============================================================================
-- NAMA BANK - System Admin Creation (Fixed)
-- ==============================================================================
--
-- PURPOSE:
-- 1. Adds 'role' column to moderators table if missing.
-- 2. Creates 'System Admin' entry for secure dashboard operations.
--
-- HOW TO USE:
-- 1. Run this in Supabase SQL Editor.
-- ==============================================================================

DO $$
BEGIN
  -- 1. Add 'role' column if it doesn't exist
  IF NOT EXISTS (
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_name = 'moderators' 
      AND column_name = 'role'
  ) THEN
      ALTER TABLE moderators ADD COLUMN role TEXT DEFAULT 'moderator';
  END IF;

  -- 2. Insert System Admin if not exists
  IF NOT EXISTS (SELECT 1 FROM moderators WHERE username = 'admin') THEN
    INSERT INTO moderators (name, username, password_hash, is_active, role)
    VALUES ('System Admin', 'admin', 'system_admin_placeholder', true, 'admin');
  END IF;
END $$;
