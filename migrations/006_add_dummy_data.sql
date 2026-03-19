-- Set dummy location for mitra (Jakarta area)
UPDATE
    profiles
SET
    current_location = ST_SetSRID(ST_MakePoint(106.8456, -6.2088), 4326) :: geography
WHERE
    id IN (
        '7e23c5a1-8e9a-439a-8498-93c5fb894fa4'
    );

-- Create a config table for demo mode settings
CREATE TABLE IF NOT EXISTS app_config (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable demo mode by default
INSERT INTO
    app_config (key, value, description)
VALUES
    (
        'demo_mode',
        '{"enabled": true, "auto_assign_mitra": true, "auto_progress_order": false}' :: jsonb,
        'Demo mode settings for presentations'
    ) ON CONFLICT (key) DO
UPDATE
SET
    value = EXCLUDED.value;

-- Grant permissions
GRANT
SELECT
    ON app_config TO authenticated,
    anon;

-- Function to get demo mode config
CREATE
OR REPLACE FUNCTION get_demo_mode() RETURNS JSONB AS $ $
SELECT
    value
FROM
    app_config
WHERE
    key = 'demo_mode';

$ $ LANGUAGE sql SECURITY DEFINER;

-- Function to get a random available dummy mitra for a service
CREATE
OR REPLACE FUNCTION get_dummy_mitra_for_service(p_service_id UUID) RETURNS TABLE (
    mitra_id UUID,
    mitra_name TEXT,
    mitra_phone TEXT,
    mitra_rating DECIMAL
) AS $ $ BEGIN RETURN QUERY
SELECT
    p.id,
    p.full_name,
    p.phone,
    p.rating_avg
FROM
    profiles p
WHERE
    p.role = 'mitra'
    AND p.is_verified = true
    AND p.is_online = true
    AND p.id IN (
        '7e23c5a1-8e9a-439a-8498-93c5fb894fa4'
    )
ORDER BY
    RANDOM()
LIMIT
    1;

END;

$ $ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_demo_mode() TO authenticated,
anon;

GRANT EXECUTE ON FUNCTION get_dummy_mitra_for_service(UUID) TO authenticated,
anon;

-- Add comment
COMMENT ON TABLE app_config IS 'Application configuration for demo mode and other settings';