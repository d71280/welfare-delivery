-- 事業者テーブル
CREATE TABLE IF NOT EXISTS organizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  phone VARCHAR(20),
  email VARCHAR(255),
  representative_name VARCHAR(255),
  license_number VARCHAR(100),
  business_type VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 管理コードテーブル
CREATE TABLE IF NOT EXISTS management_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  code VARCHAR(10) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 管理者テーブルに organization_id を追加
ALTER TABLE admins ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

-- ドライバーテーブルに management_code_id を追加
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS management_code_id UUID REFERENCES management_codes(id);

-- 車両テーブルに management_code_id を追加
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS management_code_id UUID REFERENCES management_codes(id);

-- 利用者テーブルに management_code_id を追加
ALTER TABLE users ADD COLUMN IF NOT EXISTS management_code_id UUID REFERENCES management_codes(id);

-- 送迎記録テーブルに management_code_id を追加
ALTER TABLE transportation_records ADD COLUMN IF NOT EXISTS management_code_id UUID REFERENCES management_codes(id);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_management_codes_organization_id ON management_codes(organization_id);
CREATE INDEX IF NOT EXISTS idx_management_codes_code ON management_codes(code);
CREATE INDEX IF NOT EXISTS idx_drivers_management_code_id ON drivers(management_code_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_management_code_id ON vehicles(management_code_id);
CREATE INDEX IF NOT EXISTS idx_users_management_code_id ON users(management_code_id);
CREATE INDEX IF NOT EXISTS idx_transportation_records_management_code_id ON transportation_records(management_code_id);

-- 管理コード生成関数
CREATE OR REPLACE FUNCTION generate_management_code()
RETURNS VARCHAR(10) AS $$
DECLARE
  code VARCHAR(10);
  exists_check INTEGER;
BEGIN
  LOOP
    -- 6桁の数字をランダム生成
    code := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    
    -- 既存のコードと重複していないかチェック
    SELECT COUNT(*) INTO exists_check FROM management_codes WHERE code = code;
    
    IF exists_check = 0 THEN
      EXIT;
    END IF;
  END LOOP;
  
  RETURN code;
END;
$$ LANGUAGE plpgsql;