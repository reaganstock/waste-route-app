-- Add hours_driven column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS hours_driven numeric(10,2) DEFAULT 0;

-- Update any existing rows to have the default value
UPDATE public.profiles 
SET hours_driven = 0 
WHERE hours_driven IS NULL; 