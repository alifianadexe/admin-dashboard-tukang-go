-- Migration: Simplify order matching - remove location-based complexity
-- Use simple sequential queue based on partner availability
-- Add service_ids column to profiles table
-- This tracks which services each partner can perform
ALTER TABLE
    profiles
ADD
    COLUMN IF NOT EXISTS service_ids UUID [] DEFAULT '{}';

-- Add comment
COMMENT ON COLUMN profiles.service_ids IS 'Array of service IDs that this partner can perform';

-- Add indexes for faster partner queries
CREATE INDEX IF NOT EXISTS idx_profiles_online_verified ON profiles(is_online, is_verified, role)
WHERE
    role = 'mitra'
    AND is_verified = true;

-- Add index for service matching (GIN index for array containment)
CREATE INDEX IF NOT EXISTS idx_profiles_service_ids ON profiles USING gin(service_ids);

-- Add composite index for priority ordering
CREATE INDEX IF NOT EXISTS idx_profiles_priority ON profiles(rating_avg, total_jobs)
WHERE
    role = 'mitra'
    AND is_verified = true
    AND is_online = true;

-- Make location fields nullable since we're not using proximity matching
ALTER TABLE
    orders
ALTER COLUMN
    origin_location DROP NOT NULL;

-- Update order status constraint to include 'pending' for queue system
ALTER TABLE
    orders DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE
    orders
ADD
    CONSTRAINT orders_status_check CHECK (
        status IN (
            'pending',
            'searching',
            'accepted',
            'arrived',
            'in_progress',
            'payment_pending',
            'completed',
            'cancelled'
        )
    );

-- Update default status to 'pending' for new queue system
ALTER TABLE
    orders
ALTER COLUMN
    status
SET
    DEFAULT 'pending';

-- Add helpful comments
COMMENT ON COLUMN orders.status IS 'Order status: pending (in queue), searching (legacy), accepted, arrived, in_progress, payment_pending, completed, cancelled';

COMMENT ON COLUMN orders.origin_location IS 'Optional location - matching now uses sequential queue instead of proximity';

COMMENT ON COLUMN profiles.is_online IS 'Critical for queue-based matching - only online partners receive order notifications';

-- Add function to get available partners for a service (ordered by priority)
CREATE
OR REPLACE FUNCTION get_available_partners(
    p_service_id UUID,
    p_limit INT DEFAULT 10
) RETURNS TABLE (
    partner_id UUID,
    partner_name TEXT,
    partner_phone TEXT,
    partner_rating DECIMAL,
    total_completed INT,
    priority_score DECIMAL
) AS $ $ BEGIN RETURN QUERY
SELECT
    p.id,
    p.full_name,
    p.phone,
    COALESCE(p.rating_avg, 5.0) as partner_rating,
    COALESCE(p.total_jobs, 0) as total_completed,
    -- Priority score: rating * 10 + (completed orders / 10)
    (
        COALESCE(p.rating_avg, 5.0) * 10 + COALESCE(p.total_jobs, 0) :: DECIMAL / 10
    ) as priority_score
FROM
    profiles p
WHERE
    p.role = 'mitra'
    AND p.is_verified = true
    AND p.is_online = true
    AND p.service_ids @ > ARRAY [p_service_id]
ORDER BY
    priority_score DESC,
    p.created_at ASC -- Tie-breaker: older partners first
LIMIT
    p_limit;

END;

$ $ LANGUAGE plpgsql STABLE;

-- Add comment
COMMENT ON FUNCTION get_available_partners IS 'Returns available partners for a service, ordered by priority (rating + completion history)';