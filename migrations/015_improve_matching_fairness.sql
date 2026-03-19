-- Migration: Improve Partner Matching Fairness
-- Description: 
--   1. Exclude busy partners (already working on active orders)
--   2. Track daily job distribution for fairness
--   3. Prioritize partners with fewer jobs today
--   4. Balance experience vs. opportunity for new partners
-- Drop existing function first (return type changed)
DROP FUNCTION IF EXISTS get_available_partners(UUID, INT);

-- Update get_available_partners function with fairness improvements
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
    jobs_today INT,
    priority_score DECIMAL
) AS $ $ BEGIN RETURN QUERY
SELECT
    p.id,
    p.full_name,
    p.phone,
    COALESCE(p.rating_avg, 5.0) as partner_rating,
    COALESCE(p.total_jobs, 0) as total_completed,
    -- Count jobs accepted today
    (
        SELECT
            COUNT(*) :: INT
        FROM
            orders o
        WHERE
            o.mitra_id = p.id
            AND DATE(o.accepted_at) = CURRENT_DATE
    ) as jobs_today,
    -- Fairer priority score:
    -- 1. Fewer jobs today = higher priority (30 points max)
    -- 2. Quality rating (20 points max)
    -- 3. Small experience bonus (5 points max, capped at 50 total jobs)
    (
        (
            30 - LEAST(
                (
                    SELECT
                        COUNT(*)
                    FROM
                        orders o
                    WHERE
                        o.mitra_id = p.id
                        AND DATE(o.accepted_at) = CURRENT_DATE
                ),
                3
            ) * 10
        ) + -- Fewer today = higher (0-3 jobs max)
        (COALESCE(p.rating_avg, 5.0) * 4) + -- Quality: 4.0-5.0 rating = 16-20 pts
        (
            LEAST(COALESCE(p.total_jobs, 0), 50) :: DECIMAL / 10
        ) -- Experience: max 5 pts
    ) as priority_score
FROM
    profiles p
WHERE
    p.role = 'mitra'
    AND p.is_verified = true
    AND p.is_online = true
    AND p.service_ids @ > ARRAY [p_service_id] -- FAIRNESS: Exclude partners already working on active orders
    AND NOT EXISTS (
        SELECT
            1
        FROM
            orders o
        WHERE
            o.mitra_id = p.id
            AND o.status IN ('accepted', 'arrived', 'in_progress')
    )
ORDER BY
    priority_score DESC,
    p.created_at ASC -- Tie-breaker: older accounts first
LIMIT
    p_limit;

END;

$ $ LANGUAGE plpgsql STABLE;

-- Update comment to reflect fairness improvements
COMMENT ON FUNCTION get_available_partners IS 'Returns available partners for a service with fair distribution:
- Excludes partners already working on active orders
- Prioritizes partners with fewer jobs today (max 30 pts)
- Considers quality rating (max 20 pts)  
- Small experience bonus (max 5 pts)
This ensures new partners get opportunities while maintaining quality.';

-- Add index to optimize active orders check (busy partner detection)
CREATE INDEX IF NOT EXISTS idx_orders_mitra_active_status ON orders(mitra_id, status)
WHERE
    status IN ('accepted', 'arrived', 'in_progress');

-- Add index to optimize daily job count queries
-- Using accepted_at directly (PostgreSQL will still use this efficiently for date comparisons)
CREATE INDEX IF NOT EXISTS idx_orders_mitra_accepted_at ON orders(mitra_id, accepted_at)
WHERE
    status IN (
        'accepted',
        'arrived',
        'in_progress',
        'completed'
    )
    AND accepted_at IS NOT NULL;

COMMENT ON INDEX idx_orders_mitra_active_status IS 'Optimizes checking if partner has active orders (busy check)';

COMMENT ON INDEX idx_orders_mitra_accepted_at IS 'Optimizes daily job count queries for fair partner distribution';