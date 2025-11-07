-- URGENT FIX: Disable RLS for swap_analytics to fix "DELETE requires WHERE clause" error
-- Copy this entire file and paste into Supabase SQL Editor, then click Run

ALTER TABLE swap_analytics DISABLE ROW LEVEL SECURITY;

-- That's it! Now try making a swap again.


