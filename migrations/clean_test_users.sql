-- Clean up test users
-- Run this in Supabase SQL Editor

-- 1. Delete linked account records first (if any)
DELETE FROM user_account_links 
WHERE user_id IN (
    SELECT id FROM users 
    WHERE name IN (
        'User_bulk1', 
        'User_bulk2', 
        'User_bulk3', 
        'User_bulk4',
        'ExampleUser34', 
        'Amal3', 
        'amal',
        'Test123',
        'Test Devotee', 
        'Test Devotee 2', 
        'Test Devotee 4'
    )
);

-- 2. Delete the users
DELETE FROM users 
WHERE name IN (
    'User_bulk1', 
    'User_bulk2', 
    'User_bulk3', 
    'User_bulk4',
    'ExampleUser34', 
    'Amal3', 
    'amal',
    'Test123',
    'Test Devotee', 
    'Test Devotee 2', 
    'Test Devotee 4'
);
