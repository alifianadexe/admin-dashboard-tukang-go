-- Add additional cost and notes fields for order completion
ALTER TABLE
    orders
ADD
    COLUMN IF NOT EXISTS price_additional INTEGER DEFAULT 0,
ADD
    COLUMN IF NOT EXISTS notes TEXT;

-- Update price_total computation to include additional costs
-- Note: price_total should be updated when price_additional is set
-- This is handled in the application code
-- Add comment for documentation
COMMENT ON COLUMN orders.price_additional IS 'Additional cost added by mitra (materials, extra work, etc.)';

COMMENT ON COLUMN orders.notes IS 'Notes about additional charges or work performed';