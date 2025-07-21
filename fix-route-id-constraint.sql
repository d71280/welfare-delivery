-- Fix route_id constraint for individual deliveries
-- Make route_id nullable since route functionality has been removed

ALTER TABLE transportation_records 
ALTER COLUMN route_id DROP NOT NULL;

-- Drop the unique constraint that includes route_id
ALTER TABLE transportation_records 
DROP CONSTRAINT IF EXISTS transportation_records_transportation_date_driver_id_route_id_key;

-- Add new unique constraint without route_id for individual deliveries
ALTER TABLE transportation_records 
ADD CONSTRAINT transportation_records_transportation_date_driver_id_key 
UNIQUE(transportation_date, driver_id);