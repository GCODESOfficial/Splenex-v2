-- QUICK FIX: Disable RLS completely for swap_analytics table
-- This will allow all operations without any policies
-- Run this in Supabase SQL Editor if the other migration doesn't work

ALTER TABLE swap_analytics DISABLE ROW LEVEL SECURITY;

-- Verify it's disabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'swap_analytics';

-- Should show: rowsecurity = false


