-- 緊急修正: user_addressesテーブルのRLSを完全に無効化

-- Step 1: RLSを完全に無効化
ALTER TABLE user_addresses DISABLE ROW LEVEL SECURITY;

-- Step 2: 既存のすべてのポリシーを強制削除
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON user_addresses;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON user_addresses;
DROP POLICY IF EXISTS "Allow authenticated users full access" ON user_addresses;
DROP POLICY IF EXISTS "Allow authenticated users" ON user_addresses;

-- Step 3: テーブルの権限を確認・修正
GRANT ALL ON user_addresses TO authenticated;
GRANT ALL ON user_addresses TO anon;
GRANT ALL ON user_addresses TO service_role;

-- Step 4: 一時的にRLSを無効のままにする（テスト用）
-- ALTER TABLE user_addresses ENABLE ROW LEVEL SECURITY;

-- 確認用クエリ
SELECT 
    schemaname, 
    tablename, 
    rowsecurity,
    hasrls
FROM pg_tables 
WHERE tablename = 'user_addresses';

-- ポリシー確認
SELECT policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'user_addresses';