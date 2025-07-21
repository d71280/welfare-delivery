'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Driver } from '@/types'

export default function DriversManagementPage() {
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    employee_no: '',
    email: '',
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
    
    fetchDrivers()
  }, [router])

  const fetchDrivers = async () => {
    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('ドライバー取得エラー:', error)
        return
      }

      setDrivers(data || [])
    } catch (error) {
      console.error('ドライバー取得エラー:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.name.trim()) {
      newErrors.name = '名前は必須です'
    }
    
    if (!formData.employee_no.trim()) {
      newErrors.employee_no = '社員番号は必須です'
    }
    
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'メールアドレスが無効です'
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
      if (editingDriver) {
        // 更新
        const { error } = await supabase
          .from('drivers')
          .update({
            name: formData.name,
            employee_no: formData.employee_no,
            email: formData.email || null,
            is_active: formData.is_active,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingDriver.id)

        if (error) {
          console.error('更新エラー:', error)
          alert('更新に失敗しました: ' + (error.message || String(error)))
          return
        }
        alert('ドライバー情報を更新しました')
      } else {
        // 新規作成
        const { error } = await supabase
          .from('drivers')
          .insert([{
            name: formData.name,
            employee_no: formData.employee_no,
            email: formData.email || null,
            is_active: formData.is_active
          }])

        if (error) {
          console.error('作成エラー:', error)
          alert('登録に失敗しました: ' + (error.message || String(error)))
          return
        }
        alert('新しいドライバーを登録しました')
      }

      // フォームリセット
      setFormData({
        name: '',
        employee_no: '',
        email: '',
        is_active: true
      })
      setEditingDriver(null)
      setShowForm(false)
      fetchDrivers()
    } catch (error) {
      console.error('保存エラー:', error)
      alert('保存に失敗しました: ' + (error instanceof Error ? error.message : String(error)))
    }
  }

  const handleEdit = (driver: Driver) => {
    setEditingDriver(driver)
    setFormData({
      name: driver.name,
      employee_no: driver.employee_no,
      email: driver.email || '',
      is_active: driver.is_active
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('このドライバーを削除してもよろしいですか？')) {
      return
    }

    try {
      const { error } = await supabase
        .from('drivers')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('削除エラー:', error)
        alert('削除に失敗しました: ' + (error.message || String(error)))
        return
      }
      alert('ドライバーを削除しました')

      fetchDrivers()
    } catch (error) {
      console.error('削除エラー:', error)
      alert('削除に失敗しました')
    }
  }

  const handleCancel = () => {
    setFormData({
      name: '',
      employee_no: '',
      email: '',
      is_active: true
    })
    setEditingDriver(null)
    setShowForm(false)
    setErrors({})
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-200 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">ドライバー情報を読み込み中...</p>
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
            <div className="welfare-header-icon">🚗</div>
            <div className="welfare-header-text">
              <h1>ドライバー管理</h1>
              <p>ドライバー情報の登録・編集・削除</p>
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
        {/* ドライバー登録・編集フォーム */}
        {showForm && (
          <div className="welfare-section fade-in">
            <h2 className="welfare-section-title">
              {editingDriver ? '✏️ ドライバー情報の編集' : '🚗 新規ドライバー登録'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="welfare-filter-grid">
                <div className="welfare-filter-item">
                  <label>👤 名前 <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="welfare-input"
                    placeholder="例: 山田太郎"
                    required
                  />
                  {errors.name && (
                    <p className="text-red-500 text-sm mt-1">{errors.name}</p>
                  )}
                </div>

                <div className="welfare-filter-item">
                  <label>💼 社員番号 <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={formData.employee_no}
                    onChange={(e) => setFormData({...formData, employee_no: e.target.value})}
                    className="welfare-input"
                    placeholder="例: D001"
                    required
                  />
                  {errors.employee_no && (
                    <p className="text-red-500 text-sm mt-1">{errors.employee_no}</p>
                  )}
                </div>

                <div className="welfare-filter-item">
                  <label>📧 メールアドレス</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="welfare-input"
                    placeholder="例: yamada@example.com"
                  />
                  {errors.email && (
                    <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                  )}
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
                  {editingDriver ? '✏️ 更新' : '➕ 登録'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ドライバー一覧 */}
        <div className="welfare-section">
          <h2 className="welfare-section-title">
            🚗 ドライバー一覧 ({drivers.length}名)
          </h2>

          {drivers.length === 0 ? (
            <div className="welfare-empty-state">
              <div className="welfare-empty-icon">🚗</div>
              <h3 className="welfare-empty-title">ドライバーが登録されていません</h3>
              <p className="welfare-empty-description">「新規登録」ボタンからドライバーを登録してください</p>
              <button 
                onClick={() => setShowForm(true)}
                className="welfare-button welfare-button-primary"
              >
                🚗 最初のドライバーを登録
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="welfare-table">
                <thead>
                  <tr>
                    <th>名前</th>
                    <th>社員番号</th>
                    <th>メールアドレス</th>
                    <th>ステータス</th>
                    <th>登録日</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {drivers.map((driver) => (
                    <tr key={driver.id}>
                      <td>
                        <span className="welfare-badge bg-blue-100 text-blue-800">
                          👤 {driver.name}
                        </span>
                      </td>
                      <td className="font-medium">{driver.employee_no}</td>
                      <td className="text-center">
                        {driver.email ? (
                          <span className="welfare-badge bg-green-100 text-green-800">
                            📧 {driver.email}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td>
                        {driver.is_active ? (
                          <span className="status-safe">アクティブ</span>
                        ) : (
                          <span className="status-danger">非アクティブ</span>
                        )}
                      </td>
                      <td className="text-center">
                        {new Date(driver.created_at).toLocaleDateString('ja-JP')}
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleEdit(driver)}
                            className="welfare-button welfare-button-outline text-sm px-3 py-1"
                          >
                            ✏️
                          </button>
                          <button 
                            onClick={() => handleDelete(driver.id)}
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