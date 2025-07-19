-- 全データ削除スクリプト
-- Delete all data script

-- 外部キー制約を考慮した順序で削除
DELETE FROM delivery_details;
DELETE FROM delivery_records;
DELETE FROM destinations;
DELETE FROM routes;
DELETE FROM vehicles;
DELETE FROM drivers;

-- 確認用のデータ件数表示
SELECT 
    'drivers' as table_name, 
    COUNT(*) as count 
FROM drivers
UNION ALL
SELECT 
    'vehicles' as table_name, 
    COUNT(*) as count 
FROM vehicles
UNION ALL
SELECT 
    'routes' as table_name, 
    COUNT(*) as count 
FROM routes
UNION ALL
SELECT 
    'destinations' as table_name, 
    COUNT(*) as count 
FROM destinations
UNION ALL
SELECT 
    'delivery_records' as table_name, 
    COUNT(*) as count 
FROM delivery_records
UNION ALL
SELECT 
    'delivery_details' as table_name, 
    COUNT(*) as count 
FROM delivery_details;