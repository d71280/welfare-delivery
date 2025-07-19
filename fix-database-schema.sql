-- データベーススキーマ修正SQL
-- 福祉送迎記録システム スキーマ更新

-- 1. vehiclesテーブルに現在走行距離フィールドを追加
ALTER TABLE vehicles 
ADD COLUMN IF NOT EXISTS current_odometer INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_oil_change_odometer INTEGER DEFAULT 0;

-- 2. transportation_recordsテーブルに時間フィールドを追加
ALTER TABLE transportation_records 
ADD COLUMN IF NOT EXISTS start_time TIME,
ADD COLUMN IF NOT EXISTS end_time TIME;

-- 3. vehiclesテーブルの構造を一部調整（既存データとの互換性を保つ）
ALTER TABLE vehicles 
ADD COLUMN IF NOT EXISTS vehicle_type TEXT,
ADD COLUMN IF NOT EXISTS capacity TEXT DEFAULT '8',
ADD COLUMN IF NOT EXISTS fuel_type TEXT;

-- 4. 既存の車両データに対してcurrent_odometerの初期値を設定
UPDATE vehicles 
SET current_odometer = 0 
WHERE current_odometer IS NULL;

-- 5. インデックスの追加（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_vehicles_current_odometer ON vehicles(current_odometer);
CREATE INDEX IF NOT EXISTS idx_transportation_records_times ON transportation_records(start_time, end_time);

-- 6. トリガーの更新（vehicles テーブル用）
CREATE TRIGGER IF NOT EXISTS update_vehicles_updated_at 
BEFORE UPDATE ON vehicles 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. コメント追加
COMMENT ON COLUMN vehicles.current_odometer IS '現在の走行距離(km)';
COMMENT ON COLUMN vehicles.last_oil_change_odometer IS '最終オイル交換時の走行距離(km)';
COMMENT ON COLUMN transportation_records.start_time IS '配送開始時刻';
COMMENT ON COLUMN transportation_records.end_time IS '配送終了時刻'; 