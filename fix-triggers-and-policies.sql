-- 既存のトリガーとポリシーを削除してから再作成

-- RLSポリシーを削除
DROP POLICY IF EXISTS "Allow authenticated users" ON drivers;
DROP POLICY IF EXISTS "Allow authenticated users" ON vehicles;
DROP POLICY IF EXISTS "Allow authenticated users" ON routes;
DROP POLICY IF EXISTS "Allow authenticated users" ON destinations;
DROP POLICY IF EXISTS "Allow authenticated users" ON delivery_records;
DROP POLICY IF EXISTS "Allow authenticated users" ON delivery_details;

-- 既存のトリガーを削除
DROP TRIGGER IF EXISTS update_drivers_updated_at ON drivers;
DROP TRIGGER IF EXISTS update_vehicles_updated_at ON vehicles;
DROP TRIGGER IF EXISTS update_routes_updated_at ON routes;
DROP TRIGGER IF EXISTS update_destinations_updated_at ON destinations;
DROP TRIGGER IF EXISTS update_delivery_records_updated_at ON delivery_records;
DROP TRIGGER IF EXISTS update_delivery_details_updated_at ON delivery_details;

-- トリガー関数を再作成
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- トリガーを再作成
CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON drivers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_routes_updated_at BEFORE UPDATE ON routes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_destinations_updated_at BEFORE UPDATE ON destinations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_delivery_records_updated_at BEFORE UPDATE ON delivery_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_delivery_details_updated_at BEFORE UPDATE ON delivery_details FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 新しいRLSポリシーを作成（すべてのユーザーに読み取り権限、認証済みユーザーに全権限）
CREATE POLICY "Allow read access for all users" ON drivers FOR SELECT USING (true);
CREATE POLICY "Allow full access for authenticated users" ON drivers FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow read access for all users" ON vehicles FOR SELECT USING (true);
CREATE POLICY "Allow full access for authenticated users" ON vehicles FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow read access for all users" ON routes FOR SELECT USING (true);
CREATE POLICY "Allow full access for authenticated users" ON routes FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow read access for all users" ON destinations FOR SELECT USING (true);
CREATE POLICY "Allow full access for authenticated users" ON destinations FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow read access for all users" ON delivery_records FOR SELECT USING (true);
CREATE POLICY "Allow full access for authenticated users" ON delivery_records FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow read access for all users" ON delivery_details FOR SELECT USING (true);
CREATE POLICY "Allow full access for authenticated users" ON delivery_details FOR ALL TO authenticated USING (true);