'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AdminLoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      // データベースで管理者認証
      const { data: admin, error: adminError } = await supabase
        .from('admins')
        .select('id, username, password, organization_id')
        .eq('username', username)
        .eq('password', password)
        .single()

      if (adminError || !admin) {
        throw new Error('ユーザー名またはパスワードが正しくありません')
      }

      // セッション情報をローカルストレージに保存
      const adminSession = {
        adminId: admin.id,
        role: 'admin',
        username: admin.username,
        organizationId: admin.organization_id,
        loginTime: new Date().toISOString()
      }
      
      localStorage.setItem('adminSession', JSON.stringify(adminSession))
      
      // 管理者ダッシュボードにリダイレクト
      router.push('/admin/dashboard')
      
    } catch (err) {
      console.error('ログインエラー:', err)
      setError(err instanceof Error ? err.message : 'ログインに失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            配送管理システム
          </h1>
          <p className="text-gray-600">管理者ログイン</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {/* ユーザー名入力 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ユーザー名
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="管理者ユーザー名を入力"
              required
            />
          </div>

          {/* パスワード入力 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              パスワード
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="パスワードを入力"
              required
            />
          </div>

          {/* エラーメッセージ */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* ログインボタン */}
          <button
            type="submit"
            disabled={isLoading || !username || !password}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            {isLoading ? '処理中...' : 'ログイン'}
          </button>
        </form>

        {/* 管理者認証情報の表示（開発用） */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-blue-800 text-sm font-medium mb-2">ログイン方法:</p>
          <p className="text-blue-700 text-sm">新規登録で作成したアカウントでログインしてください</p>
          <p className="text-blue-700 text-sm">または、新規事業者登録から始めてください</p>
        </div>

        {/* 新規登録リンク */}
        <div className="mt-6 text-center">
          <div className="space-y-2">
            <button
              onClick={() => router.push('/admin/register')}
              className="text-blue-600 text-sm hover:text-blue-700 font-medium"
            >
              新規事業者登録はこちら
            </button>
            <br />
            <button
              onClick={() => router.push('/login')}
              className="text-gray-500 text-sm hover:text-gray-700"
            >
              ドライバーログインに戻る
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}