-- 送迎記録テーブルに往復対応のフィールドを追加
-- Add round-trip support fields to transportation_records table

-- 往復送迎用のフィールドを追加
ALTER TABLE transportation_records 
ADD COLUMN IF NOT EXISTS trip_type TEXT DEFAULT 'one_way' CHECK (trip_type IN ('one_way', 'round_trip'));

ALTER TABLE transportation_records 
ADD COLUMN IF NOT EXISTS outbound_start_time TIME; -- 往路開始時刻

ALTER TABLE transportation_records 
ADD COLUMN IF NOT EXISTS outbound_end_time TIME; -- 往路終了時刻

ALTER TABLE transportation_records 
ADD COLUMN IF NOT EXISTS return_start_time TIME; -- 復路開始時刻

ALTER TABLE transportation_records 
ADD COLUMN IF NOT EXISTS return_end_time TIME; -- 復路終了時刻

ALTER TABLE transportation_records 
ADD COLUMN IF NOT EXISTS outbound_passenger_count INTEGER DEFAULT 0; -- 往路乗車人数

ALTER TABLE transportation_records 
ADD COLUMN IF NOT EXISTS return_passenger_count INTEGER DEFAULT 0; -- 復路乗車人数

-- 既存のUNIQUE制約を削除して、新しい制約を追加
-- （同じ日付・ドライバー・車両で1つの往復送迎のみ許可）
ALTER TABLE transportation_records 
DROP CONSTRAINT IF EXISTS transportation_records_transportation_date_driver_id_route_id_key;

ALTER TABLE transportation_records 
ADD CONSTRAINT unique_daily_transportation 
UNIQUE(transportation_date, driver_id, vehicle_id);

-- transportation_detailsテーブルに往復フラグを追加
ALTER TABLE transportation_details 
ADD COLUMN IF NOT EXISTS trip_direction TEXT DEFAULT 'outbound' CHECK (trip_direction IN ('outbound', 'return'));

-- インデックスを追加
CREATE INDEX IF NOT EXISTS idx_transportation_records_trip_type ON transportation_records(trip_type);
CREATE INDEX IF NOT EXISTS idx_transportation_details_direction ON transportation_details(trip_direction);

-- 既存データを往復対応に更新
-- 同じ日付・ドライバー・車両の記録をグループ化して往復記録として統合

-- 一時的にRLSを無効化
ALTER TABLE transportation_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE transportation_details DISABLE ROW LEVEL SECURITY;

-- 重複記録の統合処理
WITH grouped_records AS (
  SELECT 
    transportation_date,
    driver_id,
    vehicle_id,
    array_agg(id ORDER BY created_at) as record_ids,
    count(*) as record_count
  FROM transportation_records 
  GROUP BY transportation_date, driver_id, vehicle_id
  HAVING count(*) > 1
),
updated_records AS (
  SELECT 
    gr.record_ids[1] as main_record_id,
    gr.record_ids as all_record_ids,
    tr.transportation_date,
    tr.driver_id,
    tr.vehicle_id
  FROM grouped_records gr
  JOIN transportation_records tr ON tr.id = gr.record_ids[1]
)
-- メインレコードを往復記録として更新
UPDATE transportation_records 
SET 
  trip_type = 'round_trip',
  passenger_count = (
    SELECT sum(passenger_count) 
    FROM transportation_records tr2 
    WHERE tr2.id = ANY(ur.all_record_ids)
  )
FROM updated_records ur
WHERE transportation_records.id = ur.main_record_id;

-- 重複記録の詳細を統合してメインレコードに移動
WITH grouped_records AS (
  SELECT 
    transportation_date,
    driver_id,
    vehicle_id,
    array_agg(id ORDER BY created_at) as record_ids
  FROM transportation_records 
  GROUP BY transportation_date, driver_id, vehicle_id
  HAVING count(*) > 1
)
UPDATE transportation_details 
SET transportation_record_id = gr.record_ids[1]
FROM grouped_records gr
WHERE transportation_record_id = ANY(gr.record_ids[2:]);

-- 重複レコードを削除
WITH grouped_records AS (
  SELECT 
    transportation_date,
    driver_id,
    vehicle_id,
    array_agg(id ORDER BY created_at) as record_ids
  FROM transportation_records 
  GROUP BY transportation_date, driver_id, vehicle_id
  HAVING count(*) > 1
)
DELETE FROM transportation_records 
WHERE id IN (
  SELECT unnest(record_ids[2:]) 
  FROM grouped_records
);

-- RLSを再有効化
ALTER TABLE transportation_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE transportation_details ENABLE ROW LEVEL SECURITY;

-- 統合結果を確認するためのビュー
CREATE OR REPLACE VIEW v_transportation_summary AS
SELECT 
  tr.id,
  tr.transportation_date,
  d.name as driver_name,
  v.vehicle_no,
  tr.trip_type,
  tr.passenger_count,
  count(td.id) as detail_count,
  tr.status
FROM transportation_records tr
LEFT JOIN drivers d ON tr.driver_id = d.id
LEFT JOIN vehicles v ON tr.vehicle_id = v.id
LEFT JOIN transportation_details td ON tr.id = td.transportation_record_id
GROUP BY tr.id, tr.transportation_date, d.name, v.vehicle_no, tr.trip_type, tr.passenger_count, tr.status
ORDER BY tr.transportation_date DESC, d.name;