-- Drop conflicting policies
DROP POLICY IF EXISTS "Enable insert for service role" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Service role can create profiles" ON public.profiles;
DROP POLICY IF EXISTS "Enable select for authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for users based on id" ON public.profiles;

-- Create new policies
CREATE POLICY "Service role can create profiles"
    ON public.profiles
    FOR INSERT
    WITH CHECK (
        -- Allow service role to create profiles during signup
        (current_user = 'service_role' AND auth.jwt() ->> 'role' = 'service_role')
        -- Allow authenticated users to create their own profile
        OR auth.uid() = id
    );

CREATE POLICY "Enable read access for authenticated users"
    ON public.profiles
    FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Enable update for users and admins"
    ON public.profiles
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

-- Ensure RLS is enabled but service role can bypass
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Grant explicit permissions to service role
GRANT ALL ON public.profiles TO service_role;
GRANT USAGE ON SCHEMA public TO service_role;

-- Ensure the trigger has proper permissions
ALTER FUNCTION public.handle_new_user() SECURITY DEFINER; 