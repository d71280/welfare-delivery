# 福祉送迎記録システム

福祉施設向けの送迎業務記録・管理システムです。利用者の送迎記録、ドライバー管理、車両管理などの機能を提供します。

## 主な機能

### 管理者機能
- **利用者管理**: 利用者情報の登録・編集・削除
- **ドライバー管理**: ドライバー情報の管理
- **車両管理**: 送迎車両の管理
- **ルート管理**: 送迎ルートの設定
- **送迎記録**: 送迎実績の確認・CSV出力

### ドライバー機能
- **送迎記録入力**: 日々の送迎記録の入力
- **利用者情報確認**: 送迎対象利用者の情報確認
- **ルート確認**: 担当ルートの詳細確認

## 技術スタック

- **フロントエンド**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **バックエンド**: Supabase (PostgreSQL)
- **認証**: Supabase Auth
- **状態管理**: Zustand
- **フォーム**: React Hook Form + Zod

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.local` ファイルを作成し、以下の環境変数を設定してください：

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. データベースのセットアップ

Supabaseプロジェクトで `supabase-schema.sql` ファイルを実行してデータベースを構築してください。

### 4. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてアプリケーションを確認してください。

## 使用方法

### 管理者ログイン
1. `/admin/login` にアクセス
2. 管理者認証でログイン
3. ダッシュボードから各機能にアクセス

### ドライバーログイン
1. `/login` にアクセス
2. ドライバーID、車両番号、PINコードでログイン
3. 送迎記録の入力・確認

## データベース構造

- **users**: 利用者情報
- **drivers**: ドライバー情報
- **vehicles**: 車両情報
- **routes**: 送迎ルート
- **destinations**: 送迎先
- **transportation_records**: 送迎記録
- **transportation_details**: 送迎詳細

## デプロイ

Vercelでのデプロイを推奨します：

```bash
npm run build
```

環境変数をVercelプロジェクトに設定し、GitHubリポジトリと連携してデプロイしてください。
