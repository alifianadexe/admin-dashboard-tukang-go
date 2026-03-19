-- Add helper function to extract coordinates from geography point
CREATE
OR REPLACE FUNCTION get_order_coordinates(order_id UUID) RETURNS TABLE (lng DOUBLE PRECISION, lat DOUBLE PRECISION) AS $ $ BEGIN RETURN QUERY
SELECT
    ST_X(origin_location :: geometry) AS lng,
    ST_Y(origin_location :: geometry) AS lat
FROM
    orders
WHERE
    id = order_id;

END;

$ $ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_order_coordinates(UUID) TO authenticated,
anon;