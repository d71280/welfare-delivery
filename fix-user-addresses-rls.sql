-- user_addressesテーブルのRLSポリシー修正
-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Allow authenticated users" ON user_addresses;

-- より具体的なポリシーを作成
CREATE POLICY "Allow authenticated users full access" ON user_addresses 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- または、よりセキュアなポリシー（推奨）
-- CREATE POLICY "Allow authenticated users read access" ON user_addresses 
-- FOR SELECT 
-- TO authenticated 
-- USING (true);

-- CREATE POLICY "Allow authenticated users insert access" ON user_addresses 
-- FOR INSERT 
-- TO authenticated 
-- WITH CHECK (true);

-- CREATE POLICY "Allow authenticated users update access" ON user_addresses 
-- FOR UPDATE 
-- TO authenticated 
-- USING (true) 
-- WITH CHECK (true);

-- CREATE POLICY "Allow authenticated users delete access" ON user_addresses 
-- FOR DELETE 
-- TO authenticated 
-- USING (true);

-- テーブルが存在しない場合は作成
CREATE TABLE IF NOT EXISTS user_addresses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    address_type TEXT NOT NULL CHECK (address_type IN ('home', 'school', 'work', 'other')),
    address_name TEXT NOT NULL,
    address TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_user_addresses_user ON user_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_user_addresses_type ON user_addresses(address_type);
CREATE INDEX IF NOT EXISTS idx_user_addresses_active ON user_addresses(is_active);

-- 各利用者につき1つの主要住所を保証するための制約
DROP INDEX IF EXISTS idx_user_addresses_primary;
CREATE UNIQUE INDEX idx_user_addresses_primary ON user_addresses(user_id) WHERE is_primary = true;

-- updated_at自動更新トリガー
DROP TRIGGER IF EXISTS update_user_addresses_updated_at ON user_addresses;
CREATE TRIGGER update_user_addresses_updated_at 
BEFORE UPDATE ON user_addresses 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- RLS有効化
ALTER TABLE user_addresses ENABLE ROW LEVEL SECURITY;