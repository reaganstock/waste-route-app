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