-- Fix RLS policies for swap_analytics table to allow inserts
-- Run this in your Supabase SQL Editor to fix the "DELETE requires a WHERE clause" error
--
-- INSTRUCTIONS:
-- 1. Open your Supabase dashboard
-- 2. Go to SQL Editor
-- 3. Paste this entire file
-- 4. Click Run
-- 5. This will create the necessary policies to allow swap data logging

-- First, check current RLS status
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'swap_analytics';

-- OPTION 1: DISABLE RLS COMPLETELY (Quick fix - use this if Option 2 doesn't work)
-- ALTER TABLE swap_analytics DISABLE ROW LEVEL SECURITY;

-- OPTION 2: Enable RLS with proper policies (Recommended)
-- Drop ALL existing policies first
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'swap_analytics') 
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON swap_analytics';
    END LOOP;
END $$;

-- Enable RLS
ALTER TABLE swap_analytics ENABLE ROW LEVEL SECURITY;

-- Create policies that allow ALL operations for everyone
CREATE POLICY "Allow all operations" ON swap_analytics
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- Verify the policy was created
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename = 'swap_analytics';

