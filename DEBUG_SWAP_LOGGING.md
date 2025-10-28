# Debug Swap Logging - Transaction Count & Revenue

## Problem
Swaps are completing but not being saved to Supabase, so transaction count and revenue don't update.

## What Was Fixed

### 1. Column Names ✅
- Changed `from_chain` → `from_chain_id`
- Changed `to_chain` → `to_chain_id`
- Matches your database schema

### 2. All Hooks Use API Routes ✅
- `useSwapCount` → `/api/swap-count`
- `useAnalytics` → `/api/analytics`
- `useSwapVolume` → `/api/analytics`

### 3. Added Detailed Logging ✅
- Logs when volume calculation starts
- Logs calculated volume amount
- Logs when database insert happens
- Shows any errors

## How to Test & Debug

### Step 1: Check Browser Console
When you complete a swap, you should see these logs:

```
[v0] 🔍 Starting volume calculation...
[v0] 📊 Calculated swap volume: $XX.XX
[v0] 📝 Logging swap to database...
[v0] 💰 Logging swap to Supabase:
  From: XXX TOKEN (Chain XXX)
  To: XXX TOKEN (Chain XXX)
  Volume: $XX.XX USD
  Wallet: 0x...
  LI.FI Fee: $X.XX
[v0] ✅ Swap successfully logged to Supabase!
[v0] ✅ Swap logging completed!
```

### Step 2: Test a Swap
1. Go to swap page
2. Complete a swap (preferably USDT/USDC for accurate USD value)
3. Watch the browser console
4. Look for errors

### Step 3: Check Supabase Database
1. Go to your Supabase dashboard
2. Navigate to Table Editor → `swap_analytics`
3. Check if new rows appear after a swap
4. Verify the data looks correct

## Common Issues

### Issue 1: "Could not calculate USD value"
**Cause**: Token price not found in the calculation logic
**Fix**: Token is not in the price list or calculation method failed

### Issue 2: "Error calculating swap volume"
**Cause**: Exception in volume calculation
**Check**: Browser console for the actual error message

### Issue 3: "FAILED to log swap to Supabase"
**Cause**: Database insert failed
**Check**: 
- Supabase credentials in `.env.local`
- Browser console for error details
- Supabase logs in dashboard

### Issue 4: No logs at all
**Cause**: Code path not being executed
**Check**:
- Is swap actually completing?
- Is `txHash` being returned from `executeSwap`?
- Check the full flow in browser console

## Environment Variables Required

Make sure these are set in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Verification Steps

### 1. Verify Database Connection
```bash
# Should return 200 OK
curl http://localhost:3000/api/swap-count
```

### 2. Check Analytics Data
```bash
# Should return JSON array of swaps
curl http://localhost:3000/api/analytics
```

### 3. Test Insert
Use the browser console on the swap page to test:
```javascript
// This should log a test swap
await supabase.from('swap_analytics').insert([{
  timestamp: new Date().toISOString(),
  from_token: 'TEST',
  to_token: 'TEST',
  from_amount: '1',
  to_amount: '1',
  from_chain_id: 56,
  to_chain_id: 56,
  swap_volume_usd: 100,
  wallet_address: '0x0000000000000000000000000000000000000000',
  lifi_fee_usd: 2
}]);
```

## Next Steps

1. Run a test swap and watch the console
2. Share the console logs if there are errors
3. Check Supabase table for new data
4. Report what you see!

