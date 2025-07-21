-- transportation_detailsテーブルのdestination_idをNULLABLEに変更
-- 往復送迎では目的地が不明確な場合があるため

-- NOT NULL制約を削除
ALTER TABLE transportation_details 
ALTER COLUMN destination_id DROP NOT NULL;

-- インデックスを再作成（NULL値を考慮）
DROP INDEX IF EXISTS idx_transportation_details_destination;
CREATE INDEX idx_transportation_details_destination 
ON transportation_details(destination_id) 
WHERE destination_id IS NOT NULL;

-- コメントを追加
COMMENT ON COLUMN transportation_details.destination_id IS 
'目的地ID。往復送迎など目的地が不明確な場合はNULL可能。';