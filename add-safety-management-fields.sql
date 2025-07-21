-- 安全管理フィールドをtransportation_recordsテーブルに追加
-- Add safety management fields to transportation_records table

ALTER TABLE transportation_records 
ADD COLUMN IF NOT EXISTS safety_check_boarding TEXT CHECK (safety_check_boarding IN ('no_problem', 'problem'));

ALTER TABLE transportation_records 
ADD COLUMN IF NOT EXISTS safety_check_boarding_details TEXT;

ALTER TABLE transportation_records 
ADD COLUMN IF NOT EXISTS safety_check_alighting TEXT CHECK (safety_check_alighting IN ('no_problem', 'problem'));

ALTER TABLE transportation_records 
ADD COLUMN IF NOT EXISTS safety_check_alighting_details TEXT;

ALTER TABLE transportation_records 
ADD COLUMN IF NOT EXISTS wheelchair_security_status TEXT CHECK (wheelchair_security_status IN ('no_problem', 'problem'));

ALTER TABLE transportation_records 
ADD COLUMN IF NOT EXISTS wheelchair_security_details TEXT;

ALTER TABLE transportation_records 
ADD COLUMN IF NOT EXISTS companion_present BOOLEAN DEFAULT false;

ALTER TABLE transportation_records 
ADD COLUMN IF NOT EXISTS companion_name TEXT;

ALTER TABLE transportation_records 
ADD COLUMN IF NOT EXISTS companion_relationship TEXT;

-- 時刻関連フィールドも追加
ALTER TABLE transportation_records 
ADD COLUMN IF NOT EXISTS outbound_start_time TIME;

ALTER TABLE transportation_records 
ADD COLUMN IF NOT EXISTS outbound_end_time TIME;

ALTER TABLE transportation_records 
ADD COLUMN IF NOT EXISTS return_start_time TIME;

ALTER TABLE transportation_records 
ADD COLUMN IF NOT EXISTS return_end_time TIME;

-- trip_typeフィールドも追加（往復送迎対応）
ALTER TABLE transportation_records 
ADD COLUMN IF NOT EXISTS trip_type TEXT DEFAULT 'one_way' CHECK (trip_type IN ('one_way', 'round_trip'));

-- 制約とインデックスを追加
CREATE INDEX IF NOT EXISTS idx_transportation_records_safety_boarding ON transportation_records(safety_check_boarding);
CREATE INDEX IF NOT EXISTS idx_transportation_records_safety_alighting ON transportation_records(safety_check_alighting);
CREATE INDEX IF NOT EXISTS idx_transportation_records_trip_type ON transportation_records(trip_type);

-- 確認用クエリ
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'transportation_records' 
AND column_name LIKE '%safety%' OR column_name LIKE '%companion%' OR column_name LIKE '%trip_type%'
ORDER BY ordinal_position;