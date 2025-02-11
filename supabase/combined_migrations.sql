-- Add hours_driven column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS hours_driven numeric(10,2) DEFAULT 0;

-- Update any existing rows to have the default value
UPDATE public.profiles 
SET hours_driven = 0 
WHERE hours_driven IS NULL;

-- Drop existing policies
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can create profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authentication users" ON public.profiles;
DROP POLICY IF EXISTS "Enable select for authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for users based on id" ON public.profiles;

-- Temporarily disable RLS to clean up any inconsistencies
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Create new policies with more permissive signup
CREATE POLICY "Enable read access for all users" ON public.profiles
    FOR SELECT
    USING (true);

CREATE POLICY "Enable insert for users signing up" ON public.profiles
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Enable update for users based on id" ON public.profiles
    FOR UPDATE
    USING (
        auth.uid() = id 
        OR EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Re-enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY; 