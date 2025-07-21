-- transportation_typeのCHECK制約を更新してround_tripとindividualを追加

-- 既存のCHECK制約を削除
ALTER TABLE transportation_records 
DROP CONSTRAINT IF EXISTS transportation_records_transportation_type_check;

-- 新しいCHECK制約を追加（round_tripとindividualを含む）
ALTER TABLE transportation_records 
ADD CONSTRAINT transportation_records_transportation_type_check 
CHECK (transportation_type IN ('regular', 'medical', 'emergency', 'outing', 'individual', 'round_trip'));

-- 確認用：現在の制約を表示
SELECT conname, consrc 
FROM pg_constraint 
WHERE conname = 'transportation_records_transportation_type_check';