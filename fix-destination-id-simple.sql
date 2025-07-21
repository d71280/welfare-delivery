-- Remove NOT NULL constraint from destination_id
ALTER TABLE transportation_details 
ALTER COLUMN destination_id DROP NOT NULL;