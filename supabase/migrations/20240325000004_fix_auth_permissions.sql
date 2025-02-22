-- Grant access to auth schema and its objects
GRANT USAGE ON SCHEMA auth TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA auth TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA auth TO service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA auth TO service_role;

-- Grant specific permissions for auth.users
GRANT SELECT ON auth.users TO service_role;
GRANT SELECT ON auth.users TO authenticated;

-- Ensure RLS is enabled
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.routes FORCE ROW LEVEL SECURITY;
ALTER TABLE public.houses FORCE ROW LEVEL SECURITY;

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Enable insert for service role" ON public.profiles;
DROP POLICY IF EXISTS "Enable select for authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for users based on id" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Enable select for users and admins" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for users and admins" ON public.profiles;
DROP POLICY IF EXISTS "Routes viewable by admin or assigned driver" ON public.routes;
DROP POLICY IF EXISTS "Routes insertable by admin" ON public.routes;
DROP POLICY IF EXISTS "Routes updatable by admin or assigned driver" ON public.routes;
DROP POLICY IF EXISTS "Routes deletable by admin" ON public.routes;
DROP POLICY IF EXISTS "Houses viewable by admin or route driver" ON public.houses;
DROP POLICY IF EXISTS "Houses insertable by admin" ON public.houses;
DROP POLICY IF EXISTS "Houses updatable by admin or route driver" ON public.houses;
DROP POLICY IF EXISTS "Houses deletable by admin" ON public.houses;

-- Create new policies
CREATE POLICY "Enable insert for authenticated users" ON public.profiles
    FOR INSERT
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable select for users and admins" ON public.profiles
    FOR SELECT
    USING (
        -- Users can see their own profile
        auth.uid() = id
        -- Admins can see all profiles
        OR EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND (auth.users.raw_user_meta_data->>'role')::text = 'admin'
        )
    );

CREATE POLICY "Enable update for users and admins" ON public.profiles
    FOR UPDATE
    USING (
        -- Users can update their own profile
        auth.uid() = id
        -- Admins can update any profile
        OR EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND (auth.users.raw_user_meta_data->>'role')::text = 'admin'
        )
    );

-- Recreate route policies
CREATE POLICY "Routes viewable by admin or assigned driver" ON public.routes
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND (auth.users.raw_user_meta_data->>'role')::text = 'admin'
        )
        OR driver_id = auth.uid()
    );

CREATE POLICY "Routes insertable by admin" ON public.routes
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND (auth.users.raw_user_meta_data->>'role')::text = 'admin'
        )
    );

CREATE POLICY "Routes updatable by admin or assigned driver" ON public.routes
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND (auth.users.raw_user_meta_data->>'role')::text = 'admin'
        )
        OR driver_id = auth.uid()
    );

CREATE POLICY "Routes deletable by admin" ON public.routes
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND (auth.users.raw_user_meta_data->>'role')::text = 'admin'
        )
    );

-- Recreate house policies
CREATE POLICY "Houses viewable by admin or route driver" ON public.houses
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND (auth.users.raw_user_meta_data->>'role')::text = 'admin'
        )
        OR EXISTS (
            SELECT 1 FROM routes 
            WHERE routes.id = route_id 
            AND routes.driver_id = auth.uid()
        )
    );

CREATE POLICY "Houses insertable by admin" ON public.houses
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND (auth.users.raw_user_meta_data->>'role')::text = 'admin'
        )
    );

CREATE POLICY "Houses updatable by admin or route driver" ON public.houses
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND (auth.users.raw_user_meta_data->>'role')::text = 'admin'
        )
        OR EXISTS (
            SELECT 1 FROM routes 
            WHERE routes.id = route_id 
            AND routes.driver_id = auth.uid()
        )
    );

CREATE POLICY "Houses deletable by admin" ON public.houses
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND (auth.users.raw_user_meta_data->>'role')::text = 'admin'
        )
    ); 