-- Migration: Add autonomous execution support to limit_orders table
-- Run this in your Supabase SQL Editor

-- Add columns for permit and order signatures (for autonomous execution)
ALTER TABLE limit_orders
ADD COLUMN IF NOT EXISTS permit_signature JSONB,
ADD COLUMN IF NOT EXISTS order_signature JSONB,
ADD COLUMN IF NOT EXISTS executor_address TEXT,
ADD COLUMN IF NOT EXISTS executor_tx_hash TEXT,
ADD COLUMN IF NOT EXISTS last_execution_attempt TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_execution_error TEXT;

-- Add comments for documentation
COMMENT ON COLUMN limit_orders.permit_signature IS 'ERC20 Permit signature for gasless token approval';
COMMENT ON COLUMN limit_orders.order_signature IS 'EIP-712 order signature authorizing execution';
COMMENT ON COLUMN limit_orders.executor_address IS 'Address of executor wallet that will execute the order';
COMMENT ON COLUMN limit_orders.executor_tx_hash IS 'Transaction hash from executor execution';
COMMENT ON COLUMN limit_orders.last_execution_attempt IS 'Timestamp of last execution attempt by keeper';
COMMENT ON COLUMN limit_orders.last_execution_error IS 'Error message from last failed execution attempt';

-- Verify columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'limit_orders'
AND column_name IN ('permit_signature', 'order_signature', 'executor_address', 'executor_tx_hash', 'last_execution_attempt', 'last_execution_error');

