# データベース制約修正手順

## 問題
`transportation_details`テーブルの`destination_id`カラムにNOT NULL制約があるため、往復送迎でNULL値を挿入する際にエラーが発生している。

## 解決手順

1. Supabaseダッシュボードにアクセス
2. SQL Editorを開く
3. 以下のSQLを実行:

```sql
-- transportation_detailsテーブルのdestination_idをNULLABLEに変更
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
```

## 実行後の確認
- エラーが解消され、個別の時間記録が正常に動作することを確認