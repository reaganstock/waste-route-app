-- Add hours_driven column to profiles table if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'hours_driven'
    ) THEN 
        ALTER TABLE public.profiles 
        ADD COLUMN hours_driven numeric(10,2) default 0;
    END IF;
END $$; 