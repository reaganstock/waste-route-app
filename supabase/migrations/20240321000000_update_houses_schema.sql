-- Create house_status enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE house_status AS ENUM ('skip', 'collect', 'new customer', 'pending');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Update houses table
ALTER TABLE houses 
    ADD COLUMN IF NOT EXISTS status house_status,
    ADD COLUMN IF NOT EXISTS notes text,
    ADD COLUMN IF NOT EXISTS is_new_customer boolean DEFAULT false;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_houses_status ON houses(status);
CREATE INDEX IF NOT EXISTS idx_houses_route_id ON houses(route_id); 