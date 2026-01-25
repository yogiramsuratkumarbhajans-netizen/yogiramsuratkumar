-- Function to safely delete a moderator and handle their dependencies
CREATE OR REPLACE FUNCTION admin_delete_moderator(target_moderator_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 1. Unlink from prayers (set approved_by to null)
  -- Only if column exists (dynamic check not easy in plpgsql without exec), 
  -- but code uses it, so assume it exists.
  UPDATE prayers 
  SET approved_by = NULL 
  WHERE approved_by = target_moderator_id;

  -- 2. Unlink from nama_accounts REMOVED (Column created_by_moderator does not exist)
  -- If you add this column in future, uncomment the following:
  -- UPDATE nama_accounts 
  -- SET created_by_moderator = NULL 
  -- WHERE created_by_moderator = target_moderator_id;

  -- 3. Delete any pending deletion requests made by this moderator
  DELETE FROM account_deletion_requests 
  WHERE requested_by = target_moderator_id;

  -- 4. Delete the moderator
  DELETE FROM moderators 
  WHERE id = target_moderator_id;

END;
$$;
