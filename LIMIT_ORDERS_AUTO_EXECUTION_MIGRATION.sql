-- Migration: Add Auto-Execution Support to Limit Orders
-- Run this in Supabase SQL Editor

-- Add new columns for auto-execution
ALTER TABLE limit_orders 
ADD COLUMN IF NOT EXISTS execution_quote JSONB,
ADD COLUMN IF NOT EXISTS ready_for_execution BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS quote_fetched_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS tx_hash TEXT;

-- Add index for ready orders query
CREATE INDEX IF NOT EXISTS idx_limit_orders_ready 
ON limit_orders(wallet_address, status, ready_for_execution) 
WHERE ready_for_execution = TRUE AND status = 'pending';

-- Add comments for documentation
COMMENT ON COLUMN limit_orders.execution_quote IS 'Stored quote data from aggregator when conditions are met';
COMMENT ON COLUMN limit_orders.ready_for_execution IS 'Flag indicating order is ready to execute (conditions met)';
COMMENT ON COLUMN limit_orders.quote_fetched_at IS 'Timestamp when execution quote was fetched';
COMMENT ON COLUMN limit_orders.tx_hash IS 'Transaction hash of executed swap';

