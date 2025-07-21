-- 現在のCHECK制約を確認
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'transportation_records'::regclass 
AND contype = 'c';

-- 必要に応じて実行: 古い制約を削除
-- ALTER TABLE transportation_records DROP CONSTRAINT IF EXISTS transportation_records_transportation_type_check;

-- 新しい制約を追加
-- ALTER TABLE transportation_records 
-- ADD CONSTRAINT transportation_records_transportation_type_check 
-- CHECK (transportation_type IN ('regular', 'medical', 'emergency', 'outing', 'individual', 'round_trip'));

-- 制約の確認
-- SELECT constraint_name, check_clause 
-- FROM information_schema.check_constraints 
-- WHERE constraint_name = 'transportation_records_transportation_type_check';