-- Migration: Add new columns to nama_accounts table
-- Run this SQL in your Supabase SQL Editor

-- Add start_date column
ALTER TABLE nama_accounts 
ADD COLUMN IF NOT EXISTS start_date DATE;

-- Add end_date column  
ALTER TABLE nama_accounts 
ADD COLUMN IF NOT EXISTS end_date DATE;

-- Add target_goal column (BIGINT supports up to 15 digits)
ALTER TABLE nama_accounts 
ADD COLUMN IF NOT EXISTS target_goal BIGINT;

-- Optional: Add comment for documentation
COMMENT ON COLUMN nama_accounts.start_date IS 'Start date of the Nama Sankalpa';
COMMENT ON COLUMN nama_accounts.end_date IS 'End date of the Nama Sankalpa (optional)';
COMMENT ON COLUMN nama_accounts.target_goal IS 'Target Nama count goal for this account';
