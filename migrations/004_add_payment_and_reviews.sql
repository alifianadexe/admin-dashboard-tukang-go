-- Add payment_method to orders table
ALTER TABLE
    orders
ADD
    COLUMN IF NOT EXISTS payment_method TEXT CHECK (
        payment_method IN ('wallet', 'bank_transfer', 'cash')
    );

-- Create reviews table
CREATE TABLE IF NOT EXISTS reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    mitra_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (
        rating >= 1
        AND rating <= 5
    ),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(order_id) -- One review per order
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_reviews_mitra ON reviews(mitra_id);

CREATE INDEX IF NOT EXISTS idx_reviews_client ON reviews(client_id);

CREATE INDEX IF NOT EXISTS idx_reviews_order ON reviews(order_id);

-- Create RPC function to update mitra rating average
CREATE
OR REPLACE FUNCTION update_mitra_rating(mitra_user_id UUID) RETURNS void AS $ $ DECLARE avg_rating DECIMAL(3, 2);

review_count INTEGER;

BEGIN -- Calculate average rating and count
SELECT
    COALESCE(AVG(rating), 0) :: DECIMAL(3, 2),
    COUNT(*) INTO avg_rating,
    review_count
FROM
    reviews
WHERE
    mitra_id = mitra_user_id;

-- Update mitra profile
UPDATE
    profiles
SET
    rating_avg = avg_rating,
    rating_count = review_count,
    updated_at = NOW()
WHERE
    id = mitra_user_id
    AND role = 'mitra';

END;

$ $ LANGUAGE plpgsql;

-- Add rating_count column to profiles if not exists
ALTER TABLE
    profiles
ADD
    COLUMN IF NOT EXISTS rating_count INTEGER DEFAULT 0;

-- Add comments
COMMENT ON COLUMN orders.payment_method IS 'Payment method used: wallet, bank_transfer, or cash';

COMMENT ON TABLE reviews IS 'Client reviews and ratings for completed orders';

COMMENT ON FUNCTION update_mitra_rating IS 'Recalculates and updates mitra average rating based on all reviews';