-- Add last_updated column to market_assets table
-- Run this in Supabase SQL Editor

ALTER TABLE market_assets
ADD COLUMN IF NOT EXISTS last_updated TIMESTAMPTZ DEFAULT NOW();

-- Update existing records with current timestamp
UPDATE market_assets
SET last_updated = NOW()
WHERE last_updated IS NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_market_assets_last_updated
ON market_assets(last_updated DESC);

-- Verify the column was added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'market_assets' AND column_name = 'last_updated';
