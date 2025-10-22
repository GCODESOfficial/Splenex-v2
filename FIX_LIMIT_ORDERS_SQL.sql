-- ⚠️ SIMPLE SQL MIGRATION - Run this in Supabase SQL Editor

-- Add missing columns one by one to avoid conflicts
ALTER TABLE limit_orders ADD COLUMN IF NOT EXISTS signed_swap_transaction TEXT;
ALTER TABLE limit_orders ADD COLUMN IF NOT EXISTS swap_transaction_data JSONB;
ALTER TABLE limit_orders ADD COLUMN IF NOT EXISTS permit_signature JSONB;
ALTER TABLE limit_orders ADD COLUMN IF NOT EXISTS order_signature JSONB;
ALTER TABLE limit_orders ADD COLUMN IF NOT EXISTS executor_address TEXT;
ALTER TABLE limit_orders ADD COLUMN IF NOT EXISTS ready_for_execution BOOLEAN DEFAULT false;

-- Check if columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'limit_orders' 
AND column_name IN (
  'signed_swap_transaction',
  'swap_transaction_data', 
  'permit_signature',
  'order_signature',
  'executor_address',
  'ready_for_execution'
)
ORDER BY column_name;
