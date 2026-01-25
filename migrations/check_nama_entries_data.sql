-- Check if nama_entries table has any data
SELECT 
    COUNT(*) as total_entries,
    SUM(count) as total_nama_count,
    MIN(entry_date) as earliest_entry,
    MAX(entry_date) as latest_entry
FROM nama_entries;

-- Also check a sample of entries
SELECT * FROM nama_entries LIMIT 10;
