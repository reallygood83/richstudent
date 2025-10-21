-- Fix market_assets table schema - Add missing columns
-- Run this in Supabase SQL Editor

-- Add last_updated column
ALTER TABLE market_assets
ADD COLUMN IF NOT EXISTS last_updated TIMESTAMPTZ DEFAULT NOW();

-- Add previous_close column (needed for change_percent calculation)
ALTER TABLE market_assets
ADD COLUMN IF NOT EXISTS previous_close NUMERIC(20, 6);

-- Update existing records with current timestamp
UPDATE market_assets
SET last_updated = NOW()
WHERE last_updated IS NULL;

-- Update previous_close with current_price for existing records
-- This ensures change_percent can be calculated on next update
UPDATE market_assets
SET previous_close = current_price
WHERE previous_close IS NULL;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_market_assets_last_updated
ON market_assets(last_updated DESC);

CREATE INDEX IF NOT EXISTS idx_market_assets_previous_close
ON market_assets(previous_close);

-- Verify the columns were added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'market_assets'
  AND column_name IN ('last_updated', 'previous_close')
ORDER BY column_name;
