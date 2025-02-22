-- Clean existing data
truncate table public.houses cascade;
truncate table public.routes cascade;
truncate table public.profiles cascade;

-- Insert mock profiles
INSERT INTO public.profiles (id, full_name, email, role, status, phone, preferred_region)
VALUES
  ('123e4567-e89b-12d3-a456-426614174000', 'John Doe', 'john@example.com', 'driver', 'active', '+1234567890', 'Wylie'),
  ('123e4567-e89b-12d3-a456-426614174001', 'Jane Smith', 'jane@example.com', 'driver', 'active', '+1234567891', 'Wylie'),
  ('123e4567-e89b-12d3-a456-426614174002', 'Bob Wilson', 'bob@example.com', 'manager', 'active', '+1234567892', 'Wylie');

-- Insert mock routes
INSERT INTO public.routes (id, name, date, status, duration, completed_houses, total_houses, driver_id, notes)
VALUES
  (
    'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    'Monday Downtown Route',
    NOW() - interval '1 day',
    'completed',
    3.5,
    28,
    30,
    '123e4567-e89b-12d3-a456-426614174000',
    'Regular downtown collection route'
  ),
  (
    '550e8400-e29b-41d4-a716-446655440000',
    'Tuesday Residential Route',
    NOW() + interval '1 day',
    'pending',
    0,
    0,
    35,
    '123e4567-e89b-12d3-a456-426614174001',
    'High-density residential area'
  ),
  (
    '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
    'Wednesday Commercial Route',
    NOW(),
    'in_progress',
    2.5,
    18,
    25,
    '123e4567-e89b-12d3-a456-426614174000',
    'Business district route'
  );

-- Insert mock houses
INSERT INTO public.houses (
  address,
  lat,
  lng,
  status,
  notes,
  route_id,
  is_new_customer,
  estimated_time,
  priority
)
VALUES
  -- Monday Downtown Route
  (
    '123 Main St, Wylie, TX',
    33.0151,
    -96.5388,
    'collect',
    'Front door collection',
    'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    false,
    5.00,
    1
  ),
  (
    '456 Market St, Wylie, TX',
    33.0161,
    -96.5398,
    'collect',
    'Back alley pickup',
    'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    false,
    7.50,
    2
  ),
  (
    '789 Mission St, Wylie, TX',
    33.0171,
    -96.5408,
    'skip',
    'Gate code required',
    'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    true,
    5.00,
    3
  ),

  -- Tuesday Residential Route
  (
    '321 Hayes St, Wylie, TX',
    33.0181,
    -96.5418,
    'pending',
    'Side entrance',
    '550e8400-e29b-41d4-a716-446655440000',
    false,
    5.00,
    1
  ),
  (
    '654 Folsom St, Wylie, TX',
    33.0191,
    -96.5428,
    'pending',
    null,
    '550e8400-e29b-41d4-a716-446655440000',
    true,
    5.00,
    2
  ),

  -- Wednesday Commercial Route
  (
    '987 Howard St, Wylie, TX',
    33.0201,
    -96.5438,
    'collect',
    'Ring doorbell twice',
    '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
    false,
    10.00,
    1
  ),
  (
    '456 Valencia St, Wylie, TX',
    33.0211,
    -96.5448,
    'collect',
    null,
    '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
    false,
    5.00,
    2
  ),
  (
    '789 Guerrero St, Wylie, TX',
    33.0221,
    -96.5458,
    'pending',
    null,
    '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
    false,
    5.00,
    3
  ); 