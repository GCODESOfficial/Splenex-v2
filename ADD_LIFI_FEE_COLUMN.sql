-- Add LI.FI fee tracking column to swap_analytics table
-- This column stores the 2% fee collected from LI.FI swaps

-- Check if column exists, if not add it
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'swap_analytics' 
        AND column_name = 'lifi_fee_usd'
    ) THEN
        ALTER TABLE swap_analytics 
        ADD COLUMN lifi_fee_usd DECIMAL(20, 2) DEFAULT 0.00;
        
        RAISE NOTICE 'Column lifi_fee_usd added to swap_analytics table';
    ELSE
        RAISE NOTICE 'Column lifi_fee_usd already exists in swap_analytics table';
    END IF;
END $$;

-- Add a comment to the column
COMMENT ON COLUMN swap_analytics.lifi_fee_usd IS 'LI.FI transaction fee collected (2% of swap volume in USD)';

