-- 送迎記録テーブルに必要なフィールドを追加

-- 基本的な記録事項
ALTER TABLE transportation_records ADD COLUMN IF NOT EXISTS departure_time TIME; -- 出発時刻
ALTER TABLE transportation_records ADD COLUMN IF NOT EXISTS arrival_time TIME; -- 到着時刻
ALTER TABLE transportation_records ADD COLUMN IF NOT EXISTS transportation_distance DECIMAL(8,2); -- 送迎距離(km)
ALTER TABLE transportation_records ADD COLUMN IF NOT EXISTS transportation_duration INTEGER; -- 所要時間(分)
ALTER TABLE transportation_records ADD COLUMN IF NOT EXISTS pickup_address TEXT; -- 乗車地点住所
ALTER TABLE transportation_records ADD COLUMN IF NOT EXISTS dropoff_address TEXT; -- 降車地点住所

-- 安全管理に関する記録
ALTER TABLE transportation_records ADD COLUMN IF NOT EXISTS safety_check_boarding TEXT; -- 乗車時安全確認状況
ALTER TABLE transportation_records ADD COLUMN IF NOT EXISTS safety_check_alighting TEXT; -- 降車時安全確認状況
ALTER TABLE transportation_records ADD COLUMN IF NOT EXISTS wheelchair_security_status TEXT; -- 車椅子固定状況
ALTER TABLE transportation_records ADD COLUMN IF NOT EXISTS companion_present BOOLEAN DEFAULT FALSE; -- 同乗者の有無
ALTER TABLE transportation_records ADD COLUMN IF NOT EXISTS companion_name TEXT; -- 同乗者氏名
ALTER TABLE transportation_records ADD COLUMN IF NOT EXISTS companion_relationship TEXT; -- 同乗者続柄

-- ドライバーテーブルに運転免許証番号を追加
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS driver_license_number TEXT; -- 運転免許証番号

-- transportation_detailsテーブルにも安全管理項目を追加
ALTER TABLE transportation_details ADD COLUMN IF NOT EXISTS individual_safety_notes TEXT; -- 個別の安全に関する特記事項
ALTER TABLE transportation_details ADD COLUMN IF NOT EXISTS mobility_aid_used TEXT; -- 使用した福祉用具
ALTER TABLE transportation_details ADD COLUMN IF NOT EXISTS mobility_aid_security TEXT; -- 福祉用具の固定状況