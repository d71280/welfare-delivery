-- Add management_code_id columns to existing tables

-- Add management_code_id to drivers table
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'drivers' 
        AND column_name = 'management_code_id'
    ) THEN
        ALTER TABLE drivers ADD COLUMN management_code_id UUID REFERENCES management_codes(id);
    END IF;
END $$;

-- Add management_code_id to vehicles table  
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vehicles' 
        AND column_name = 'management_code_id'
    ) THEN
        ALTER TABLE vehicles ADD COLUMN management_code_id UUID REFERENCES management_codes(id);
    END IF;
END $$;

-- Add management_code_id to users table
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'management_code_id'
    ) THEN
        ALTER TABLE users ADD COLUMN management_code_id UUID REFERENCES management_codes(id);
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_drivers_management_code_id ON drivers(management_code_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_management_code_id ON vehicles(management_code_id);
CREATE INDEX IF NOT EXISTS idx_users_management_code_id ON users(management_code_id);

-- Update existing records to use the first active management code (if any exist)
-- This is a temporary solution - in production, you'd need to properly assign management codes
DO $$
DECLARE
    first_management_code_id UUID;
BEGIN
    -- Get the first active management code
    SELECT id INTO first_management_code_id 
    FROM management_codes 
    WHERE is_active = true 
    ORDER BY created_at ASC 
    LIMIT 1;
    
    -- Only update if we found a management code
    IF first_management_code_id IS NOT NULL THEN
        -- Update drivers without management_code_id
        UPDATE drivers 
        SET management_code_id = first_management_code_id 
        WHERE management_code_id IS NULL;
        
        -- Update vehicles without management_code_id
        UPDATE vehicles 
        SET management_code_id = first_management_code_id 
        WHERE management_code_id IS NULL;
        
        -- Update users without management_code_id
        UPDATE users 
        SET management_code_id = first_management_code_id 
        WHERE management_code_id IS NULL;
    END IF;
END $$;