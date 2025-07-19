'use client'

import { useState, useEffect } from 'react'
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
    is_active: true
  })

  const supabase = createClient()

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('user_no')

      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      console.error('利用者の取得に失敗しました:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      if (editingUser) {
        const { error } = await supabase
          .from('users')
          .update(formData as UserUpdate)
          .eq('id', editingUser.id)
        
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('users')
          .insert([formData as UserInsert])
        
        if (error) throw error
      }

      await fetchUsers()
      resetForm()
    } catch (error) {
      console.error('利用者の保存に失敗しました:', error)
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

      if (error) throw error
      await fetchUsers()
    } catch (error) {
      console.error('利用者の削除に失敗しました:', error)
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
      is_active: true
    })
    setEditingUser(null)
    setIsFormOpen(false)
  }

  if (loading) {
    return <div className="p-6">読み込み中...</div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-200">
      <div className="bg-white shadow-lg border-b-4 border-blue-500">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white text-2xl">👥</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">福祉利用者管理</h1>
                <p className="text-gray-600">ご利用者様の情報を安全に管理します</p>
              </div>
            </div>
            <button 
              onClick={() => setIsFormOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
            >
              👤 新規利用者追加
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {isFormOpen && (
          <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-green-500">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {editingUser ? '✏️ 利用者情報の編集' : '👤 新規利用者の登録'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-lg font-bold text-gray-900 mb-2">
                    🔢 利用者番号 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.user_no}
                    onChange={(e) => setFormData({ ...formData, user_no: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="例: U001"
                    required
                  />
                </div>
                <div>
                  <label className="block text-lg font-bold text-gray-900 mb-2">
                    👤 お名前 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="山田 太郎"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-lg font-bold text-gray-900 mb-2">
                    📞 電話番号
                  </label>
                  <input
                    type="tel"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="03-1234-5678"
                  />
                </div>
                <div>
                  <label className="block text-lg font-bold text-gray-900 mb-2">
                    🚨 緊急連絡先電話
                  </label>
                  <input
                    type="tel"
                    value={formData.emergency_phone || ''}
                    onChange={(e) => setFormData({ ...formData, emergency_phone: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="080-1234-5678"
                  />
                </div>
              </div>

              <div>
                <label className="block text-lg font-bold text-gray-900 mb-2">
                  🏠 ご住所
                </label>
                <input
                  type="text"
                  value={formData.address || ''}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="東京都〇〇区△△町1-2-3"
                />
              </div>

              <div>
                <label className="block text-lg font-bold text-gray-900 mb-2">
                  👨‍👩‍👧‍👦 緊急連絡先（お名前）
                </label>
                <input
                  type="text"
                  value={formData.emergency_contact || ''}
                  onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="山田 花子（ご家族など）"
                />
              </div>

              <div>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.wheelchair_user}
                    onChange={(e) => setFormData({ ...formData, wheelchair_user: e.target.checked })}
                    className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                  />
                  <span className="text-lg font-bold text-gray-900">
                    ♿ 車椅子利用者
                  </span>
                </label>
              </div>

              <div>
                <label className="block text-lg font-bold text-gray-900 mb-2">
                  📝 特記事項・注意点
                </label>
                <textarea
                  value={formData.special_notes || ''}
                  onChange={(e) => setFormData({ ...formData, special_notes: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={4}
                  placeholder="アレルギー、服薬状況、介助の注意点、送迎時の配慮事項など"
                />
              </div>

              <div>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                  />
                  <span className="text-lg font-bold text-gray-900">
                    ✅ 有効（送迎サービス利用可能）
                  </span>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6">
                <button 
                  type="button" 
                  onClick={resetForm}
                  className="bg-gray-400 hover:bg-gray-500 text-white px-6 py-3 rounded-lg"
                >
                  ❌ キャンセル
                </button>
                <button 
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg"
                >
                  {editingUser ? '✏️ 更新する' : '👤 登録する'}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              👥 ご利用者様一覧
            </h2>
            <p className="text-gray-600">現在登録されている{users.length}名のご利用者様</p>
          </div>

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
              <div className="text-center py-12">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-4xl text-gray-400">👥</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">利用者が登録されていません</h3>
                <p className="text-gray-600 mb-4">「新規利用者追加」ボタンから利用者を登録してください</p>
                <button 
                  onClick={() => setIsFormOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg"
                >
                  👤 最初の利用者を登録する
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}