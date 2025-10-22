-- ⚠️ REQUIRED: Complete Limit Orders Database Migration
-- Run this in your Supabase SQL Editor to fix all missing columns

-- Add ALL required columns for autonomous limit order execution
ALTER TABLE limit_orders
ADD COLUMN IF NOT EXISTS permit_signature JSONB,
ADD COLUMN IF NOT EXISTS order_signature JSONB,
ADD COLUMN IF NOT EXISTS executor_address TEXT,
ADD COLUMN IF NOT EXISTS gelato_task_id TEXT,
ADD COLUMN IF NOT EXISTS executor_tx_hash TEXT,
ADD COLUMN IF NOT EXISTS ready_for_execution BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS execution_quote JSONB,
ADD COLUMN IF NOT EXISTS quote_fetched_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_execution_attempt TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_execution_error TEXT,
ADD COLUMN IF NOT EXISTS signed_swap_transaction TEXT,
ADD COLUMN IF NOT EXISTS swap_transaction_data JSONB;

-- Verify all columns were added successfully
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'limit_orders'
AND column_name IN (
  'permit_signature', 
  'order_signature', 
  'executor_address', 
  'gelato_task_id',
  'executor_tx_hash',
  'ready_for_execution', 
  'execution_quote', 
  'quote_fetched_at',
  'last_execution_attempt', 
  'last_execution_error',
  'signed_swap_transaction',
  'swap_transaction_data'
)
ORDER BY column_name;

