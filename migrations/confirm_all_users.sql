-- Confirm all unconfirmed users
-- This marks all user emails as confirmed so they can login immediately

UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email_confirmed_at IS NULL;

-- Verify the update
SELECT 
    email,
    email_confirmed_at,
    created_at
FROM auth.users
ORDER BY created_at DESC;
