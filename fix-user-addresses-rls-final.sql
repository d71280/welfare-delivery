-- user_addressesテーブルのRLSポリシーを完全にリセット

-- 1. 既存のすべてのポリシーを削除
DO $$ 
DECLARE 
    policy_rec RECORD;
BEGIN
    FOR policy_rec IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'user_addresses'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_rec.policyname || '" ON user_addresses';
    END LOOP;
END $$;

-- 2. RLSを一時的に無効化
ALTER TABLE user_addresses DISABLE ROW LEVEL SECURITY;

-- 3. RLSを再有効化
ALTER TABLE user_addresses ENABLE ROW LEVEL SECURITY;

-- 4. 新しいシンプルなポリシーを作成
CREATE POLICY "Enable all operations for authenticated users" 
ON user_addresses 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- 5. ポリシーが正しく設定されているか確認
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'user_addresses';

-- 6. テーブルの権限確認
SELECT 
    grantee, 
    privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name = 'user_addresses';