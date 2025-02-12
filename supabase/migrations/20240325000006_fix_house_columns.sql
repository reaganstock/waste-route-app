-- Add missing columns to houses table with simple defaults
ALTER TABLE public.houses 
ADD COLUMN IF NOT EXISTS priority integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS estimated_time numeric(5,2) DEFAULT 5.00;

-- Update any existing rows
UPDATE public.houses 
SET 
  priority = 0 WHERE priority IS NULL,
  estimated_time = 5.00 WHERE estimated_time IS NULL; 