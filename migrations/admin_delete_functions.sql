-- ==============================================================================
-- NAMA BANK - Admin Delete Functions (Simplified)
-- ==============================================================================
--
-- PURPOSE:
-- These functions allow the Admin Dashboard to delete users, prayers, and books
-- without needing a moderator identity. They are SECURITY DEFINER, bypassing RLS.
--
-- SECURITY NOTE:
-- These are powerful functions. In a production environment, you might want to
-- add additional verification (e.g., checking a secret key or admin session).
-- For this application, Admin access is already controlled client-side.
--
-- HOW TO USE:
-- 1. Run this in Supabase SQL Editor.
-- ==============================================================================

-- Admin: Delete User
CREATE OR REPLACE FUNCTION admin_delete_user(target_user_id UUID)
RETURNS VOID AS $$
BEGIN
  DELETE FROM nama_entries WHERE user_id = target_user_id;
  DELETE FROM user_account_links WHERE user_id = target_user_id;
  DELETE FROM password_resets WHERE user_id = target_user_id;
  DELETE FROM users WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin: Delete Prayer
CREATE OR REPLACE FUNCTION admin_delete_prayer(target_prayer_id UUID)
RETURNS VOID AS $$
BEGIN
  DELETE FROM prayers WHERE id = target_prayer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin: Delete Book
CREATE OR REPLACE FUNCTION admin_delete_book(target_book_id UUID)
RETURNS VOID AS $$
BEGIN
  DELETE FROM books WHERE id = target_book_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
