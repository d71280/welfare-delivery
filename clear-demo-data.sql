-- デモデータ削除スクリプト
-- Clear demo data script

-- 配送詳細データを削除
DELETE FROM delivery_details;

-- 配送記録データを削除
DELETE FROM delivery_records;

-- 車両のオイル交換履歴をリセット
UPDATE vehicles SET last_oil_change_odometer = NULL;

-- 確認用のデータ件数表示
SELECT 
    'delivery_records' as table_name, 
    COUNT(*) as count 
FROM delivery_records
UNION ALL
SELECT 
    'delivery_details' as table_name, 
    COUNT(*) as count 
FROM delivery_details;

-- 車両のオイル交換履歴確認
SELECT 
    vehicle_no,
    last_oil_change_odometer
FROM vehicles
ORDER BY vehicle_no;