-- Add timestamp columns for order progress tracking
ALTER TABLE
    orders
ADD
    COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ,
ADD
    COLUMN IF NOT EXISTS arrived_at TIMESTAMPTZ,
ADD
    COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;

-- Add comments for documentation
COMMENT ON COLUMN orders.accepted_at IS 'Timestamp when mitra accepted the order';

COMMENT ON COLUMN orders.arrived_at IS 'Timestamp when mitra arrived at location';

COMMENT ON COLUMN orders.started_at IS 'Timestamp when mitra started working on the job';