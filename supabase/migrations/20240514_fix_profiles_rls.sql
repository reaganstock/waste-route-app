-- Create the profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid references auth.users on delete cascade primary key,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  full_name text not null,
  email text not null unique,
  role text not null default 'owner',
  status text not null default 'active',
  phone text,
  preferred_region text,
  start_date date default now(),
  avatar_url text,
  hours_driven numeric(10,2) default 0,
  team_id uuid
);

-- Drop existing policies to ensure no conflicts
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can create profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authentication users" ON public.profiles;
DROP POLICY IF EXISTS "Enable select for authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for users based on id" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for users signing up" ON public.profiles;

-- Temporarily disable RLS to ensure we can fix any issues
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Create new simplified policies with full access for authenticated users
CREATE POLICY "profiles_select_policy" 
  ON public.profiles 
  FOR SELECT 
  USING (auth.role() = 'authenticated');

CREATE POLICY "profiles_insert_policy" 
  ON public.profiles 
  FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "profiles_update_policy" 
  ON public.profiles 
  FOR UPDATE 
  USING (auth.role() = 'authenticated');

CREATE POLICY "profiles_delete_policy" 
  ON public.profiles 
  FOR DELETE 
  USING (auth.role() = 'authenticated');

-- Re-enable RLS with the new policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY; 