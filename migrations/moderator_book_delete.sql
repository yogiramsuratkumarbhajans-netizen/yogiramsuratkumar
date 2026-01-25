-- ==============================================================================
-- NAMA BANK - Moderator Book Delete Function
-- ==============================================================================
--
-- PURPOSE:
-- Allows authenticated Moderators to delete books.
-- Similar to delete_user_by_moderator, this bypasses RLS by using a SECURITY DEFINER function
-- that first verifies the moderator's active status.
--
-- HOW TO USE:
-- 1. Run this in Supabase SQL Editor.
-- ==============================================================================

CREATE OR REPLACE FUNCTION delete_book_by_moderator(target_book_id UUID, moderator_id UUID)
RETURNS VOID AS $$
DECLARE
  is_mod BOOLEAN;
  file_url_to_delete TEXT;
BEGIN
  -- 1. Verify Requestor is an active Moderator
  SELECT EXISTS(
    SELECT 1 FROM moderators WHERE id = moderator_id AND is_active = true
  ) INTO is_mod;

  IF NOT is_mod THEN
    RAISE EXCEPTION 'Unauthorized: Only active moderators can delete books.';
  END IF;

  -- 2. Get file URL before deleting (so client knows what to delete from storage, or we handle it here?)
  -- Ideally, storage deletion should be handled by the client or a separate trigger/function.
  -- For now, we focus on DB deletion. The client updates will handle storage deletion attempts 
  -- via the service, which might fail if storage RLS is also strict.
  -- Ideally, storage RLS should allow "public" delete if they have the file path? 
  -- Or better, we can assume the client side service handles storage deletion (which might fail if not permitted).
  -- A robust system would delete storage via a trigger on DB delete, but Supabase Storage doesn't support that easily yet.
  
  -- Delete the book record
  DELETE FROM books WHERE id = target_book_id;
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
