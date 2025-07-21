-- Step 1: Add management_code_id columns if they don't exist
DO $$ 
BEGIN 
    -- Add to drivers table
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'drivers' 
        AND column_name = 'management_code_id'
    ) THEN
        ALTER TABLE public.drivers ADD COLUMN management_code_id UUID REFERENCES public.management_codes(id);
        RAISE NOTICE 'Added management_code_id column to drivers table';
    END IF;
    
    -- Add to vehicles table  
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'vehicles' 
        AND column_name = 'management_code_id'
    ) THEN
        ALTER TABLE public.vehicles ADD COLUMN management_code_id UUID REFERENCES public.management_codes(id);
        RAISE NOTICE 'Added management_code_id column to vehicles table';
    END IF;
    
    -- Add to users table
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'management_code_id'
    ) THEN
        ALTER TABLE public.users ADD COLUMN management_code_id UUID REFERENCES public.management_codes(id);
        RAISE NOTICE 'Added management_code_id column to users table';
    END IF;
END $$;

-- Step 2: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_drivers_management_code_id ON public.drivers(management_code_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_management_code_id ON public.vehicles(management_code_id);
CREATE INDEX IF NOT EXISTS idx_users_management_code_id ON public.users(management_code_id);

-- Step 3: Check if management_codes table has data
DO $$
DECLARE
    management_code_count INTEGER;
    first_management_code_id UUID;
    org_count INTEGER;
BEGIN
    -- Check management codes count
    SELECT COUNT(*) INTO management_code_count FROM public.management_codes WHERE is_active = true;
    RAISE NOTICE 'Active management codes found: %', management_code_count;
    
    IF management_code_count > 0 THEN
        -- Get the first active management code
        SELECT id INTO first_management_code_id 
        FROM public.management_codes 
        WHERE is_active = true 
        ORDER BY created_at ASC 
        LIMIT 1;
        
        RAISE NOTICE 'Using management code ID: %', first_management_code_id;
        
        -- Update existing records to use the first active management code
        UPDATE public.drivers 
        SET management_code_id = first_management_code_id 
        WHERE management_code_id IS NULL;
        
        UPDATE public.vehicles 
        SET management_code_id = first_management_code_id 
        WHERE management_code_id IS NULL;
        
        UPDATE public.users 
        SET management_code_id = first_management_code_id 
        WHERE management_code_id IS NULL;
        
        RAISE NOTICE 'Updated existing records with management code';
    ELSE
        RAISE NOTICE 'No active management codes found. Please create an organization first.';
    END IF;
END $$;

-- Step 4: Verification queries
SELECT 'drivers' as table_name, COUNT(*) as total_records, 
       COUNT(management_code_id) as records_with_management_code
FROM public.drivers
UNION ALL
SELECT 'vehicles' as table_name, COUNT(*) as total_records, 
       COUNT(management_code_id) as records_with_management_code
FROM public.vehicles
UNION ALL  
SELECT 'users' as table_name, COUNT(*) as total_records, 
       COUNT(management_code_id) as records_with_management_code
FROM public.users;