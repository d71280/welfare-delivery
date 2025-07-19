export default function AdminPage() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow">
        <h1 className="text-2xl font-bold mb-4">福祉送迎記録システム - 管理者エリア</h1>
        <p className="mb-4">福祉送迎業務の管理機能です。</p>
        <div className="space-y-3">
          <a href="/admin/login" className="block text-blue-600 hover:underline font-medium">
            管理者ログイン
          </a>
          <a href="/admin/dashboard" className="block text-blue-600 hover:underline font-medium">
            ダッシュボード
          </a>
          <a href="/admin/master/users" className="block text-green-600 hover:underline">
            利用者管理
          </a>
          <a href="/admin/master/drivers" className="block text-green-600 hover:underline">
            ドライバー管理
          </a>
          <a href="/admin/master/vehicles" className="block text-green-600 hover:underline">
            車両管理
          </a>
          <a href="/admin/master/routes" className="block text-green-600 hover:underline">
            ルート管理
          </a>
          <a href="/admin/transportation-records" className="block text-purple-600 hover:underline">
            送迎記録
          </a>
          <a href="/login" className="block text-gray-600 hover:underline mt-4">
            ドライバーログインに戻る
          </a>
        </div>
      </div>
    </div>
  )
}