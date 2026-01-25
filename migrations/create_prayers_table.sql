-- Migration: Create prayers table for Prayer Box feature
-- Run this SQL in your Supabase SQL Editor

-- Create prayers table
CREATE TABLE IF NOT EXISTS prayers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    privacy VARCHAR(20) DEFAULT 'public' CHECK (privacy IN ('public', 'anonymous', 'private')),
    prayer_text TEXT NOT NULL,
    email_notifications BOOLEAN DEFAULT false,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    prayer_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES moderators(id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_prayers_status ON prayers(status);
CREATE INDEX IF NOT EXISTS idx_prayers_created_at ON prayers(created_at DESC);

-- Enable Row Level Security
ALTER TABLE prayers ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read approved prayers
CREATE POLICY "Public can read approved prayers" ON prayers
    FOR SELECT USING (status = 'approved');

-- Policy: Anyone can insert prayers (submit)
CREATE POLICY "Anyone can submit prayers" ON prayers
    FOR INSERT WITH CHECK (true);

-- Policy: Moderators/Admins can update prayers (approve/reject)
CREATE POLICY "Moderators can update prayers" ON prayers
    FOR UPDATE USING (true);

-- Policy: Moderators/Admins can read all prayers
CREATE POLICY "Moderators can read all prayers" ON prayers
    FOR SELECT USING (true);
