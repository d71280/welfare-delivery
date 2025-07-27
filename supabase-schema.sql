-- 福祉送迎記録システム データベーススキーマ
-- Welfare Transportation Record System Database Schema

-- 組織テーブル (Organizations)
CREATE TABLE IF NOT EXISTS organizations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    email TEXT,
    representative_name TEXT,
    license_number TEXT,
    business_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 管理コードテーブル (Management Codes)
CREATE TABLE IF NOT EXISTS management_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 管理者テーブル (Admins)
CREATE TABLE IF NOT EXISTS admins (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    email TEXT,
    name TEXT,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ドライバーテーブル (Drivers)
CREATE TABLE IF NOT EXISTS drivers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    employee_no TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE,
    pin_code TEXT,
    management_code_id UUID REFERENCES management_codes(id),
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
    management_code_id UUID REFERENCES management_codes(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ルートテーブル (Routes)
CREATE TABLE IF NOT EXISTS routes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    route_name TEXT NOT NULL,
    route_code TEXT UNIQUE NOT NULL,
    management_code_id UUID REFERENCES management_codes(id),
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
    management_code_id UUID REFERENCES management_codes(id),
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
    route_id UUID REFERENCES routes(id), -- ルート送迎時のみ必須、個別送迎では不要
    transportation_type TEXT DEFAULT 'regular' CHECK (transportation_type IN ('regular', 'medical', 'emergency', 'outing', 'individual')),
    start_time TIME, -- 送迎開始時刻
    end_time TIME, -- 送迎終了時刻
    start_odometer INTEGER,
    end_odometer INTEGER,
    passenger_count INTEGER DEFAULT 0, -- 乗車人数
    weather_condition TEXT, -- 天候
    special_notes TEXT, -- 特記事項
    management_code_id UUID REFERENCES management_codes(id),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 送迎詳細テーブル (Transportation Details)
CREATE TABLE IF NOT EXISTS transportation_details (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    transportation_record_id UUID NOT NULL REFERENCES transportation_records(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id), -- 利用者（複数利用者の場合は複数レコード）
    destination_id UUID REFERENCES destinations(id), -- ルート送迎時のみ必須、個別送迎では不要
    pickup_time TIME, -- お迎え時刻
    arrival_time TIME, -- 到着時刻
    departure_time TIME, -- 出発時刻
    drop_off_time TIME, -- 降車時刻
    health_condition TEXT, -- 体調
    behavior_notes TEXT, -- 行動記録
    assistance_required TEXT, -- 介助内容
    remarks TEXT, -- その他特記事項
    pickup_address_id UUID REFERENCES user_addresses(id), -- 個別送迎時の送迎元住所
    dropoff_address_id UUID REFERENCES user_addresses(id), -- 個別送迎時の送迎先住所
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_organizations_name ON organizations(name);
CREATE INDEX IF NOT EXISTS idx_management_codes_organization_id ON management_codes(organization_id);
CREATE INDEX IF NOT EXISTS idx_management_codes_code ON management_codes(code);
CREATE INDEX IF NOT EXISTS idx_admins_username ON admins(username);
CREATE INDEX IF NOT EXISTS idx_admins_organization_id ON admins(organization_id);
CREATE INDEX IF NOT EXISTS idx_drivers_management_code_id ON drivers(management_code_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_management_code_id ON vehicles(management_code_id);
CREATE INDEX IF NOT EXISTS idx_routes_management_code_id ON routes(management_code_id);
CREATE INDEX IF NOT EXISTS idx_users_management_code_id ON users(management_code_id);
CREATE INDEX IF NOT EXISTS idx_transportation_records_management_code_id ON transportation_records(management_code_id);
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
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_management_codes_updated_at BEFORE UPDATE ON management_codes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_admins_updated_at BEFORE UPDATE ON admins FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON drivers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_routes_updated_at BEFORE UPDATE ON routes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_destinations_updated_at BEFORE UPDATE ON destinations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transportation_records_updated_at BEFORE UPDATE ON transportation_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transportation_details_updated_at BEFORE UPDATE ON transportation_details FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) の設定
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE management_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE transportation_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE transportation_details ENABLE ROW LEVEL SECURITY;

-- 組織単位のRLSポリシー（現在は基本認証のみ、将来的に組織制御追加予定）
CREATE POLICY "Allow authenticated users" ON organizations FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users" ON management_codes FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users" ON admins FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users" ON drivers FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users" ON vehicles FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users" ON routes FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users" ON destinations FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users" ON users FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users" ON transportation_records FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users" ON transportation_details FOR ALL USING (auth.role() = 'authenticated');

-- サンプルデータの挿入

-- サンプル組織
INSERT INTO organizations (name, address, phone, email, representative_name, license_number, business_type) VALUES 
    ('福祉法人さくら', '東京都世田谷区1-1-1', '03-1234-5678', 'info@sakura-welfare.org', '田中代表', 'LICENSE001', '障害者通所支援')
ON CONFLICT DO NOTHING;

-- サンプル管理コード
INSERT INTO management_codes (organization_id, code, name) 
SELECT 
    o.id,
    '123456',
    'さくら通所支援センター'
FROM organizations o 
WHERE o.name = '福祉法人さくら'
ON CONFLICT (code) DO NOTHING;

-- サンプル管理者
INSERT INTO admins (username, password, email, name, organization_id)
SELECT 
    'admin',
    'password123',
    'admin@sakura-welfare.org',
    '管理者太郎',
    o.id
FROM organizations o 
WHERE o.name = '福祉法人さくら'
ON CONFLICT (username) DO NOTHING;

INSERT INTO drivers (name, employee_no, email, pin_code, management_code_id) 
SELECT 
    d.name,
    d.employee_no,
    d.email,
    d.pin_code,
    mc.id
FROM (VALUES 
    ('田中太郎', 'D001', 'tanaka@example.com', '1234'),
    ('佐藤花子', 'D002', 'sato@example.com', '5678'),
    ('鈴木一郎', 'D003', 'suzuki@example.com', '9999')
) AS d(name, employee_no, email, pin_code)
CROSS JOIN management_codes mc
WHERE mc.code = '123456'
ON CONFLICT (employee_no) DO NOTHING;

INSERT INTO vehicles (vehicle_no, vehicle_name, capacity, wheelchair_accessible, management_code_id) 
SELECT 
    v.vehicle_no,
    v.vehicle_name,
    v.capacity,
    v.wheelchair_accessible,
    mc.id
FROM (VALUES 
    ('1001', 'ハイエース1号車', 8, false),
    ('1002', 'ハイエース2号車', 8, true),
    ('1003', 'アルファード1号車', 7, false),
    ('1004', 'ハイエース3号車', 8, true),
    ('1005', 'セレナ1号車', 8, false)
) AS v(vehicle_no, vehicle_name, capacity, wheelchair_accessible)
CROSS JOIN management_codes mc
WHERE mc.code = '123456'
ON CONFLICT (vehicle_no) DO NOTHING;

INSERT INTO routes (route_name, route_code, display_order, management_code_id) 
SELECT 
    r.route_name,
    r.route_code,
    r.display_order,
    mc.id
FROM (VALUES 
    ('通所支援Aルート', 'ROUTE_A', 1),
    ('通所支援Bルート', 'ROUTE_B', 2),
    ('医療送迎ルート', 'ROUTE_MEDICAL', 3),
    ('外出支援ルート', 'ROUTE_OUTING', 4),
    ('通所支援Cルート', 'ROUTE_C', 5)
) AS r(route_name, route_code, display_order)
CROSS JOIN management_codes mc
WHERE mc.code = '123456'
ON CONFLICT (route_code) DO NOTHING;

-- 利用者サンプルデータ
INSERT INTO users (user_no, name, phone, address, emergency_contact, emergency_phone, wheelchair_user, special_notes, management_code_id) 
SELECT 
    u.user_no,
    u.name,
    u.phone,
    u.address,
    u.emergency_contact,
    u.emergency_phone,
    u.wheelchair_user,
    u.special_notes,
    mc.id
FROM (VALUES 
    ('U001', '山田太郎', '090-1234-5678', '東京都世田谷区1-1-1', '山田花子', '090-8765-4321', false, 'てんかん持ち、薬は朝夕服用'),
    ('U002', '田中次郎', '090-2345-6789', '東京都杉並区2-2-2', '田中美子', '090-7654-3210', true, '車椅子利用、リフト必要'),
    ('U003', '佐藤三郎', '090-3456-7890', '東京都練馬区3-3-3', '佐藤恵子', '090-6543-2109', false, '認知症、見守り必要'),
    ('U004', '鈴木四郎', '090-4567-8901', '東京都中野区4-4-4', '鈴木良子', '090-5432-1098', false, 'なし'),
    ('U005', '高橋五郎', '090-5678-9012', '東京都渋谷区5-5-5', '高橋明美', '090-4321-0987', true, '車椅子利用、介助なし')
) AS u(user_no, name, phone, address, emergency_contact, emergency_phone, wheelchair_user, special_notes)
CROSS JOIN management_codes mc
WHERE mc.code = '123456'
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