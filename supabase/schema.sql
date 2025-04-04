-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Set timezone
ALTER DATABASE postgres SET timezone TO 'UTC';

-- Create custom types for status enums
CREATE TYPE public.route_status AS ENUM ('pending', 'in_progress', 'completed');
CREATE TYPE public.house_status AS ENUM ('pending', 'completed', 'skip', 'new customer');
CREATE TYPE public.user_role AS ENUM ('owner', 'admin', 'driver');
CREATE TYPE public.user_status AS ENUM ('pending', 'active', 'inactive');

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'owner',
    status TEXT NOT NULL DEFAULT 'active',
    phone TEXT,
    preferred_region TEXT,
    start_date DATE DEFAULT NOW(),
    avatar_url TEXT,
    hours_driven NUMERIC(10,2) DEFAULT 0,
    team_id UUID
);

-- Create teams table
CREATE TABLE IF NOT EXISTS public.teams (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    name TEXT NOT NULL,
    owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    region TEXT
);

-- Add foreign key to profiles for team_id
ALTER TABLE public.profiles 
ADD CONSTRAINT fk_profiles_team 
FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE SET NULL;

-- Create team_members junction table
CREATE TABLE IF NOT EXISTS public.team_members (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    UNIQUE(team_id, profile_id)
);

-- Create team_invites table
CREATE TABLE IF NOT EXISTS public.team_invites (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
    invited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'driver',
    status TEXT NOT NULL DEFAULT 'pending',
    invitation_date TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(team_id, email)
);

-- Create routes table
CREATE TABLE IF NOT EXISTS public.routes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    name TEXT NOT NULL,
    date TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    duration NUMERIC(5,2) DEFAULT 0,
    completed_houses INTEGER DEFAULT 0,
    total_houses INTEGER NOT NULL CHECK (total_houses > 0),
    efficiency NUMERIC(5,2) DEFAULT 0 CHECK (efficiency >= 0 AND efficiency <= 100),
    driver_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    notes TEXT
);

-- Create houses table
CREATE TABLE IF NOT EXISTS public.houses (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    address TEXT NOT NULL,
    lat NUMERIC(10,8) NOT NULL CHECK (lat >= -90 AND lat <= 90),
    lng NUMERIC(11,8) NOT NULL CHECK (lng >= -180 AND lng <= 180),
    status TEXT NOT NULL DEFAULT 'pending',
    notes TEXT,
    route_id UUID REFERENCES public.routes(id) ON DELETE CASCADE NOT NULL,
    is_new_customer BOOLEAN DEFAULT FALSE,
    estimated_time NUMERIC(5,2) DEFAULT 5.00, -- minutes
    priority INTEGER DEFAULT 0
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS routes_date_idx ON public.routes(date);
CREATE INDEX IF NOT EXISTS routes_status_idx ON public.routes(status);
CREATE INDEX IF NOT EXISTS routes_driver_id_idx ON public.routes(driver_id);
CREATE INDEX IF NOT EXISTS routes_team_id_idx ON public.routes(team_id);
CREATE INDEX IF NOT EXISTS houses_route_id_idx ON public.houses(route_id);
CREATE INDEX IF NOT EXISTS houses_status_idx ON public.houses(status);
CREATE INDEX IF NOT EXISTS profiles_team_id_idx ON public.profiles(team_id);
CREATE INDEX IF NOT EXISTS team_members_team_id_idx ON public.team_members(team_id);
CREATE INDEX IF NOT EXISTS team_members_profile_id_idx ON public.team_members(profile_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.houses ENABLE ROW LEVEL SECURITY;

-- PROFILES policies
-- Drop existing policies if they exist (for clean installs)
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON public.profiles;

-- Create simplified profiles policies
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

-- TEAMS policies
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "teams_select_policy" ON public.teams;
DROP POLICY IF EXISTS "teams_insert_policy" ON public.teams;
DROP POLICY IF EXISTS "teams_update_policy" ON public.teams;
DROP POLICY IF EXISTS "teams_delete_policy" ON public.teams;

-- Create simplified teams policies
CREATE POLICY "teams_select_policy" 
  ON public.teams 
  FOR SELECT 
  USING (auth.role() = 'authenticated');

CREATE POLICY "teams_insert_policy" 
  ON public.teams 
  FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "teams_update_policy" 
  ON public.teams 
  FOR UPDATE 
  USING (auth.role() = 'authenticated');

CREATE POLICY "teams_delete_policy" 
  ON public.teams 
  FOR DELETE 
  USING (auth.role() = 'authenticated');

-- TEAM_MEMBERS policies
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "team_members_select_policy" ON public.team_members;
DROP POLICY IF EXISTS "team_members_insert_policy" ON public.team_members;
DROP POLICY IF EXISTS "team_members_update_policy" ON public.team_members;
DROP POLICY IF EXISTS "team_members_delete_policy" ON public.team_members;

-- Create simplified team_members policies
CREATE POLICY "team_members_select_policy" 
  ON public.team_members 
  FOR SELECT 
  USING (auth.role() = 'authenticated');

CREATE POLICY "team_members_insert_policy" 
  ON public.team_members 
  FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "team_members_update_policy" 
  ON public.team_members 
  FOR UPDATE 
  USING (auth.role() = 'authenticated');

CREATE POLICY "team_members_delete_policy" 
  ON public.team_members 
  FOR DELETE 
  USING (auth.role() = 'authenticated');

-- TEAM_INVITES policies
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "team_invites_select_policy" ON public.team_invites;
DROP POLICY IF EXISTS "team_invites_insert_policy" ON public.team_invites;
DROP POLICY IF EXISTS "team_invites_update_policy" ON public.team_invites;
DROP POLICY IF EXISTS "team_invites_delete_policy" ON public.team_invites;

-- Create simplified team_invites policies
CREATE POLICY "team_invites_select_policy" 
  ON public.team_invites 
  FOR SELECT 
  USING (auth.role() = 'authenticated');

CREATE POLICY "team_invites_insert_policy" 
  ON public.team_invites 
  FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "team_invites_update_policy" 
  ON public.team_invites 
  FOR UPDATE 
  USING (auth.role() = 'authenticated');

CREATE POLICY "team_invites_delete_policy" 
  ON public.team_invites 
  FOR DELETE 
  USING (auth.role() = 'authenticated');

-- ROUTES policies
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "routes_select_policy" ON public.routes;
DROP POLICY IF EXISTS "routes_insert_policy" ON public.routes;
DROP POLICY IF EXISTS "routes_update_policy" ON public.routes;
DROP POLICY IF EXISTS "routes_delete_policy" ON public.routes;

-- Create simplified routes policies
CREATE POLICY "routes_select_policy" 
  ON public.routes 
  FOR SELECT 
  USING (auth.role() = 'authenticated');

CREATE POLICY "routes_insert_policy" 
  ON public.routes 
  FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "routes_update_policy" 
  ON public.routes 
  FOR UPDATE 
  USING (auth.role() = 'authenticated');

CREATE POLICY "routes_delete_policy" 
  ON public.routes 
  FOR DELETE 
  USING (auth.role() = 'authenticated');

-- HOUSES policies
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "houses_select_policy" ON public.houses;
DROP POLICY IF EXISTS "houses_insert_policy" ON public.houses;
DROP POLICY IF EXISTS "houses_update_policy" ON public.houses;
DROP POLICY IF EXISTS "houses_delete_policy" ON public.houses;

-- Create simplified houses policies
CREATE POLICY "houses_select_policy" 
  ON public.houses 
  FOR SELECT 
  USING (auth.role() = 'authenticated');

CREATE POLICY "houses_insert_policy" 
  ON public.houses 
  FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "houses_update_policy" 
  ON public.houses 
  FOR UPDATE 
  USING (auth.role() = 'authenticated');

CREATE POLICY "houses_delete_policy" 
  ON public.houses 
  FOR DELETE 
  USING (auth.role() = 'authenticated');

-- Create functions
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to calculate route efficiency
CREATE OR REPLACE FUNCTION public.calculate_route_efficiency()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.total_houses > 0 THEN
        NEW.efficiency = (NEW.completed_houses::NUMERIC / NEW.total_houses::NUMERIC) * 100;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to create a team for a new user
CREATE OR REPLACE FUNCTION public.create_team_for_profile()
RETURNS TRIGGER AS $$
DECLARE
  new_team_id UUID;
BEGIN
    -- CRITICAL FIX: ALWAYS create a new team for owners, REGARDLESS OF ANYTHING ELSE
    IF NEW.role = 'owner' THEN
        INSERT INTO public.teams (name, owner_id, region)
        VALUES (
            COALESCE(NEW.full_name || '''s Team', 'New Team'),
            NEW.id,
            NEW.preferred_region
        )
        RETURNING id INTO new_team_id;
        
        -- Update the profile with the new team_id
        UPDATE public.profiles
        SET team_id = new_team_id
        WHERE id = NEW.id;
        
        -- Add the profile as a member of the team
        INSERT INTO public.team_members (team_id, profile_id)
        VALUES (new_team_id, NEW.id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
CREATE TRIGGER handle_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_teams_updated_at
    BEFORE UPDATE ON public.teams
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_team_members_updated_at
    BEFORE UPDATE ON public.team_members
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_team_invites_updated_at
    BEFORE UPDATE ON public.team_invites
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_routes_updated_at
    BEFORE UPDATE ON public.routes
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_houses_updated_at
    BEFORE UPDATE ON public.houses
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER calculate_route_efficiency
    BEFORE INSERT OR UPDATE OF completed_houses, total_houses ON public.routes
    FOR EACH ROW
    EXECUTE FUNCTION public.calculate_route_efficiency();

CREATE TRIGGER create_team_for_new_profile
    AFTER INSERT ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.create_team_for_profile(); 