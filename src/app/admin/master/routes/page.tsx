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
          alert('更新に失敗しました: ' + (error.message || String(error)))
          return
        }
        alert('ルート情報を更新しました')
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
          alert('登録に失敗しました: ' + (error.message || String(error)))
          return
        }
        alert('新しいルートを登録しました')
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
      alert('保存に失敗しました: ' + (error instanceof Error ? error.message : String(error)))
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
        alert('削除に失敗しました: ' + (error.message || String(error)))
        return
      }
      alert('ルートを削除しました')

      fetchRoutes()
    } catch (error) {
      console.error('削除エラー:', error)
      alert('削除に失敗しました')
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-200 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">ルート情報を読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-200">
      {/* 統一ヘッダー */}
      <div className="welfare-header">
        <div className="welfare-header-content">
          <div className="welfare-header-title">
            <div className="welfare-header-icon">🛣️</div>
            <div className="welfare-header-text">
              <h1>ルート管理</h1>
              <p>配送ルートと配送先の管理</p>
            </div>
          </div>
          <div className="welfare-nav-buttons">
            <a href="/admin/dashboard" className="welfare-button welfare-button-outline">
              🏠 ダッシュボード
            </a>
            <button 
              onClick={() => setShowForm(true)}
              className="welfare-button welfare-button-primary"
            >
              ➕ 新規登録
            </button>
          </div>
        </div>
      </div>

      <div className="welfare-content">
        {/* ルート登録・編集フォーム */}
        {showForm && (
          <div className="welfare-section fade-in">
            <h2 className="welfare-section-title">
              {editingRoute ? '✏️ ルート情報の編集' : '🛣️ 新規ルート登録'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="welfare-filter-grid">
                <div className="welfare-filter-item">
                  <label>🛣️ ルート名 <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={formData.route_name}
                    onChange={(e) => setFormData({...formData, route_name: e.target.value})}
                    className="welfare-input"
                    placeholder="例: Aルート"
                    required
                  />
                  {errors.route_name && (
                    <p className="text-red-500 text-sm mt-1">{errors.route_name}</p>
                  )}
                </div>

                <div className="welfare-filter-item">
                  <label>🔢 ルートコード <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={formData.route_code}
                    onChange={(e) => setFormData({...formData, route_code: e.target.value})}
                    className="welfare-input"
                    placeholder="例: ROUTE_A"
                    required
                  />
                  {errors.route_code && (
                    <p className="text-red-500 text-sm mt-1">{errors.route_code}</p>
                  )}
                </div>

                <div className="welfare-filter-item">
                  <label>📊 表示順序</label>
                  <input
                    type="number"
                    value={formData.display_order}
                    onChange={(e) => setFormData({...formData, display_order: parseInt(e.target.value) || 0})}
                    className="welfare-input"
                    placeholder="1"
                    min="0"
                  />
                </div>

                <div className="welfare-filter-item">
                  <label>📈 ステータス</label>
                  <select
                    value={formData.is_active ? 'true' : 'false'}
                    onChange={(e) => setFormData({...formData, is_active: e.target.value === 'true'})}
                    className="welfare-select"
                  >
                    <option value="true">✅ アクティブ</option>
                    <option value="false">❌ 非アクティブ</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="button" 
                  onClick={handleCancel}
                  className="welfare-button welfare-button-outline flex-1"
                >
                  ❌ キャンセル
                </button>
                <button 
                  type="submit"
                  className="welfare-button welfare-button-primary flex-1"
                >
                  {editingRoute ? '✏️ 更新' : '➕ 登録'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ルート一覧 */}
        <div className="welfare-section">
          <h2 className="welfare-section-title">
            🛣️ ルート一覧 ({routes.length}件)
          </h2>

          {routes.length === 0 ? (
            <div className="welfare-empty-state">
              <div className="welfare-empty-icon">🛣️</div>
              <h3 className="welfare-empty-title">ルートが登録されていません</h3>
              <p className="welfare-empty-description">「新規登録」ボタンからルートを登録してください</p>
              <button 
                onClick={() => setShowForm(true)}
                className="welfare-button welfare-button-primary"
              >
                🛣️ 最初のルートを登録
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="welfare-table">
                <thead>
                  <tr>
                    <th>ルート名</th>
                    <th>ルートコード</th>
                    <th>表示順序</th>
                    <th>ステータス</th>
                    <th>登録日</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {routes.map((route) => (
                    <tr key={route.id}>
                      <td>
                        <span className="welfare-badge bg-blue-100 text-blue-800">
                          🛣️ {route.route_name}
                        </span>
                      </td>
                      <td className="font-medium">{route.route_code}</td>
                      <td className="text-center">
                        <span className="welfare-badge bg-gray-100 text-gray-800">
                          #{route.display_order}
                        </span>
                      </td>
                      <td>
                        {route.is_active ? (
                          <span className="status-safe">アクティブ</span>
                        ) : (
                          <span className="status-danger">非アクティブ</span>
                        )}
                      </td>
                      <td className="text-center">
                        {new Date(route.created_at).toLocaleDateString('ja-JP')}
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleEdit(route)}
                            className="welfare-button welfare-button-outline text-sm px-3 py-1"
                          >
                            ✏️
                          </button>
                          <button 
                            onClick={() => handleManageDestinations(route.id)}
                            className="welfare-button welfare-button-secondary text-sm px-3 py-1"
                          >
                            📍
                          </button>
                          <button 
                            onClick={() => handleDelete(route.id)}
                            className="welfare-button welfare-button-danger text-sm px-3 py-1"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}