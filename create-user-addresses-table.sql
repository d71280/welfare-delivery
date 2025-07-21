-- 利用者住所テーブル (User Addresses)
-- 利用者ごとに複数の住所（自宅、学校など）を管理
CREATE TABLE IF NOT EXISTS user_addresses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    address_type TEXT NOT NULL CHECK (address_type IN ('home', 'school', 'work', 'other')),
    address_name TEXT NOT NULL, -- 例: "自宅", "○○学校", "職場"
    address TEXT NOT NULL, -- 実際の住所
    is_primary BOOLEAN DEFAULT false, -- 主要な住所かどうか
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    notes TEXT, -- 住所に関する特記事項
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_user_addresses_user ON user_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_user_addresses_type ON user_addresses(address_type);
CREATE INDEX IF NOT EXISTS idx_user_addresses_active ON user_addresses(is_active);

-- 各利用者につき1つの主要住所を保証するための制約
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_addresses_primary ON user_addresses(user_id) WHERE is_primary = true;

-- updated_at自動更新トリガー
CREATE TRIGGER update_user_addresses_updated_at BEFORE UPDATE ON user_addresses 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) の設定
ALTER TABLE user_addresses ENABLE ROW LEVEL SECURITY;

-- RLSポリシー（認証済みユーザーのみアクセス可能）
CREATE POLICY "Allow authenticated users" ON user_addresses FOR ALL USING (auth.role() = 'authenticated');

-- 既存の利用者データから初期データを移行
-- users テーブルの address カラムから user_addresses テーブルへデータを移行
INSERT INTO user_addresses (user_id, address_type, address_name, address, is_primary)
SELECT 
    id,
    'home',
    '自宅',
    address,
    true
FROM users
WHERE address IS NOT NULL AND address != ''
ON CONFLICT DO NOTHING;

-- transportation_details テーブルに住所IDを追加
ALTER TABLE transportation_details 
ADD COLUMN IF NOT EXISTS pickup_address_id UUID REFERENCES user_addresses(id),
ADD COLUMN IF NOT EXISTS dropoff_address_id UUID REFERENCES user_addresses(id);

-- コメント追加
COMMENT ON TABLE user_addresses IS '利用者の複数住所を管理するテーブル';
COMMENT ON COLUMN user_addresses.address_type IS '住所タイプ: home(自宅), school(学校), work(職場), other(その他)';
COMMENT ON COLUMN user_addresses.address_name IS '住所の名称（例: 自宅、○○学校）';
COMMENT ON COLUMN user_addresses.is_primary IS '主要な住所かどうか（各利用者につき1つのみ）';
COMMENT ON COLUMN transportation_details.pickup_address_id IS 'お迎え場所の住所ID';
COMMENT ON COLUMN transportation_details.dropoff_address_id IS '降車場所の住所ID';