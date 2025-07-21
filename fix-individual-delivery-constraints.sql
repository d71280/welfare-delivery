-- 個別配送で複数利用者対応のための制約修正

-- 既存の一意制約を削除
ALTER TABLE transportation_records 
DROP CONSTRAINT IF EXISTS transportation_records_transportation_date_driver_id_key;

-- 新しい一意制約を追加: transportation_date, driver_id, special_notes の組み合わせで一意
-- これにより同じ日付・ドライバーでも異なる利用者（special_notesが異なる）なら複数レコード可能
ALTER TABLE transportation_records 
ADD CONSTRAINT transportation_records_unique_delivery 
UNIQUE(transportation_date, driver_id, special_notes);