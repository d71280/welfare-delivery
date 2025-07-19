-- 福祉送迎記録システム データベーススキーマ
-- Welfare Transportation Record System Database Schema

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
    vehicle_name TEXT,
    capacity INTEGER DEFAULT 8, -- 乗車定員
    wheelchair_accessible BOOLEAN DEFAULT false, -- 車椅子対応
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

-- 利用者テーブル (Users)
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_no TEXT UNIQUE NOT NULL, -- 利用者番号
    name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    emergency_contact TEXT,
    emergency_phone TEXT,
    wheelchair_user BOOLEAN DEFAULT false, -- 車椅子利用者
    special_notes TEXT, -- 特記事項
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 送迎先テーブル (Destinations)
CREATE TABLE IF NOT EXISTS destinations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    route_id UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- 施設名・目的地名
    address TEXT,
    destination_type TEXT DEFAULT 'facility' CHECK (destination_type IN ('home', 'facility', 'medical', 'other')),
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 送迎記録テーブル (Transportation Records)
CREATE TABLE IF NOT EXISTS transportation_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    transportation_date DATE NOT NULL,
    driver_id UUID NOT NULL REFERENCES drivers(id),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id),
    route_id UUID NOT NULL REFERENCES routes(id),
    transportation_type TEXT DEFAULT 'regular' CHECK (transportation_type IN ('regular', 'medical', 'emergency', 'outing')),
    start_odometer INTEGER,
    end_odometer INTEGER,
    passenger_count INTEGER DEFAULT 0, -- 乗車人数
    weather_condition TEXT, -- 天候
    special_notes TEXT, -- 特記事項
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 同じ日付・ドライバー・ルートの組み合わせは一意にする
    UNIQUE(transportation_date, driver_id, route_id)
);

-- 送迎詳細テーブル (Transportation Details)
CREATE TABLE IF NOT EXISTS transportation_details (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    transportation_record_id UUID NOT NULL REFERENCES transportation_records(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id), -- 利用者（複数利用者の場合は複数レコード）
    destination_id UUID NOT NULL REFERENCES destinations(id),
    pickup_time TIME, -- お迎え時刻
    arrival_time TIME, -- 到着時刻
    departure_time TIME, -- 出発時刻
    drop_off_time TIME, -- 降車時刻
    health_condition TEXT, -- 体調
    behavior_notes TEXT, -- 行動記録
    assistance_required TEXT, -- 介助内容
    remarks TEXT, -- その他特記事項
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_transportation_records_date ON transportation_records(transportation_date);
CREATE INDEX IF NOT EXISTS idx_transportation_records_driver ON transportation_records(driver_id);
CREATE INDEX IF NOT EXISTS idx_transportation_records_route ON transportation_records(route_id);
CREATE INDEX IF NOT EXISTS idx_transportation_details_record ON transportation_details(transportation_record_id);
CREATE INDEX IF NOT EXISTS idx_transportation_details_user ON transportation_details(user_id);
CREATE INDEX IF NOT EXISTS idx_destinations_route ON destinations(route_id);
CREATE INDEX IF NOT EXISTS idx_routes_active ON routes(is_active);
CREATE INDEX IF NOT EXISTS idx_drivers_active ON drivers(is_active);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);

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
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transportation_records_updated_at BEFORE UPDATE ON transportation_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transportation_details_updated_at BEFORE UPDATE ON transportation_details FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) の設定
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE transportation_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE transportation_details ENABLE ROW LEVEL SECURITY;

-- RLSポリシー（認証済みユーザーのみアクセス可能）
CREATE POLICY "Allow authenticated users" ON drivers FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users" ON vehicles FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users" ON routes FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users" ON destinations FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users" ON users FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users" ON transportation_records FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users" ON transportation_details FOR ALL USING (auth.role() = 'authenticated');

-- サンプルデータの挿入
INSERT INTO drivers (name, employee_no, email, pin_code) VALUES 
    ('田中太郎', 'D001', 'tanaka@example.com', '1234'),
    ('佐藤花子', 'D002', 'sato@example.com', '5678'),
    ('鈴木一郎', 'D003', 'suzuki@example.com', '9999')
ON CONFLICT (employee_no) DO NOTHING;

INSERT INTO vehicles (vehicle_no, vehicle_name, capacity, wheelchair_accessible) VALUES 
    ('1001', 'ハイエース1号車', 8, false),
    ('1002', 'ハイエース2号車', 8, true),
    ('1003', 'アルファード1号車', 7, false),
    ('1004', 'ハイエース3号車', 8, true),
    ('1005', 'セレナ1号車', 8, false)
ON CONFLICT (vehicle_no) DO NOTHING;

INSERT INTO routes (route_name, route_code, display_order) VALUES 
    ('通所支援Aルート', 'ROUTE_A', 1),
    ('通所支援Bルート', 'ROUTE_B', 2),
    ('医療送迎ルート', 'ROUTE_MEDICAL', 3),
    ('外出支援ルート', 'ROUTE_OUTING', 4),
    ('通所支援Cルート', 'ROUTE_C', 5)
ON CONFLICT (route_code) DO NOTHING;

-- 利用者サンプルデータ
INSERT INTO users (user_no, name, phone, address, emergency_contact, emergency_phone, wheelchair_user, special_notes) VALUES 
    ('U001', '山田太郎', '090-1234-5678', '東京都世田谷区1-1-1', '山田花子', '090-8765-4321', false, 'てんかん持ち、薬は朝夕服用'),
    ('U002', '田中次郎', '090-2345-6789', '東京都杉並区2-2-2', '田中美子', '090-7654-3210', true, '車椅子利用、リフト必要'),
    ('U003', '佐藤三郎', '090-3456-7890', '東京都練馬区3-3-3', '佐藤恵子', '090-6543-2109', false, '認知症、見守り必要'),
    ('U004', '鈴木四郎', '090-4567-8901', '東京都中野区4-4-4', '鈴木良子', '090-5432-1098', false, 'なし'),
    ('U005', '高橋五郎', '090-5678-9012', '東京都渋谷区5-5-5', '高橋明美', '090-4321-0987', true, '車椅子利用、介助なし')
ON CONFLICT (user_no) DO NOTHING;

-- 通所支援Aルートの送迎先サンプル
INSERT INTO destinations (route_id, name, address, destination_type, display_order) 
SELECT 
    r.id,
    dest.name,
    dest.address,
    dest.dest_type,
    dest.display_order
FROM routes r
CROSS JOIN (
    VALUES 
        ('デイサービスセンター花', '東京都世田谷区中央1-1-1', 'facility', 1),
        ('山田太郎宅', '東京都世田谷区1-1-1', 'home', 2),
        ('田中次郎宅', '東京都杉並区2-2-2', 'home', 3),
        ('佐藤三郎宅', '東京都練馬区3-3-3', 'home', 4)
) AS dest(name, address, dest_type, display_order)
WHERE r.route_code = 'ROUTE_A'
ON CONFLICT DO NOTHING;

-- 医療送迎ルートの送迎先サンプル
INSERT INTO destinations (route_id, name, address, destination_type, display_order) 
SELECT 
    r.id,
    dest.name,
    dest.address,
    dest.dest_type,
    dest.display_order
FROM routes r
CROSS JOIN (
    VALUES 
        ('世田谷総合病院', '東京都世田谷区医療1-1-1', 'medical', 1),
        ('杉並クリニック', '東京都杉並区医療2-2-2', 'medical', 2)
) AS dest(name, address, dest_type, display_order)
WHERE r.route_code = 'ROUTE_MEDICAL'
ON CONFLICT DO NOTHING;