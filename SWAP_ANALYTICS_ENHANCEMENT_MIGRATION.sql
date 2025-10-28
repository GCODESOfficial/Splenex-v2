-- ⚠️ REQUIRED: Enhanced Swap Analytics Database Migration
-- Run this in your Supabase SQL Editor to add gas fee tracking columns

-- Add enhanced columns for gas fee tracking and revenue calculation
ALTER TABLE swap_analytics
ADD COLUMN IF NOT EXISTS tx_hash TEXT,
ADD COLUMN IF NOT EXISTS gas_fee_revenue DECIMAL(18,6) DEFAULT 0,
ADD COLUMN IF NOT EXISTS original_gas_fee DECIMAL(18,6) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_gas_fee DECIMAL(18,6) DEFAULT 0,
ADD COLUMN IF NOT EXISTS additional_charge DECIMAL(18,6) DEFAULT 0,
ADD COLUMN IF NOT EXISTS from_chain_id INTEGER,
ADD COLUMN IF NOT EXISTS to_chain_id INTEGER;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_swap_analytics_timestamp ON swap_analytics(timestamp);
CREATE INDEX IF NOT EXISTS idx_swap_analytics_wallet_address ON swap_analytics(wallet_address);
CREATE INDEX IF NOT EXISTS idx_swap_analytics_tx_hash ON swap_analytics(tx_hash);
CREATE INDEX IF NOT EXISTS idx_swap_analytics_gas_fee_revenue ON swap_analytics(gas_fee_revenue);

-- Verify all columns exist (should match your table schema)
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'swap_analytics'
ORDER BY column_name;
