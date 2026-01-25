-- ==============================================================================
-- NAMA BANK - Moderator Delete Function
-- ==============================================================================
--
-- PURPOSE:
-- This function allows authenticated Moderators (via custom Login) to delete users.
-- Since Moderators are technically 'anonymous' to Supabase Auth, they cannot use
-- standard RLS policies to delete users. This 'SECURITY DEFINER' function
-- runs with admin privileges but explicitly verifies the moderator's status first.
--
-- HOW TO USE:
-- 1. Go to your Supabase Dashboard -> SQL Editor
-- 2. New Query -> Paste this entire script
-- 3. Click Run
-- ==============================================================================

CREATE OR REPLACE FUNCTION delete_user_by_moderator(target_user_id UUID, moderator_id UUID)
RETURNS VOID AS $$
DECLARE
  is_mod BOOLEAN;
BEGIN
  -- 1. Verify Requestor is an active Moderator
  SELECT EXISTS(
    SELECT 1 FROM moderators WHERE id = moderator_id AND is_active = true
  ) INTO is_mod;

  IF NOT is_mod THEN
    RAISE EXCEPTION 'Unauthorized: Only active moderators can delete users.';
  END IF;

  -- 2. Perform Deletions
  -- Delete dependent data first to be safe (though Cascade might handle it)
  DELETE FROM nama_entries WHERE user_id = target_user_id;
  DELETE FROM user_account_links WHERE user_id = target_user_id;
  DELETE FROM password_resets WHERE user_id = target_user_id;
  
  -- Finally delete the user
  DELETE FROM users WHERE id = target_user_id;
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
