-- RLSポリシーを修正（匿名アクセスも許可）

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Allow authenticated users" ON drivers;
DROP POLICY IF EXISTS "Allow authenticated users" ON vehicles;
DROP POLICY IF EXISTS "Allow authenticated users" ON routes;
DROP POLICY IF EXISTS "Allow authenticated users" ON destinations;
DROP POLICY IF EXISTS "Allow authenticated users" ON delivery_records;
DROP POLICY IF EXISTS "Allow authenticated users" ON delivery_details;

-- 新しいポリシーを作成（認証済みユーザーと匿名ユーザーの両方を許可）
CREATE POLICY "Allow all authenticated and anon users" ON drivers FOR ALL USING (true);
CREATE POLICY "Allow all authenticated and anon users" ON vehicles FOR ALL USING (true);
CREATE POLICY "Allow all authenticated and anon users" ON routes FOR ALL USING (true);
CREATE POLICY "Allow all authenticated and anon users" ON destinations FOR ALL USING (true);
CREATE POLICY "Allow all authenticated and anon users" ON delivery_records FOR ALL USING (true);
CREATE POLICY "Allow all authenticated and anon users" ON delivery_details FOR ALL USING (true);