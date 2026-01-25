-- ==============================================================================
-- NAMA BANK - Moderator Prayer Delete Function
-- ==============================================================================
--
-- PURPOSE:
-- Allows authenticated Moderators to delete prayers.
-- Bypasses RLS using SECURITY DEFINER.
--
-- HOW TO USE:
-- 1. Run this in Supabase SQL Editor.
-- ==============================================================================

CREATE OR REPLACE FUNCTION delete_prayer_by_moderator(target_prayer_id UUID, moderator_id UUID)
RETURNS VOID AS $$
DECLARE
  is_mod BOOLEAN;
BEGIN
  -- 1. Verify Requestor is an active Moderator
  SELECT EXISTS(
    SELECT 1 FROM moderators WHERE id = moderator_id AND is_active = true
  ) INTO is_mod;

  IF NOT is_mod THEN
    RAISE EXCEPTION 'Unauthorized: Only active moderators can delete prayers.';
  END IF;
  
  -- Delete the prayer record
  DELETE FROM prayers WHERE id = target_prayer_id;
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
