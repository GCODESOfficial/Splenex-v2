# Fix Swap Data Not Storing in Supabase

## Problem
Swap data is not being logged to the database. Error: `"DELETE requires a WHERE clause"` with code `21000`.

## Root Cause
Row Level Security (RLS) is enabled on the `swap_analytics` table without proper policies, blocking all insert operations.

## Solution - URGENT FIX

**Do this NOW:**
1. Open your Supabase dashboard
2. Go to **SQL Editor**
3. Copy and paste this ONE line:
   ```sql
   ALTER TABLE swap_analytics DISABLE ROW LEVEL SECURITY;
   ```
4. Click **Run**

That's it! Now try making a swap again. You can also use the file `URGENT_FIX_SWAP_LOGGING.sql` which contains just this command.

---

### Alternative Options

### Option 2: Proper RLS Policies (Better for production)

1. Open your Supabase dashboard
2. Go to **SQL Editor**
3. Copy and paste the contents of `FIX_SWAP_ANALYTICS_RLS.sql`
4. Click **Run**

This will create proper RLS policies that allow inserts and reads while keeping RLS enabled.

## Verification

After running either SQL script, try making a swap. You should see in the browser console:
```
[v0] ✅ Swap successfully logged!
```

You can also check your database by running:
```sql
SELECT * FROM swap_analytics ORDER BY timestamp DESC LIMIT 10;
```

## What Changed in the Code

1. **Created `/api/log-swap` endpoint** - Server-side logging that bypasses browser limitations
2. **Added logging to all swap paths** - Aggregator swaps, simulated swaps, and LiFi swaps now all log
3. **Fixed scope issues** - Values are properly captured before UI clears
4. **Fixed column names** - Using `from_chain_id` and `to_chain_id` instead of `from_chain` and `to_chain`

## Files Modified

- `components/simple-swap-interface.tsx` - Added logging to all swap paths
- `app/api/log-swap/route.ts` - New API endpoint for server-side logging
- `FIX_SWAP_ANALYTICS_RLS.sql` - RLS policy migration
- `DISABLE_RLS_QUICK_FIX.sql` - Quick RLS disable script

## Still Not Working?

If you still get errors after running the SQL:

1. Check that your Supabase URL and ANON key are correct in `.env.local`
2. Make sure you're running the SQL in the correct Supabase project
3. Try Option 1 (disable RLS) if you haven't already
4. Check the browser console for more detailed error messages

