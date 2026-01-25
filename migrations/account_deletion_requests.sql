-- ==============================================================================
-- NAMA BANK - Account Deletion Requests & Admin Delete Account
-- ==============================================================================
--
-- HOW TO USE:
-- 1. Run this in Supabase SQL Editor.
-- ==============================================================================

-- Table for Moderator Deletion Requests
CREATE TABLE IF NOT EXISTS account_deletion_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES nama_accounts(id) ON DELETE CASCADE,
    requested_by UUID NOT NULL REFERENCES moderators(id),
    reason TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT now(),
    processed_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE account_deletion_requests ENABLE ROW LEVEL SECURITY;

-- Allow public SELECT (so Admin can see requests)
DROP POLICY IF EXISTS "Allow public read" ON account_deletion_requests;
CREATE POLICY "Allow public read" ON account_deletion_requests FOR SELECT USING (true);

-- Allow authenticated inserts (for moderators to create requests)
DROP POLICY IF EXISTS "Allow insert" ON account_deletion_requests;
CREATE POLICY "Allow insert" ON account_deletion_requests FOR INSERT WITH CHECK (true);

-- Allow updates (for Admin to approve/reject)
DROP POLICY IF EXISTS "Allow update" ON account_deletion_requests;
CREATE POLICY "Allow update" ON account_deletion_requests FOR UPDATE USING (true);

-- Admin: Delete Account directly
CREATE OR REPLACE FUNCTION admin_delete_account(target_account_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Delete related data first (user links, entries)
  DELETE FROM user_account_links WHERE account_id = target_account_id;
  DELETE FROM nama_entries WHERE account_id = target_account_id;
  DELETE FROM account_deletion_requests WHERE account_id = target_account_id;
  DELETE FROM nama_accounts WHERE id = target_account_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin: Approve deletion request (deletes the account)
CREATE OR REPLACE FUNCTION approve_account_deletion(request_id UUID)
RETURNS VOID AS $$
DECLARE
  acc_id UUID;
BEGIN
  -- Get the account ID from the request
  SELECT account_id INTO acc_id FROM account_deletion_requests WHERE id = request_id;
  
  IF acc_id IS NULL THEN
    RAISE EXCEPTION 'Request not found';
  END IF;
  
  -- Delete the account
  DELETE FROM user_account_links WHERE account_id = acc_id;
  DELETE FROM nama_entries WHERE account_id = acc_id;
  DELETE FROM nama_accounts WHERE id = acc_id;
  
  -- Update request status
  UPDATE account_deletion_requests SET status = 'approved', processed_at = now() WHERE id = request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin: Reject deletion request
CREATE OR REPLACE FUNCTION reject_account_deletion(request_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE account_deletion_requests SET status = 'rejected', processed_at = now() WHERE id = request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
