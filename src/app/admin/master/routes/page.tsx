'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Route } from '@/types'

export default function RoutesManagementPage() {
  const [routes, setRoutes] = useState<Route[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingRoute, setEditingRoute] = useState<Route | null>(null)
  const [formData, setFormData] = useState({
    route_name: '',
    route_code: '',
    display_order: 0,
    is_active: true
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // 管理者セッション確認
    const sessionData = localStorage.getItem('adminSession')
    if (!sessionData) {
      router.push('/admin/login')
      return
    }
    
    fetchRoutes()
  }, [router])

  const fetchRoutes = async () => {
    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('routes')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('ルート取得エラー:', error)
        return
      }

      setRoutes(data || [])
    } catch (error) {
      console.error('ルート取得エラー:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.route_name.trim()) {
      newErrors.route_name = 'ルート名は必須です'
    }
    
    if (!formData.route_code.trim()) {
      newErrors.route_code = 'ルートコードは必須です'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    try {
      if (editingRoute) {
        // 更新
        const { error } = await supabase
          .from('routes')
          .update({
            route_name: formData.route_name,
            route_code: formData.route_code,
            display_order: formData.display_order,
            is_active: formData.is_active,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingRoute.id)

        if (error) {
          console.error('更新エラー:', error)
          return
        }
      } else {
        // 新規作成
        const { error } = await supabase
          .from('routes')
          .insert([{
            route_name: formData.route_name,
            route_code: formData.route_code,
            display_order: formData.display_order,
            is_active: formData.is_active
          }])

        if (error) {
          console.error('作成エラー:', error)
          return
        }
      }

      // フォームリセット
      setFormData({
        route_name: '',
        route_code: '',
        display_order: 0,
        is_active: true
      })
      setEditingRoute(null)
      setShowForm(false)
      fetchRoutes()
    } catch (error) {
      console.error('保存エラー:', error)
    }
  }

  const handleEdit = (route: Route) => {
    setEditingRoute(route)
    setFormData({
      route_name: route.route_name,
      route_code: route.route_code,
      display_order: route.display_order,
      is_active: route.is_active
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('このルートを削除してもよろしいですか？')) {
      return
    }

    try {
      const { error } = await supabase
        .from('routes')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('削除エラー:', error)
        return
      }

      fetchRoutes()
    } catch (error) {
      console.error('削除エラー:', error)
    }
  }

  const handleCancel = () => {
    setFormData({
      route_name: '',
      route_code: '',
      display_order: 0,
      is_active: true
    })
    setEditingRoute(null)
    setShowForm(false)
    setErrors({})
  }

  const handleManageDestinations = (routeId: string) => {
    router.push(`/admin/master/routes/${routeId}/destinations`)
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-white shadow">
        <div className="px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold text-gray-900">ルート管理</h1>
              <p className="text-sm text-gray-600">配送ルートと配送先の管理</p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => router.push('/admin/dashboard')}
                className="text-gray-600 text-sm px-3 py-1 border border-gray-300 rounded hover:bg-gray-50"
              >
                ダッシュボードに戻る
              </button>
              <button
                onClick={() => setShowForm(true)}
                className="bg-blue-600 text-white text-sm px-3 py-1 rounded hover:bg-blue-700"
              >
                新規登録
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* フォーム */}
        {showForm && (
          <div className="bg-white rounded-lg shadow mb-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">
                {editingRoute ? 'ルート編集' : 'ルート新規登録'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ルート名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.route_name}
                    onChange={(e) => setFormData({...formData, route_name: e.target.value})}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.route_name ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Aルート"
                  />
                  {errors.route_name && <p className="mt-1 text-sm text-red-500">{errors.route_name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ルートコード <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.route_code}
                    onChange={(e) => setFormData({...formData, route_code: e.target.value})}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.route_code ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="ROUTE_A"
                  />
                  {errors.route_code && <p className="mt-1 text-sm text-red-500">{errors.route_code}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    表示順序
                  </label>
                  <input
                    type="number"
                    value={formData.display_order}
                    onChange={(e) => setFormData({...formData, display_order: parseInt(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="1"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ステータス
                  </label>
                  <select
                    value={formData.is_active ? 'true' : 'false'}
                    onChange={(e) => setFormData({...formData, is_active: e.target.value === 'true'})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="true">アクティブ</option>
                    <option value="false">非アクティブ</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-2 mt-6">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  {editingRoute ? '更新' : '登録'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ルート一覧 */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">ルート一覧</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ルート名
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    開始地点
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    終了地点
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    予定時間
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    距離
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ステータス
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    登録日
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {routes.map((route) => (
                  <tr key={route.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {route.route_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {route.route_code}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {route.display_order}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        route.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {route.is_active ? 'アクティブ' : '非アクティブ'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(route.created_at).toLocaleDateString('ja-JP')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(route)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          編集
                        </button>
                        <button
                          onClick={() => handleManageDestinations(route.id)}
                          className="text-purple-600 hover:text-purple-900"
                        >
                          配送先
                        </button>
                        <button
                          onClick={() => handleDelete(route.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          削除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {routes.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">ルートが登録されていません</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}