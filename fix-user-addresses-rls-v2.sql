-- user_addressesテーブルのRLSポリシーを完全に再設定

-- 既存のポリシーをすべて削除
DROP POLICY IF EXISTS "Allow authenticated users full access" ON user_addresses;
DROP POLICY IF EXISTS "Allow authenticated users" ON user_addresses;
DROP POLICY IF EXISTS "Allow authenticated users read access" ON user_addresses;
DROP POLICY IF EXISTS "Allow authenticated users insert access" ON user_addresses;
DROP POLICY IF EXISTS "Allow authenticated users update access" ON user_addresses;
DROP POLICY IF EXISTS "Allow authenticated users delete access" ON user_addresses;

-- RLSを無効化
ALTER TABLE user_addresses DISABLE ROW LEVEL SECURITY;

-- RLSを再有効化
ALTER TABLE user_addresses ENABLE ROW LEVEL SECURITY;

-- シンプルで確実なポリシーを作成
CREATE POLICY "Allow all for authenticated users" ON user_addresses 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- ポリシーの確認
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'user_addresses';