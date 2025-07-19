-- 配送管理システム データベーススキーマ
-- Delivery Management System Database Schema

-- ドライバーテーブル (Drivers)
CREATE TABLE IF NOT EXISTS drivers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    employee_no TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE,
    pin_code TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 車両テーブル (Vehicles)
CREATE TABLE IF NOT EXISTS vehicles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    vehicle_no TEXT UNIQUE NOT NULL,
    last_oil_change_odometer INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ルートテーブル (Routes)
CREATE TABLE IF NOT EXISTS routes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    route_name TEXT NOT NULL,
    route_code TEXT UNIQUE NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 配送先テーブル (Destinations)
CREATE TABLE IF NOT EXISTS destinations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    route_id UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 配送記録テーブル (Delivery Records)
CREATE TABLE IF NOT EXISTS delivery_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    delivery_date DATE NOT NULL,
    driver_id UUID NOT NULL REFERENCES drivers(id),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id),
    route_id UUID NOT NULL REFERENCES routes(id),
    start_odometer INTEGER,
    end_odometer INTEGER,
    gas_card_used BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 同じ日付・ドライバー・ルートの組み合わせは一意にする
    UNIQUE(delivery_date, driver_id, route_id)
);

-- 配送詳細テーブル (Delivery Details)
CREATE TABLE IF NOT EXISTS delivery_details (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    delivery_record_id UUID NOT NULL REFERENCES delivery_records(id) ON DELETE CASCADE,
    destination_id UUID NOT NULL REFERENCES destinations(id),
    arrival_time TIME,
    departure_time TIME,
    has_invoice BOOLEAN DEFAULT false,
    remarks TEXT,
    time_slot INTEGER CHECK (time_slot >= 0 AND time_slot <= 9), -- 0便〜9便
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 同じ配送記録内で同じ配送先は一意
    UNIQUE(delivery_record_id, destination_id)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_delivery_records_date ON delivery_records(delivery_date);
CREATE INDEX IF NOT EXISTS idx_delivery_records_driver ON delivery_records(driver_id);
CREATE INDEX IF NOT EXISTS idx_delivery_records_route ON delivery_records(route_id);
CREATE INDEX IF NOT EXISTS idx_delivery_details_record ON delivery_details(delivery_record_id);
CREATE INDEX IF NOT EXISTS idx_destinations_route ON destinations(route_id);
CREATE INDEX IF NOT EXISTS idx_routes_active ON routes(is_active);
CREATE INDEX IF NOT EXISTS idx_drivers_active ON drivers(is_active);

-- updated_at自動更新のトリガー関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 各テーブルにupdated_at自動更新トリガーを設定
CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON drivers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_routes_updated_at BEFORE UPDATE ON routes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_destinations_updated_at BEFORE UPDATE ON destinations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_delivery_records_updated_at BEFORE UPDATE ON delivery_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_delivery_details_updated_at BEFORE UPDATE ON delivery_details FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) の設定
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_details ENABLE ROW LEVEL SECURITY;

-- RLSポリシー（認証済みユーザーのみアクセス可能）
CREATE POLICY "Allow authenticated users" ON drivers FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users" ON vehicles FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users" ON routes FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users" ON destinations FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users" ON delivery_records FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users" ON delivery_details FOR ALL USING (auth.role() = 'authenticated');

-- 車両テーブルに最終オイル交換走行距離カラムと現在走行距離カラムを追加
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS last_oil_change_odometer INTEGER;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS current_odometer INTEGER;

-- サンプルデータの挿入
INSERT INTO drivers (name, employee_no, email, pin_code) VALUES 
    ('田中太郎', 'D001', 'tanaka@example.com', '1234'),
    ('佐藤花子', 'D002', 'sato@example.com', '5678'),
    ('鈴木一郎', 'D003', 'suzuki@example.com', '9999')
ON CONFLICT (employee_no) DO NOTHING;

INSERT INTO vehicles (vehicle_no) VALUES 
    ('1001'),
    ('1002'),
    ('1003'),
    ('1004'),
    ('1005')
ON CONFLICT (vehicle_no) DO NOTHING;

INSERT INTO routes (route_name, route_code, display_order) VALUES 
    ('Aルート', 'ROUTE_A', 1),
    ('Bルート', 'ROUTE_B', 2),
    ('Cルート', 'ROUTE_C', 3),
    ('Dルート', 'ROUTE_D', 4),
    ('Eルート', 'ROUTE_E', 5),
    ('Fルート', 'ROUTE_F', 6),
    ('Gルート', 'ROUTE_G', 7),
    ('Hルート', 'ROUTE_H', 8),
    ('Iルート', 'ROUTE_I', 9),
    ('Jルート', 'ROUTE_J', 10)
ON CONFLICT (route_code) DO NOTHING;

-- Aルートの配送先サンプル
INSERT INTO destinations (route_id, name, address, display_order) 
SELECT 
    r.id,
    dest.name,
    dest.address,
    dest.display_order
FROM routes r
CROSS JOIN (
    VALUES 
        ('配送先A1', '東京都渋谷区1-1-1', 1),
        ('配送先A2', '東京都新宿区2-2-2', 2),
        ('配送先A3', '東京都品川区3-3-3', 3),
        ('配送先A4', '東京都港区4-4-4', 4),
        ('配送先A5', '東京都中央区5-5-5', 5)
) AS dest(name, address, display_order)
WHERE r.route_code = 'ROUTE_A'
ON CONFLICT DO NOTHING;

-- Bルートの配送先サンプル
INSERT INTO destinations (route_id, name, address, display_order) 
SELECT 
    r.id,
    dest.name,
    dest.address,
    dest.display_order
FROM routes r
CROSS JOIN (
    VALUES 
        ('配送先B1', '東京都江東区1-1-1', 1),
        ('配送先B2', '東京都墨田区2-2-2', 2),
        ('配送先B3', '東京都台東区3-3-3', 3),
        ('配送先B4', '東京都荒川区4-4-4', 4)
) AS dest(name, address, display_order)
WHERE r.route_code = 'ROUTE_B'
ON CONFLICT DO NOTHING;