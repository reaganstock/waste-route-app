-- Drop existing functions
DROP FUNCTION IF EXISTS calculate_route_efficiency(numeric, numeric, numeric);
DROP FUNCTION IF EXISTS calculate_driver_metrics(uuid, timestamp, timestamp);
DROP FUNCTION IF EXISTS calculate_team_metrics(timestamp, timestamp);
DROP FUNCTION IF EXISTS calculate_route_metrics(uuid);
DROP FUNCTION IF EXISTS get_top_performers(timestamp, timestamp, integer);

-- Function to calculate route efficiency using 60/40 formula
CREATE OR REPLACE FUNCTION calculate_route_efficiency(
    completion_rate numeric,
    houses_per_hour numeric,
    total_houses numeric
)
RETURNS numeric AS $$
BEGIN
    -- Completion component (60% weight)
    -- completion_rate is already a percentage (0-100)
    -- Speed component (40% weight)
    -- Normalize houses per hour against expected rate (total_houses / 8 hours)
    RETURN ROUND(
        (completion_rate * 0.6) + 
        (LEAST((houses_per_hour / NULLIF(total_houses / 8, 0)) * 100, 100) * 0.4)
    , 2);
END;
$$ LANGUAGE plpgsql;

-- Function to calculate driver metrics
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
            r.total_houses,
            COUNT(h.id) FILTER (WHERE h.status = 'collect') as collected_houses,
            COUNT(h.id) as total_houses_actual,
            COUNT(h.id) FILTER (WHERE h.status IN ('skip', 'new customer')) as special_count
        FROM routes r
        LEFT JOIN houses h ON h.route_id = r.id
        WHERE r.driver_id = driver_id
        AND (start_date IS NULL OR r.date >= start_date)
        AND (end_date IS NULL OR r.date <= end_date)
        GROUP BY r.id, r.total_houses
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
        COALESCE(SUM(rm.collected_houses) FILTER (WHERE rm.status = 'completed'), 0)::bigint,
        COUNT(rm.id) FILTER (WHERE rm.status = 'completed')::bigint,
        COALESCE(SUM(rm.duration) FILTER (WHERE rm.status = 'completed'), 0),
        COALESCE(
            AVG(
                calculate_route_efficiency(
                    (rm.collected_houses::numeric / NULLIF(rm.total_houses, 0) * 100),
                    CASE 
                        WHEN rm.duration > 0 
                        THEN rm.collected_houses::numeric / rm.duration
                        ELSE 0 
                    END,
                    rm.total_houses::numeric
                )
            ) FILTER (WHERE rm.status = 'completed'),
            0
        ),
        CASE 
            WHEN SUM(rm.duration) FILTER (WHERE rm.status = 'completed') > 0 
            THEN ROUND(
                SUM(rm.collected_houses) FILTER (WHERE rm.status = 'completed')::numeric / 
                NULLIF(SUM(rm.duration) FILTER (WHERE rm.status = 'completed'), 0),
                2
            )
            ELSE 0
        END,
        COALESCE((SELECT houses_today FROM today_metrics), 0)::bigint,
        COALESCE((SELECT routes_today FROM today_metrics), 0)::bigint,
        COALESCE(SUM(rm.special_count), 0)::bigint
    FROM route_metrics rm;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate team metrics
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
            r.total_houses,
            COUNT(h.id) FILTER (WHERE h.status = 'collect') as collected_houses,
            COUNT(h.id) as total_houses_actual,
            COUNT(h.id) FILTER (WHERE h.status IN ('skip', 'new customer')) as special_count
        FROM routes r
        LEFT JOIN houses h ON h.route_id = r.id
        WHERE (start_date IS NULL OR r.date >= start_date)
        AND (end_date IS NULL OR r.date <= end_date)
        GROUP BY r.id, r.total_houses
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
        COALESCE(SUM(rm.collected_houses) FILTER (WHERE rm.status = 'completed'), 0)::bigint,
        COUNT(rm.id) FILTER (WHERE rm.status = 'completed')::bigint,
        COALESCE(SUM(rm.duration) FILTER (WHERE rm.status = 'completed'), 0),
        COALESCE(
            AVG(
                calculate_route_efficiency(
                    (rm.collected_houses::numeric / NULLIF(rm.total_houses, 0) * 100),
                    CASE 
                        WHEN rm.duration > 0 
                        THEN rm.collected_houses::numeric / rm.duration
                        ELSE 0 
                    END,
                    rm.total_houses::numeric
                )
            ) FILTER (WHERE rm.status = 'completed'),
            0
        ),
        CASE 
            WHEN SUM(rm.duration) FILTER (WHERE rm.status = 'completed') > 0 
            THEN ROUND(
                SUM(rm.collected_houses) FILTER (WHERE rm.status = 'completed')::numeric / 
                NULLIF(SUM(rm.duration) FILTER (WHERE rm.status = 'completed'), 0),
                2
            )
            ELSE 0
        END,
        CASE 
            WHEN COUNT(rm.id) > 0 
            THEN ROUND(
                (COUNT(rm.id) FILTER (WHERE rm.status = 'completed')::numeric / 
                NULLIF(COUNT(rm.id), 0) * 100),
                2
            )
            ELSE 0
        END,
        COUNT(rm.id) FILTER (WHERE rm.status = 'expired')::bigint,
        COALESCE(SUM(rm.special_count), 0)::bigint,
        COALESCE((SELECT houses_today FROM today_metrics), 0)::bigint,
        COALESCE((SELECT routes_today FROM today_metrics), 0)::bigint
    FROM route_metrics rm;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate route metrics
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
            r.total_houses,
            COUNT(h.id) as total_houses_actual,
            COUNT(h.id) FILTER (WHERE h.status = 'collect') as collected_houses,
            COUNT(h.id) FILTER (WHERE h.status IN ('skip', 'new customer')) as special_count
        FROM routes r
        LEFT JOIN houses h ON h.route_id = r.id
        WHERE r.id = route_id
        GROUP BY r.id, r.duration, r.total_houses
    )
    SELECT 
        rd.total_houses_actual::bigint,
        rd.collected_houses::bigint,
        rd.special_count::bigint,
        calculate_route_efficiency(
            (rd.collected_houses::numeric / NULLIF(rd.total_houses, 0) * 100),
            CASE 
                WHEN rd.duration > 0 
                THEN rd.collected_houses::numeric / rd.duration
                ELSE 0 
            END,
            rd.total_houses::numeric
        ),
        COALESCE(rd.duration, 0),
        CASE 
            WHEN rd.duration > 0 
            THEN ROUND(rd.collected_houses::numeric / NULLIF(rd.duration, 0), 2)
            ELSE 0
        END
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
            AVG(
                calculate_route_efficiency(
                    (COUNT(h.id) FILTER (WHERE h.status = 'collect')::numeric / 
                     NULLIF(r.total_houses, 0) * 100),
                    CASE 
                        WHEN r.duration > 0 
                        THEN COUNT(h.id) FILTER (WHERE h.status = 'collect')::numeric / r.duration
                        ELSE 0 
                    END,
                    r.total_houses::numeric
                )
            ) FILTER (WHERE r.status = 'completed') as avg_efficiency
        FROM profiles p
        LEFT JOIN routes r ON r.driver_id = p.id
        LEFT JOIN houses h ON h.route_id = r.id
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