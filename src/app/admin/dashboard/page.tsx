'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface AdminSession {
  role: string
  username: string
  loginTime: string
}


export default function AdminDashboardPage() {
  const [session, setSession] = useState<AdminSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // 管理者セッション確認
    const sessionData = localStorage.getItem('adminSession')
    if (!sessionData) {
      router.push('/admin/login')
      return
    }

    const parsedSession = JSON.parse(sessionData) as AdminSession
    setSession(parsedSession)

    // ダッシュボードデータ取得
    fetchDashboardData()
  }, [router])

  const fetchDashboardData = async () => {
    try {
      // 基本的なダッシュボードデータの読み込み完了
      console.log('ダッシュボードデータ読み込み完了')
    } catch (error) {
      console.error('ダッシュボードデータ取得エラー:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('adminSession')
    router.push('/admin/login')
  }


  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-white shadow">
        <div className="px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                管理者ダッシュボード
              </h1>
              <p className="text-sm text-gray-600">
                ようこそ、{session.username}さん
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="text-red-600 text-sm px-3 py-1 border border-red-300 rounded hover:bg-red-50"
            >
              ログアウト
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">

        {/* メニューカード */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <button
            onClick={() => router.push('/admin/master/drivers')}
            className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow text-left"
          >
            <h3 className="text-lg font-medium text-gray-900 mb-2">ドライバー管理</h3>
            <p className="text-gray-600">ドライバー情報の登録・編集・削除</p>
          </button>

          <button
            onClick={() => router.push('/admin/master/vehicles')}
            className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow text-left"
          >
            <h3 className="text-lg font-medium text-gray-900 mb-2">車両管理</h3>
            <p className="text-gray-600">車両情報の登録・編集・削除</p>
          </button>


          <button
            onClick={() => router.push('/admin/master/users')}
            className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow text-left"
          >
            <h3 className="text-lg font-medium text-gray-900 mb-2">利用者管理</h3>
            <p className="text-gray-600">ご利用者様の情報管理</p>
          </button>

          <button
            onClick={() => router.push('/admin/transportation-records')}
            className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow text-left"
          >
            <h3 className="text-lg font-medium text-gray-900 mb-2">送迎記録</h3>
            <p className="text-gray-600">送迎記録の一覧と詳細確認</p>
          </button>

          <button
            onClick={() => router.push('/admin/settings')}
            className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow text-left"
          >
            <h3 className="text-lg font-medium text-gray-900 mb-2">事業者設定</h3>
            <p className="text-gray-600">事業者情報・管理コード管理</p>
          </button>

        </div>

        {/* 利用者選択送迎システム */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">送迎管理システム</h2>
            <p className="text-sm text-gray-600 mt-1">利用者を選択して個別送迎を開始</p>
          </div>
          <div className="p-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🚐</span>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">送迎開始</h3>
              <p className="text-gray-600 mb-4">ドライバーログインページから利用者を選択して送迎を開始してください</p>
              <button
                onClick={() => router.push('/login')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg"
              >
                🚐 送迎開始ページへ
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}