-- Add change_percent column to market_assets table
-- This column stores the daily percentage change for market data updates

-- Add the column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'market_assets'
        AND column_name = 'change_percent'
    ) THEN
        ALTER TABLE market_assets
        ADD COLUMN change_percent DECIMAL(8,2) DEFAULT 0;

        RAISE NOTICE 'Successfully added change_percent column to market_assets table';
    ELSE
        RAISE NOTICE 'change_percent column already exists in market_assets table';
    END IF;
END $$;

-- Update existing records to have 0 as default
UPDATE market_assets
SET change_percent = 0
WHERE change_percent IS NULL;

-- Add comment to the column for documentation
COMMENT ON COLUMN market_assets.change_percent IS 'Daily percentage change in asset price (e.g., 3.45 for +3.45%, -2.10 for -2.10%)';
