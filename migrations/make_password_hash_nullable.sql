-- Make password_hash optional since we're using Supabase Auth
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
