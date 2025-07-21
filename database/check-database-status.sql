-- Check database status and existing data

-- Check if management_codes table exists and has data
SELECT 'management_codes' as table_name, COUNT(*) as record_count FROM management_codes;

-- Check drivers table structure and data
SELECT 'drivers' as table_name, COUNT(*) as record_count FROM drivers;
SELECT employee_no, name, management_code_id FROM drivers LIMIT 5;

-- Check vehicles table structure and data  
SELECT 'vehicles' as table_name, COUNT(*) as record_count FROM vehicles;
SELECT vehicle_no, vehicle_name, management_code_id FROM vehicles LIMIT 5;

-- Check users table structure and data
SELECT 'users' as table_name, COUNT(*) as record_count FROM users;  
SELECT user_no, name, management_code_id FROM users LIMIT 5;

-- Check for duplicate employee numbers
SELECT employee_no, COUNT(*) as duplicate_count 
FROM drivers 
GROUP BY employee_no 
HAVING COUNT(*) > 1;