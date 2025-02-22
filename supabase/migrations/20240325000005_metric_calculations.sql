-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS calculate_driver_metrics(driver_id uuid, start_date timestamp, end_date timestamp);
DROP FUNCTION IF EXISTS calculate_team_metrics(start_date timestamp, end_date timestamp);
DROP FUNCTION IF EXISTS calculate_route_metrics(route_id uuid);

-- Function to calculate individual driver metrics
CREATE OR REPLACE FUNCTION calculate_driver_metrics(
    driver_id uuid,
    start_date timestamp DEFAULT NULL,
    end_date timestamp DEFAULT NULL
)
RETURNS TABLE (
    total_houses_serviced bigint,
    total_routes_completed bigint,
    total_hours_driven numeric,
    average_efficiency numeric,
    houses_per_hour numeric,
    todays_houses bigint,
    todays_routes bigint,
    special_houses bigint
) AS $$
BEGIN
    RETURN QUERY
    WITH route_metrics AS (
        SELECT 
            r.id,
            r.status,
            r.duration,
            r.efficiency,
            r.date,
            COUNT(h.id) FILTER (WHERE h.status = 'collect') as collected_houses,
            COUNT(h.id) as total_houses,
            COUNT(h.id) FILTER (WHERE h.status IN ('skip', 'new customer')) as special_count
        FROM routes r
        LEFT JOIN houses h ON h.route_id = r.id
        WHERE r.driver_id = driver_id
        AND (start_date IS NULL OR r.date >= start_date)
        AND (end_date IS NULL OR r.date <= end_date)
        GROUP BY r.id
    ),
    today_metrics AS (
        SELECT 
            COUNT(h.id) as houses_today,
            COUNT(DISTINCT r.id) as routes_today
        FROM routes r
        LEFT JOIN houses h ON h.route_id = r.id
        WHERE r.driver_id = driver_id
        AND DATE(r.date) = CURRENT_DATE
        AND r.status NOT IN ('completed', 'expired')
    )
    SELECT 
        COALESCE(SUM(rm.collected_houses) FILTER (WHERE rm.status = 'completed'), 0)::bigint as total_houses_serviced,
        COUNT(rm.id) FILTER (WHERE rm.status = 'completed')::bigint as total_routes_completed,
        COALESCE(SUM(rm.duration) FILTER (WHERE rm.status = 'completed'), 0) as total_hours_driven,
        COALESCE(AVG(rm.efficiency) FILTER (WHERE rm.status = 'completed'), 0) as average_efficiency,
        CASE 
            WHEN SUM(rm.duration) FILTER (WHERE rm.status = 'completed') > 0 
            THEN COALESCE(SUM(rm.collected_houses) FILTER (WHERE rm.status = 'completed') / 
                         NULLIF(SUM(rm.duration) FILTER (WHERE rm.status = 'completed'), 0), 0)
            ELSE 0
        END as houses_per_hour,
        COALESCE((SELECT houses_today FROM today_metrics), 0)::bigint as todays_houses,
        COALESCE((SELECT routes_today FROM today_metrics), 0)::bigint as todays_routes,
        COALESCE(SUM(rm.special_count), 0)::bigint as special_houses
    FROM route_metrics rm;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate team-wide metrics
CREATE OR REPLACE FUNCTION calculate_team_metrics(
    start_date timestamp DEFAULT NULL,
    end_date timestamp DEFAULT NULL
)
RETURNS TABLE (
    total_houses_serviced bigint,
    total_routes_completed bigint,
    total_hours_driven numeric,
    average_efficiency numeric,
    houses_per_hour numeric,
    completion_rate numeric,
    expired_routes bigint,
    special_houses bigint,
    todays_houses bigint,
    todays_routes bigint
) AS $$
BEGIN
    RETURN QUERY
    WITH route_metrics AS (
        SELECT 
            r.id,
            r.status,
            r.duration,
            r.efficiency,
            r.date,
            COUNT(h.id) FILTER (WHERE h.status = 'collect') as collected_houses,
            COUNT(h.id) as total_houses,
            COUNT(h.id) FILTER (WHERE h.status IN ('skip', 'new customer')) as special_count
        FROM routes r
        LEFT JOIN houses h ON h.route_id = r.id
        WHERE (start_date IS NULL OR r.date >= start_date)
        AND (end_date IS NULL OR r.date <= end_date)
        GROUP BY r.id
    ),
    today_metrics AS (
        SELECT 
            COUNT(h.id) as houses_today,
            COUNT(DISTINCT r.id) as routes_today
        FROM routes r
        LEFT JOIN houses h ON h.route_id = r.id
        WHERE DATE(r.date) = CURRENT_DATE
        AND r.status NOT IN ('completed', 'expired')
    )
    SELECT 
        COALESCE(SUM(rm.collected_houses) FILTER (WHERE rm.status = 'completed'), 0)::bigint as total_houses_serviced,
        COUNT(rm.id) FILTER (WHERE rm.status = 'completed')::bigint as total_routes_completed,
        COALESCE(SUM(rm.duration) FILTER (WHERE rm.status = 'completed'), 0) as total_hours_driven,
        COALESCE(AVG(rm.efficiency) FILTER (WHERE rm.status = 'completed'), 0) as average_efficiency,
        CASE 
            WHEN SUM(rm.duration) FILTER (WHERE rm.status = 'completed') > 0 
            THEN COALESCE(SUM(rm.collected_houses) FILTER (WHERE rm.status = 'completed') / 
                         NULLIF(SUM(rm.duration) FILTER (WHERE rm.status = 'completed'), 0), 0)
            ELSE 0
        END as houses_per_hour,
        CASE 
            WHEN COUNT(rm.id) > 0 
            THEN (COUNT(rm.id) FILTER (WHERE rm.status = 'completed')::numeric / 
                 NULLIF(COUNT(rm.id), 0) * 100)
            ELSE 0
        END as completion_rate,
        COUNT(rm.id) FILTER (WHERE rm.status = 'expired')::bigint as expired_routes,
        COALESCE(SUM(rm.special_count), 0)::bigint as special_houses,
        COALESCE((SELECT houses_today FROM today_metrics), 0)::bigint as todays_houses,
        COALESCE((SELECT routes_today FROM today_metrics), 0)::bigint as todays_routes
    FROM route_metrics rm;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate individual route metrics
CREATE OR REPLACE FUNCTION calculate_route_metrics(route_id uuid)
RETURNS TABLE (
    total_houses bigint,
    houses_collected bigint,
    special_houses bigint,
    efficiency numeric,
    duration numeric,
    houses_per_hour numeric
) AS $$
BEGIN
    RETURN QUERY
    WITH route_data AS (
        SELECT 
            r.duration,
            r.efficiency,
            COUNT(h.id) as total_houses,
            COUNT(h.id) FILTER (WHERE h.status = 'collect') as collected_houses,
            COUNT(h.id) FILTER (WHERE h.status IN ('skip', 'new customer')) as special_count
        FROM routes r
        LEFT JOIN houses h ON h.route_id = r.id
        WHERE r.id = route_id
        GROUP BY r.id, r.duration, r.efficiency
    )
    SELECT 
        rd.total_houses::bigint,
        rd.collected_houses::bigint,
        rd.special_count::bigint,
        COALESCE(rd.efficiency, 0) as efficiency,
        COALESCE(rd.duration, 0) as duration,
        CASE 
            WHEN rd.duration > 0 
            THEN ROUND(CAST(rd.collected_houses AS numeric) / NULLIF(rd.duration, 0), 2)
            ELSE 0
        END as houses_per_hour
    FROM route_data rd;
END;
$$ LANGUAGE plpgsql;

-- Function to get top performers
CREATE OR REPLACE FUNCTION get_top_performers(
    start_date timestamp,
    end_date timestamp,
    limit_count integer DEFAULT 5
)
RETURNS TABLE (
    driver_id uuid,
    full_name text,
    routes_completed bigint,
    efficiency numeric
) AS $$
BEGIN
    RETURN QUERY
    WITH driver_metrics AS (
        SELECT 
            p.id,
            p.full_name,
            COUNT(r.id) FILTER (WHERE r.status = 'completed') as completed_routes,
            AVG(r.efficiency) FILTER (WHERE r.status = 'completed') as avg_efficiency
        FROM profiles p
        LEFT JOIN routes r ON r.driver_id = p.id
        WHERE r.date >= start_date
        AND r.date <= end_date
        AND p.role = 'driver'
        GROUP BY p.id, p.full_name
    )
    SELECT 
        dm.id,
        dm.full_name,
        dm.completed_routes,
        COALESCE(dm.avg_efficiency, 0) as efficiency
    FROM driver_metrics dm
    WHERE dm.completed_routes > 0
    ORDER BY dm.avg_efficiency DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql; 