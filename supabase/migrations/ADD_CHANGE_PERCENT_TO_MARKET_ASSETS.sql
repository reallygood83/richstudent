-- Add change_percent column to market_assets table
-- This stores the daily percentage change from Yahoo Finance API
-- Example: +2.5 means 2.5% increase, -1.2 means 1.2% decrease

ALTER TABLE market_assets
ADD COLUMN IF NOT EXISTS change_percent NUMERIC(10, 2) DEFAULT 0;

COMMENT ON COLUMN market_assets.change_percent IS 'Daily percentage change from previous close (e.g., +2.5 for 2.5% increase)';

-- Update existing records to have 0% change as default
UPDATE market_assets
SET change_percent = 0
WHERE change_percent IS NULL;
