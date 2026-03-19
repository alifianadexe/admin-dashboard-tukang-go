-- Add rating and review columns to orders table
-- These are set by the client after order completion
ALTER TABLE
    orders
ADD
    COLUMN IF NOT EXISTS rating INTEGER CHECK (
        rating >= 1
        AND rating <= 5
    );

ALTER TABLE
    orders
ADD
    COLUMN IF NOT EXISTS review TEXT;

-- Add comments for documentation
COMMENT ON COLUMN orders.rating IS 'Client rating for the mitra (1-5 stars)';

COMMENT ON COLUMN orders.review IS 'Client review text for the completed order';

-- Create index for rating queries (useful for analytics)
CREATE INDEX IF NOT EXISTS idx_orders_rating ON orders(rating)
WHERE
    rating IS NOT NULL;