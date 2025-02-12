-- Add notes column to routes table
ALTER TABLE public.routes 
ADD COLUMN IF NOT EXISTS notes text;

-- Update any existing rows to have null notes
UPDATE public.routes 
SET notes = null 
WHERE notes IS NULL; 