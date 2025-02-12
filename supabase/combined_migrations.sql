-- Drop existing policies
drop policy if exists "Public profiles are viewable by authenticated users" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Admins can create profiles" on public.profiles;
drop policy if exists "Admins can update any profile" on public.profiles;
drop policy if exists "Routes are viewable by authenticated users" on public.routes;
drop policy if exists "Routes are insertable by authenticated users" on public.routes;
drop policy if exists "Routes are updatable by authenticated users" on public.routes;
drop policy if exists "Routes are deletable by authenticated users" on public.routes;
drop policy if exists "Houses are viewable by authenticated users" on public.houses;
drop policy if exists "Houses are insertable by authenticated users" on public.houses;
drop policy if exists "Houses are updatable by authenticated users" on public.houses;
drop policy if exists "Houses are deletable by authenticated users" on public.houses;

-- Drop existing triggers
drop trigger if exists handle_profiles_updated_at on public.profiles;
drop trigger if exists handle_routes_updated_at on public.routes;
drop trigger if exists handle_houses_updated_at on public.houses;
drop trigger if exists calculate_route_efficiency on public.routes;

-- Drop existing functions with CASCADE
drop function if exists public.handle_updated_at() CASCADE;
drop function if exists public.calculate_route_efficiency() CASCADE;

-- Drop existing types
drop type if exists public.route_status cascade;
drop type if exists public.house_status cascade;
drop type if exists public.user_role cascade;
drop type if exists public.user_status cascade;

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Set timezone
alter database postgres set timezone to 'UTC';

-- Create custom types for status enums
create type public.route_status as enum ('pending', 'in_progress', 'completed');
create type public.house_status as enum ('pending', 'collect', 'skip', 'new customer');
create type public.user_role as enum ('driver', 'admin');
create type public.user_status as enum ('pending', 'active', 'inactive');

-- Create tables
create table if not exists public.profiles (
    id uuid references auth.users on delete cascade primary key,
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null,
    full_name text not null,
    email text not null unique,
    role user_role not null default 'driver',
    status user_status not null default 'pending',
    phone text,
    preferred_region text,
    start_date date default now(),
    avatar_url text
);

create table if not exists public.routes (
    id uuid default uuid_generate_v4() primary key,
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null,
    name text not null,
    date timestamptz not null,
    status route_status not null default 'pending',
    duration numeric(5,2) default 0,
    completed_houses integer default 0,
    total_houses integer not null check (total_houses > 0),
    efficiency numeric(5,2) default 0 check (efficiency >= 0 and efficiency <= 100),
    driver_id uuid references public.profiles(id) on delete set null,
    notes text
);

create table if not exists public.houses (
    id uuid default uuid_generate_v4() primary key,
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null,
    address text not null,
    lat numeric(10,8) not null check (lat >= -90 and lat <= 90),
    lng numeric(11,8) not null check (lng >= -180 and lng <= 180),
    status house_status not null default 'pending',
    notes text,
    route_id uuid references public.routes(id) on delete cascade not null,
    is_new_customer boolean default false,
    estimated_time numeric(5,2) default 5.00, -- minutes
    priority integer default 0
);

-- Create indexes for better query performance
create index if not exists routes_date_idx on public.routes(date);
create index if not exists routes_status_idx on public.routes(status);
create index if not exists routes_driver_id_idx on public.routes(driver_id);
create index if not exists houses_route_id_idx on public.houses(route_id);
create index if not exists houses_status_idx on public.houses(status);

-- Enable Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.routes enable row level security;
alter table public.houses enable row level security;

-- Create policies for profiles
create policy "Profiles are viewable by authenticated users"
    on profiles for select
    using (auth.role() = 'authenticated');

create policy "Users can update their own profile"
    on profiles for update
    using (auth.uid() = id);

create policy "Admins can create profiles"
    on profiles for insert
    with check (
        exists (
            select 1 from profiles
            where id = auth.uid()
            and role = 'admin'
        )
        or auth.uid() = id
    );

create policy "Admins can update any profile"
    on profiles for update
    using (
        exists (
            select 1 from profiles
            where id = auth.uid()
            and role = 'admin'
        )
    );

-- Create policies for routes
create policy "Routes are viewable by authenticated users"
    on routes for select
    using (auth.role() = 'authenticated');

create policy "Routes are insertable by authenticated users"
    on routes for insert
    with check (auth.role() = 'authenticated');

create policy "Routes are updatable by authenticated users"
    on routes for update
    using (auth.role() = 'authenticated');

create policy "Routes are deletable by authenticated users"
    on routes for delete
    using (auth.role() = 'authenticated');

-- Create policies for houses
create policy "Houses are viewable by authenticated users"
    on houses for select
    using (auth.role() = 'authenticated');

create policy "Houses are insertable by authenticated users"
    on houses for insert
    with check (auth.role() = 'authenticated');

create policy "Houses are updatable by authenticated users"
    on houses for update
    using (auth.role() = 'authenticated');

create policy "Houses are deletable by authenticated users"
    on houses for delete
    using (auth.role() = 'authenticated');

-- Create functions
create or replace function public.handle_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql security definer;

-- Create function to calculate route efficiency
create or replace function public.calculate_route_efficiency()
returns trigger as $$
begin
    if new.total_houses > 0 then
        new.efficiency = (new.completed_houses::numeric / new.total_houses::numeric) * 100;
    end if;
    return new;
end;
$$ language plpgsql security definer;

-- Create triggers
create trigger handle_profiles_updated_at
    before update on public.profiles
    for each row
    execute function public.handle_updated_at();

create trigger handle_routes_updated_at
    before update on public.routes
    for each row
    execute function public.handle_updated_at();

create trigger handle_houses_updated_at
    before update on public.houses
    for each row
    execute function public.handle_updated_at();

create trigger calculate_route_efficiency
    before insert or update of completed_houses, total_houses on public.routes
    for each row
    execute function public.calculate_route_efficiency();

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

-- Add notes column to routes table
ALTER TABLE public.routes 
ADD COLUMN IF NOT EXISTS notes text;

-- Update any existing rows to have null notes
UPDATE public.routes 
SET notes = null 
WHERE notes IS NULL;

-- Safely handle the house_status enum and column
DO $$ 
BEGIN
    -- Drop the existing enum type if it exists
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'house_status') THEN
        ALTER TABLE public.houses ALTER COLUMN status DROP DEFAULT;
        ALTER TABLE public.houses ALTER COLUMN status TYPE text USING status::text;
        DROP TYPE public.house_status;
    END IF;

    -- Create the new enum type
    CREATE TYPE public.house_status AS ENUM ('pending', 'collect', 'skip', 'new customer');

    -- Update the column type and set the default
    ALTER TABLE public.houses 
        ALTER COLUMN status TYPE house_status 
        USING CASE 
            WHEN status = 'completed' OR status = 'collect' THEN 'collect'::house_status
            WHEN status = 'skipped' OR status = 'skip' THEN 'skip'::house_status
            WHEN status = 'new' OR status = 'new customer' THEN 'new customer'::house_status
            ELSE 'pending'::house_status
        END;

    -- Set the default value
    ALTER TABLE public.houses 
        ALTER COLUMN status SET DEFAULT 'pending'::house_status;

END $$;

-- Update any invalid status values
UPDATE public.houses
SET status = 'pending'
WHERE status::text NOT IN ('pending', 'collect', 'skip', 'new customer');

-- Add new columns for route metrics
ALTER TABLE routes
ADD COLUMN IF NOT EXISTS completion_rate DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS efficiency DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS special_houses INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS houses_per_hour DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS start_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS end_time TIMESTAMP WITH TIME ZONE;

-- Add comment to explain the metrics
COMMENT ON COLUMN routes.completion_rate IS 'Percentage of houses completed on the route';
COMMENT ON COLUMN routes.efficiency IS 'Overall route efficiency (60% completion, 40% speed)';
COMMENT ON COLUMN routes.special_houses IS 'Count of houses with special notes or status';
COMMENT ON COLUMN routes.houses_per_hour IS 'Average number of houses serviced per hour';
COMMENT ON COLUMN routes.start_time IS 'When the route was started';
COMMENT ON COLUMN routes.end_time IS 'When the route was completed'; 