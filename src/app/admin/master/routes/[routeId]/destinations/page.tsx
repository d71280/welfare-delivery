'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Destination } from '@/types'

interface AdminSession {
  role: string
  username: string
}

export default function DestinationsManagementPage() {
  const [, setSession] = useState<AdminSession | null>(null)
  const [destinations, setDestinations] = useState<Destination[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingDestination, setEditingDestination] = useState<Destination | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    display_order: 0,
    is_active: true
  })
  const [errors, setErrors] = useState<{[key: string]: string}>({})
  const [routeName, setRouteName] = useState('')

  const router = useRouter()
  const params = useParams()
  const routeId = params.routeId as string
  const supabase = createClient()

  useEffect(() => {
    checkSession()
    if (routeId) {
      fetchDestinations()
      fetchRoute()
    }
  }, [routeId])

  const checkSession = () => {
    const adminSession = localStorage.getItem('adminSession')
    if (!adminSession) {
      router.push('/admin/login')
      return
    }
    setSession(JSON.parse(adminSession))
  }

  const fetchRoute = async () => {
    try {
      const { data, error } = await supabase
        .from('routes')
        .select('route_name')
        .eq('id', routeId)
        .single()

      if (error) throw error
      setRouteName(data.route_name)
    } catch (err) {
      console.error('ルート取得エラー:', err)
    }
  }

  const fetchDestinations = async () => {
    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('destinations')
        .select('*')
        .eq('route_id', routeId)
        .order('display_order')

      if (error) throw error
      setDestinations(data || [])
    } catch (err) {
      console.error('配送先取得エラー:', err)
      setDestinations([])
    } finally {
      setIsLoading(false)
    }
  }

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {}

    if (!formData.name.trim()) {
      newErrors.name = '配送先名を入力してください'
    }
    if (!formData.address.trim()) {
      newErrors.address = '住所を入力してください'
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
      if (editingDestination) {
        const { error } = await supabase
          .from('destinations')
          .update({
            name: formData.name,
            address: formData.address,
            display_order: formData.display_order,
            is_active: formData.is_active,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingDestination.id)

        if (error) {
          console.error('配送先の更新に失敗しました:', error)
          alert('配送先の更新に失敗しました: ' + (error.message || String(error)))
          return
        }
        alert('配送先を更新しました')
      } else {
        const { error } = await supabase
          .from('destinations')
          .insert({
            route_id: routeId,
            name: formData.name,
            address: formData.address,
            display_order: formData.display_order,
            is_active: formData.is_active
          })

        if (error) {
          console.error('配送先の登録に失敗しました:', error)
          alert('配送先の登録に失敗しました: ' + (error.message || String(error)))
          return
        }
        alert('新しい配送先を登録しました')
      }

      fetchDestinations()
      resetForm()
    } catch (err) {
      console.error('保存エラー:', err)
      alert('保存に失敗しました: ' + (err instanceof Error ? err.message : String(err)))
    }
  }

  const handleEdit = (destination: Destination) => {
    setEditingDestination(destination)
    setFormData({
      name: destination.name,
      address: destination.address || '',
      display_order: destination.display_order,
      is_active: destination.is_active
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('この配送先を削除しますか？')) {
      return
    }

    try {
      const { error } = await supabase
        .from('destinations')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('配送先の削除に失敗しました:', error)
        alert('配送先の削除に失敗しました: ' + (error.message || String(error)))
        return
      }
      alert('配送先を削除しました')
      fetchDestinations()
    } catch (err) {
      console.error('削除エラー:', err)
      alert('削除に失敗しました')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      display_order: destinations.length + 1,
      is_active: true
    })
    setEditingDestination(null)
    setShowForm(false)
    setErrors({})
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <button
                  onClick={() => router.push('/admin/master/routes')}
                  className="text-blue-600 hover:text-blue-800"
                >
                  ← ルート管理に戻る
                </button>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">配送先管理</h1>
              <p className="text-sm text-gray-600">{routeName} の配送先一覧</p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              新規登録
            </button>
          </div>

          {/* 配送先フォーム */}
          {showForm && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
              <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">
                    {editingDestination ? '配送先編集' : '配送先新規登録'}
                  </h3>
                  <button
                    onClick={resetForm}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleSubmit}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">配送先名 *</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className={`mt-1 block w-full border rounded-md px-3 py-2 ${
                          errors.name ? 'border-red-500' : 'border-gray-300'
                        } focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                      />
                      {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">住所 *</label>
                      <textarea
                        value={formData.address}
                        onChange={(e) => setFormData({...formData, address: e.target.value})}
                        rows={3}
                        className={`mt-1 block w-full border rounded-md px-3 py-2 ${
                          errors.address ? 'border-red-500' : 'border-gray-300'
                        } focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                      />
                      {errors.address && <p className="text-red-500 text-sm mt-1">{errors.address}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">表示順序</label>
                      <input
                        type="number"
                        min="1"
                        value={formData.display_order}
                        onChange={(e) => setFormData({...formData, display_order: parseInt(e.target.value)})}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="is_active"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                        className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                      <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                        有効
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 mt-6">
                    <button
                      type="button"
                      onClick={resetForm}
                      className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg"
                    >
                      キャンセル
                    </button>
                    <button
                      type="submit"
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                    >
                      {editingDestination ? '更新' : '登録'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* 配送先一覧 */}
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">配送先一覧</h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                登録されている配送先: {destinations.length}件
              </p>
            </div>

            {destinations.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">配送先が登録されていません</p>
              </div>
            ) : (
              <div className="border-t border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        順序
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        配送先名
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        住所
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ステータス
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {destinations.map((destination) => (
                      <tr key={destination.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {destination.display_order}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{destination.name}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">{destination.address}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            destination.is_active 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {destination.is_active ? 'アクティブ' : '非アクティブ'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEdit(destination)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              編集
                            </button>
                            <button
                              onClick={() => handleDelete(destination.id)}
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
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}