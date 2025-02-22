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