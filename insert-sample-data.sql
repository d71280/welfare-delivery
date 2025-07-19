-- サンプルデータの挿入

-- ドライバーデータ
INSERT INTO drivers (name, employee_no, email, pin_code) VALUES 
    ('田中太郎', 'D001', 'tanaka@example.com', '1234'),
    ('佐藤花子', 'D002', 'sato@example.com', '5678'),
    ('鈴木一郎', 'D003', 'suzuki@example.com', '9999')
ON CONFLICT (employee_no) DO NOTHING;

-- 車両データ
INSERT INTO vehicles (vehicle_no) VALUES 
    ('1001'),
    ('1002'),
    ('1003'),
    ('1004'),
    ('1005')
ON CONFLICT (vehicle_no) DO NOTHING;

-- ルートデータ
INSERT INTO routes (route_name, route_code, display_order) VALUES 
    ('Aルート', 'ROUTE_A', 1),
    ('Bルート', 'ROUTE_B', 2),
    ('Cルート', 'ROUTE_C', 3),
    ('Dルート', 'ROUTE_D', 4),
    ('Eルート', 'ROUTE_E', 5),
    ('Fルート', 'ROUTE_F', 6),
    ('Gルート', 'ROUTE_G', 7),
    ('Hルート', 'ROUTE_H', 8),
    ('Iルート', 'ROUTE_I', 9),
    ('Jルート', 'ROUTE_J', 10)
ON CONFLICT (route_code) DO NOTHING;

-- Aルートの配送先
INSERT INTO destinations (route_id, name, address, display_order) 
SELECT 
    r.id,
    dest.name,
    dest.address,
    dest.display_order
FROM routes r
CROSS JOIN (
    VALUES 
        ('配送先A1', '東京都渋谷区1-1-1', 1),
        ('配送先A2', '東京都新宿区2-2-2', 2),
        ('配送先A3', '東京都品川区3-3-3', 3),
        ('配送先A4', '東京都港区4-4-4', 4),
        ('配送先A5', '東京都中央区5-5-5', 5)
) AS dest(name, address, display_order)
WHERE r.route_code = 'ROUTE_A'
ON CONFLICT DO NOTHING;

-- Bルートの配送先
INSERT INTO destinations (route_id, name, address, display_order) 
SELECT 
    r.id,
    dest.name,
    dest.address,
    dest.display_order
FROM routes r
CROSS JOIN (
    VALUES 
        ('配送先B1', '東京都江東区1-1-1', 1),
        ('配送先B2', '東京都墨田区2-2-2', 2),
        ('配送先B3', '東京都台東区3-3-3', 3),
        ('配送先B4', '東京都荒川区4-4-4', 4)
) AS dest(name, address, display_order)
WHERE r.route_code = 'ROUTE_B'
ON CONFLICT DO NOTHING;