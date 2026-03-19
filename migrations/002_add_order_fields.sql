-- Add missing fields to orders table for problem description and photos
ALTER TABLE
    orders
ADD
    COLUMN problem_description TEXT,
ADD
    COLUMN photos TEXT [];

-- Array of photo URLs
-- Add index for better query performance
CREATE INDEX idx_orders_origin_location ON orders USING GIST (origin_location);