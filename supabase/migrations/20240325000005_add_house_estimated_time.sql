-- Add estimated_time column to houses table
ALTER TABLE public.houses 
ADD COLUMN IF NOT EXISTS estimated_time numeric(5,2) DEFAULT 5.00;

-- Update any existing rows to have the default estimated_time
UPDATE public.houses 
SET estimated_time = 5.00 
WHERE estimated_time IS NULL; 