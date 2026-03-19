-- Add working_days column to orders table
ALTER TABLE
    orders
ADD
    COLUMN IF NOT EXISTS working_days INTEGER DEFAULT 1 CHECK (
        working_days >= 1
        AND working_days <= 30
    );

-- Add comment for documentation
COMMENT ON COLUMN orders.working_days IS 'Estimated number of working days for this job (set by client, affects total price)';

-- Update price calculation note
-- price_total = price_base * working_days + price_additional