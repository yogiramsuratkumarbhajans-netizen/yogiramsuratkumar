-- Migration: Add start_date and end_date to nama_entries table
-- Run this SQL in your Supabase SQL Editor

ALTER TABLE nama_entries 
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS end_date DATE;

-- Add comments for documentation
COMMENT ON COLUMN nama_entries.start_date IS 'Start date of the Nama offering period';
COMMENT ON COLUMN nama_entries.end_date IS 'End date of the Nama offering period';
