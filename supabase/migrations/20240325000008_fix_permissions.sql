-- Grant schema usage
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

-- Grant table permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, authenticated, service_role;

-- Grant authenticated users access to specific functions
GRANT EXECUTE ON FUNCTION calculate_driver_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_team_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_route_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_route_efficiency TO authenticated;
GRANT EXECUTE ON FUNCTION get_top_performers TO authenticated;

-- Ensure RLS is enabled
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.routes FORCE ROW LEVEL SECURITY;
ALTER TABLE public.houses FORCE ROW LEVEL SECURITY;

-- Update RLS policies for metrics access
CREATE POLICY "Allow users to execute metrics functions"
    ON public.profiles
    FOR SELECT
    USING (
        -- Users can see their own metrics
        auth.uid() = id
        -- Admins can see all metrics
        OR EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND (auth.users.raw_user_meta_data->>'role')::text = 'admin'
        )
    );

-- Grant access to auth schema for service role
GRANT USAGE ON SCHEMA auth TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA auth TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA auth TO service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA auth TO service_role;

-- Allow authenticated users to read auth.users
GRANT SELECT ON auth.users TO authenticated; 