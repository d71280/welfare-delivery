-- デモ用ルートデータの作成
INSERT INTO routes (id, route_name, start_location, end_location, estimated_time, distance, is_active, created_at, updated_at) VALUES
('demo-route-1', '渋谷エリア配送', '配送センター', '配送センター', '8時間', '50km', true, NOW(), NOW()),
('demo-route-2', '新宿エリア配送', '配送センター', '配送センター', '6時間', '35km', true, NOW(), NOW()),
('demo-route-3', '池袋エリア配送', '配送センター', '配送センター', '7時間', '45km', true, NOW(), NOW());

-- デモ用ドライバーデータ（存在しない場合）
INSERT INTO drivers (id, name, employee_no, email, pin_code, is_active, created_at, updated_at) VALUES
('demo-driver-1', '田中太郎', 'D001', 'tanaka@example.com', '1234', true, NOW(), NOW()),
('demo-driver-2', '佐藤花子', 'D002', 'sato@example.com', '5678', true, NOW(), NOW()),
('demo-driver-3', '山田次郎', 'D003', 'yamada@example.com', '9012', true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- デモ用車両データ（存在しない場合）
INSERT INTO vehicles (id, vehicle_no, vehicle_type, capacity, fuel_type, is_active, created_at, updated_at) VALUES
('demo-vehicle-1', 'V001', '小型トラック', '2t', 'ガソリン', true, NOW(), NOW()),
('demo-vehicle-2', 'V002', '中型トラック', '4t', '軽油', true, NOW(), NOW()),
('demo-vehicle-3', 'V003', '軽バン', '500kg', 'ガソリン', true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;