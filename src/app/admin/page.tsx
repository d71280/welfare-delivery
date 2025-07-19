export default function AdminPage() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow">
        <h1 className="text-2xl font-bold mb-4">管理者エリア</h1>
        <p className="mb-4">管理者機能のテストページです。</p>
        <div className="space-y-2">
          <a href="/admin/login" className="block text-blue-600 hover:underline">
            管理者ログイン
          </a>
          <a href="/admin/dashboard" className="block text-blue-600 hover:underline">
            ダッシュボード
          </a>
          <a href="/login" className="block text-gray-600 hover:underline">
            ドライバーログインに戻る
          </a>
        </div>
      </div>
    </div>
  )
}