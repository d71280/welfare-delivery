'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { User, UserInsert, UserUpdate } from '@/types'
import { createClient } from '@/lib/supabase/client'

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [formData, setFormData] = useState<Partial<UserInsert>>({
    user_no: '',
    name: '',
    phone: '',
    address: '',
    emergency_contact: '',
    emergency_phone: '',
    wheelchair_user: false,
    special_notes: '',
    management_code_id: '',
    is_active: true
  })

  const [availableManagementCodes, setAvailableManagementCodes] = useState<{id: string, code: string, name: string}[]>([])
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
    
    fetchUsers()
    fetchManagementCodes()
  }, [router])

  const fetchManagementCodes = async () => {
    try {
      const sessionData = localStorage.getItem('adminSession')
      if (!sessionData) return
      
      const { organizationId } = JSON.parse(sessionData)
      
      const { data, error } = await supabase
        .from('management_codes')
        .select('id, code, name')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('name')
      
      if (error) {
        console.error('管理コード取得エラー:', error)
        return
      }
      
      setAvailableManagementCodes(data || [])
    } catch (error) {
      console.error('管理コード取得エラー:', error)
    }
  }

  const fetchUsers = async () => {
    try {
      setLoading(true)
      
      // 管理者セッションから管理コードIDを取得
      const sessionData = localStorage.getItem('adminSession')
      if (!sessionData) {
        router.push('/admin/login')
        return
      }
      
      const { organizationId } = JSON.parse(sessionData)
      
      // 管理コードIDを取得
      const { data: managementCodes, error: mgmtError } = await supabase
        .from('management_codes')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
      
      if (mgmtError || !managementCodes?.length) {
        console.error('管理コード取得エラー:', mgmtError)
        setUsers([])
        return
      }
      
      const managementCodeIds = managementCodes.map(code => code.id)
      
      // 管理コードでフィルタリングして利用者を取得
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .in('management_code_id', managementCodeIds)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('利用者取得エラー:', error)
        return
      }

      setUsers(data || [])
    } catch (error) {
      console.error('利用者取得エラー:', error)
    } finally {
      setLoading(false)
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.user_no?.trim()) {
      newErrors.user_no = '利用者番号は必須です'
    }
    
    if (!formData.name?.trim()) {
      newErrors.name = '名前は必須です'
    }
    
    if (!formData.management_code_id) {
      newErrors.management_code_id = '管理コードは必須です'
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
      if (editingUser) {
        const { error } = await supabase
          .from('users')
          .update({
            ...formData,
            updated_at: new Date().toISOString()
          } as UserUpdate)
          .eq('id', editingUser.id)
        
        if (error) {
          console.error('利用者の更新に失敗しました:', error)
          alert('利用者の更新に失敗しました: ' + (error.message || String(error)))
          return
        }
        alert('利用者情報を更新しました')
      } else {
        const { error } = await supabase
          .from('users')
          .insert([formData as UserInsert])
        
        if (error) {
          console.error('利用者の登録に失敗しました:', error)
          alert('利用者の登録に失敗しました: ' + (error.message || String(error)))
          return
        }
        alert('新しい利用者を登録しました')
      }

      await fetchUsers()
      resetForm()
    } catch (error) {
      console.error('利用者の保存に失敗しました:', error)
      alert('利用者の保存に失敗しました: ' + (error instanceof Error ? error.message : String(error)))
    }
  }

  const handleEdit = (user: User) => {
    setEditingUser(user)
    setFormData({
      user_no: user.user_no,
      name: user.name,
      phone: user.phone || '',
      address: user.address || '',
      emergency_contact: user.emergency_contact || '',
      emergency_phone: user.emergency_phone || '',
      wheelchair_user: user.wheelchair_user,
      special_notes: user.special_notes || '',
      management_code_id: user.management_code_id || '',
      is_active: user.is_active
    })
    setIsFormOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('この利用者を削除してもよろしいですか？')) return

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('利用者の削除に失敗しました:', error)
        alert('利用者の削除に失敗しました: ' + (error.message || String(error)))
        return
      }
      alert('利用者を削除しました')
      await fetchUsers()
    } catch (error) {
      console.error('利用者の削除に失敗しました:', error)
      alert('利用者の削除に失敗しました')
    }
  }

  const resetForm = () => {
    setFormData({
      user_no: '',
      name: '',
      phone: '',
      address: '',
      emergency_contact: '',
      emergency_phone: '',
      wheelchair_user: false,
      special_notes: '',
      management_code_id: '',
      is_active: true
    })
    setEditingUser(null)
    setIsFormOpen(false)
    setErrors({})
  }

  if (loading) {
    return <div className="p-6">読み込み中...</div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-200">
      {/* 統一ヘッダー */}
      <div className="welfare-header">
        <div className="welfare-header-content">
          <div className="welfare-header-title">
            <div className="welfare-header-icon">👥</div>
            <div className="welfare-header-text">
              <h1>利用者管理</h1>
              <p>ご利用者様の情報を安全に管理します</p>
            </div>
          </div>
          <div className="welfare-nav-buttons">
            <a href="/admin/dashboard" className="welfare-button welfare-button-outline">
              🏠 ダッシュボード
            </a>
            <button 
              onClick={() => setIsFormOpen(true)}
              className="welfare-button welfare-button-primary"
            >
              ➕ 新規登録
            </button>
          </div>
        </div>
      </div>

      <div className="welfare-content">
        {isFormOpen && (
          <div className="welfare-section fade-in">
            <h2 className="welfare-section-title">
              {editingUser ? '✏️ 利用者情報の編集' : '👥 新規利用者登録'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="welfare-filter-grid">
                <div className="welfare-filter-item">
                  <label>🔢 利用者番号 <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={formData.user_no}
                    onChange={(e) => setFormData({ ...formData, user_no: e.target.value })}
                    className="welfare-input"
                    placeholder="例: U001"
                    required
                  />
                  {errors.user_no && (
                    <p className="text-red-500 text-sm mt-1">{errors.user_no}</p>
                  )}
                </div>
                <div className="welfare-filter-item">
                  <label>👤 お名前 <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="welfare-input"
                    placeholder="例: 山田太郎"
                    required
                  />
                  {errors.name && (
                    <p className="text-red-500 text-sm mt-1">{errors.name}</p>
                  )}
                </div>
                <div className="welfare-filter-item">
                  <label>📞 電話番号</label>
                  <input
                    type="tel"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="welfare-input"
                    placeholder="例: 03-1234-5678"
                  />
                </div>
                <div className="welfare-filter-item">
                  <label>🚨 緊急連絡先電話</label>
                  <input
                    type="tel"
                    value={formData.emergency_phone || ''}
                    onChange={(e) => setFormData({ ...formData, emergency_phone: e.target.value })}
                    className="welfare-input"
                    placeholder="例: 080-1234-5678"
                  />
                </div>
                <div className="welfare-filter-item">
                  <label>🏠 ご住所</label>
                  <input
                    type="text"
                    value={formData.address || ''}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="welfare-input"
                    placeholder="例: 東京都○○区△△町1-2-3"
                  />
                </div>
                <div className="welfare-filter-item">
                  <label>👨‍👩‍👧‍👦 緊急連絡先（お名前）</label>
                  <input
                    type="text"
                    value={formData.emergency_contact || ''}
                    onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
                    className="welfare-input"
                    placeholder="例: 山田花子（ご家族など）"
                  />
                  {errors.emergency_phone && (
                    <p className="text-red-500 text-sm mt-1">{errors.emergency_phone}</p>
                  )}
                </div>
                <div className="welfare-filter-item">
                  <label>🔑 管理コード <span className="text-red-500">*</span></label>
                  <select
                    value={formData.management_code_id || ''}
                    onChange={(e) => setFormData({ ...formData, management_code_id: e.target.value })}
                    className="welfare-select"
                    required
                  >
                    <option value="">管理コードを選択してください</option>
                    {availableManagementCodes.map((code) => (
                      <option key={code.id} value={code.id}>
                        {code.code} - {code.name}
                      </option>
                    ))}
                  </select>
                  {errors.management_code_id && (
                    <p className="text-red-500 text-sm mt-1">{errors.management_code_id}</p>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="wheelchair_user"
                    checked={formData.wheelchair_user}
                    onChange={(e) => setFormData({ ...formData, wheelchair_user: e.target.checked })}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="wheelchair_user" className="text-lg font-medium text-gray-900">
                    ♿ 車椅子対応
                  </label>
                </div>

                <div className="welfare-filter-item">
                  <label>📝 特記事項・注意点</label>
                  <textarea
                    value={formData.special_notes || ''}
                    onChange={(e) => setFormData({ ...formData, special_notes: e.target.value })}
                    className="welfare-input"
                    rows={4}
                    placeholder="アレルギー、服薬状況、介助の注意点、送迎時の配慮事項など"
                  />
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                  />
                  <label htmlFor="is_active" className="text-lg font-medium text-gray-900">
                    ✅ 使用可能
                  </label>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="button" 
                  onClick={resetForm}
                  className="welfare-button welfare-button-outline flex-1"
                >
                  ❌ キャンセル
                </button>
                <button 
                  type="submit"
                  className="welfare-button welfare-button-primary flex-1"
                >
                  {editingUser ? '✏️ 更新' : '➕ 登録'}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="welfare-section">
          <h2 className="welfare-section-title">
            👥 利用者一覧 ({users.length}名)
          </h2>

          <div className="grid gap-6">
            {users.map((user) => (
              <div key={user.id} className="bg-white border border-gray-200 rounded-lg p-6 border-l-4 border-blue-500">
                <div className="flex justify-between items-start">
                  <div className="space-y-4 flex-1">
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-2xl">{user.wheelchair_user ? '♿' : '👤'}</span>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">{user.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                            🔢 {user.user_no}
                          </span>
                          {user.wheelchair_user && (
                            <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-sm">
                              ♿ 車椅子利用
                            </span>
                          )}
                          {!user.is_active && (
                            <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-sm">
                              ❌ 無効
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="space-y-2">
                        {user.phone && (
                          <p className="flex items-center gap-2">
                            <span className="text-blue-600">📞</span>
                            <span className="font-medium">電話:</span> {user.phone}
                          </p>
                        )}
                        {user.address && (
                          <p className="flex items-center gap-2">
                            <span className="text-green-600">🏠</span>
                            <span className="font-medium">住所:</span> {user.address}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        {user.emergency_contact && (
                          <p className="flex items-center gap-2">
                            <span className="text-red-600">🚨</span>
                            <span className="font-medium">緊急連絡先:</span> {user.emergency_contact}
                          </p>
                        )}
                        {user.emergency_phone && (
                          <p className="flex items-center gap-2">
                            <span className="text-red-600">📞</span>
                            <span className="font-medium">緊急電話:</span> {user.emergency_phone}
                          </p>
                        )}
                      </div>
                    </div>

                    {user.special_notes && (
                      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded">
                        <p className="flex items-start gap-2">
                          <span className="text-yellow-600 text-lg">📝</span>
                          <div>
                            <span className="font-bold text-yellow-800">特記事項:</span>
                            <span className="text-yellow-700 ml-2">{user.special_notes}</span>
                          </div>
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col space-y-2 ml-4">
                    <button 
                      onClick={() => handleEdit(user)}
                      className="bg-blue-100 hover:bg-blue-200 text-blue-800 px-4 py-2 rounded text-sm"
                    >
                      ✏️ 編集
                    </button>
                    <button 
                      onClick={() => handleDelete(user.id)}
                      className="bg-red-100 hover:bg-red-200 text-red-800 px-4 py-2 rounded text-sm"
                    >
                      🗑️ 削除
                    </button>
                  </div>
                </div>
              </div>
            ))}
            
            {users.length === 0 && (
              <div className="welfare-empty-state">
                <div className="welfare-empty-icon">👥</div>
                <h3 className="welfare-empty-title">利用者が登録されていません</h3>
                <p className="welfare-empty-description">「新規登録」ボタンから利用者を登録してください</p>
                <button 
                  onClick={() => setIsFormOpen(true)}
                  className="welfare-button welfare-button-primary"
                >
                  👥 最初の利用者を登録
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}