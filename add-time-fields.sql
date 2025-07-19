-- 配送記録テーブルに時間フィールドを追加
ALTER TABLE delivery_records 
ADD COLUMN IF NOT EXISTS start_time TIME,
ADD COLUMN IF NOT EXISTS end_time TIME;

-- インデックスを追加
CREATE INDEX IF NOT EXISTS idx_delivery_records_start_time ON delivery_records(start_time);
CREATE INDEX IF NOT EXISTS idx_delivery_records_end_time ON delivery_records(end_time);