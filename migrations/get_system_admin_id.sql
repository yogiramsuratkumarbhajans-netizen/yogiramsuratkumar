-- ==============================================================================
-- NAMA BANK - Get System Admin ID Function
-- ==============================================================================
--
-- PURPOSE:
-- Safely returns the UUID of the 'System Admin' moderator.
-- This function is SECURITY DEFINER, allowing it to bypass RLS on the moderators table.
-- It is public (or accessible to anon) so that the Admin Dashboard (which runs as anon/client-side auth)
-- can retrieve this ID to use in subsequent secure delete calls.
--
-- HOW TO USE:
-- 1. Run this in Supabase SQL Editor.
-- ==============================================================================

CREATE OR REPLACE FUNCTION get_system_admin_id()
RETURNS UUID AS $$
DECLARE
  admin_id UUID;
BEGIN
  SELECT id INTO admin_id
  FROM moderators
  WHERE username = 'admin' OR role = 'admin'
  LIMIT 1;
  
  RETURN admin_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
