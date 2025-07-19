'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Vehicle } from '@/types'

export default function VehiclesManagementPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null)
  const [formData, setFormData] = useState({
    vehicle_no: '',
    is_active: true,
    last_oil_change_odometer: '',
    current_odometer: ''
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
    
    fetchVehicles()
  }, [router])

  const fetchVehicles = async () => {
    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('車両取得エラー:', error)
        return
      }

      // 各車両の最新走行距離を取得
      const vehiclesWithOdometer = await Promise.all(
        (data || []).map(async (vehicle) => {
          const { data: lastRecord } = await supabase
            .from('delivery_records')
            .select('end_odometer')
            .eq('vehicle_id', vehicle.id)
            .not('end_odometer', 'is', null)
            .order('delivery_date', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(1)

          return {
            ...vehicle,
            current_odometer: lastRecord?.[0]?.end_odometer || 0
          }
        })
      )

      setVehicles(vehiclesWithOdometer)
    } catch (error) {
      console.error('車両取得エラー:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.vehicle_no.trim()) {
      newErrors.vehicle_no = '車両番号は必須です'
    }
    
    if (formData.current_odometer && isNaN(parseFloat(formData.current_odometer))) {
      newErrors.current_odometer = '有効な数値を入力してください'
    }
    
    if (formData.last_oil_change_odometer && isNaN(parseFloat(formData.last_oil_change_odometer))) {
      newErrors.last_oil_change_odometer = '有効な数値を入力してください'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    console.log('=== 更新処理開始 ===')
    console.log('フォームデータ:', formData)
    console.log('編集対象車両:', editingVehicle)
    
    if (!validateForm()) {
      console.log('バリデーション失敗')
      return
    }

    try {
      if (editingVehicle) {
        // 更新
        console.log('車両更新開始')
        const { error } = await supabase
          .from('vehicles')
          .update({
            vehicle_no: formData.vehicle_no,
            is_active: formData.is_active,
            last_oil_change_odometer: formData.last_oil_change_odometer ? parseFloat(formData.last_oil_change_odometer) : null,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingVehicle.id)

        if (error) {
          console.error('更新エラー:', error)
          alert('更新に失敗しました: ' + error.message)
          return
        }
        
        console.log('車両更新成功')

        // 現在の走行距離が変更された場合、配送記録を追加
        const currentOdometer = formData.current_odometer ? parseFloat(formData.current_odometer) : 0
        const originalOdometer = editingVehicle.current_odometer || 0
        
        if (currentOdometer !== originalOdometer && currentOdometer > 0) {
          const today = new Date().toISOString().split('T')[0]
          const currentTime = new Date().toLocaleTimeString('ja-JP', { hour12: false, hour: '2-digit', minute: '2-digit' })
          
          // 管理者による走行距離修正記録を作成
          try {
            const { error: recordError } = await supabase
              .from('delivery_records')
              .insert({
                delivery_date: today,
                driver_id: null, // 管理者による修正はnull
                vehicle_id: editingVehicle.id,
                route_id: null, // 管理者による修正はnull
                start_odometer: originalOdometer,
                end_odometer: currentOdometer,
                start_time: currentTime,
                end_time: currentTime,
                status: 'completed',
                gas_card_used: false
              })

            if (recordError) {
              console.error('走行距離記録エラー:', recordError)
              // 配送記録の作成に失敗しても、車両の更新は継続する
            }
          } catch (error) {
            console.error('配送記録作成エラー:', error)
          }
        }
      } else {
        // 新規作成
        const { error } = await supabase
          .from('vehicles')
          .insert([{
            vehicle_no: formData.vehicle_no,
            is_active: formData.is_active,
            last_oil_change_odometer: formData.last_oil_change_odometer ? parseFloat(formData.last_oil_change_odometer) : null
          }])

        if (error) {
          console.error('作成エラー:', error)
          return
        }
      }

      // フォームリセット
      console.log('フォームリセット開始')
      setFormData({
        vehicle_no: '',
        is_active: true,
        last_oil_change_odometer: '',
        current_odometer: ''
      })
      setEditingVehicle(null)
      setShowForm(false)
      console.log('車両リスト再取得開始')
      fetchVehicles()
      console.log('=== 更新処理完了 ===')
    } catch (error) {
      console.error('保存エラー:', error)
      alert('保存に失敗しました: ' + (error instanceof Error ? error.message : String(error)))
    }
  }

  const handleEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle)
    setFormData({
      vehicle_no: vehicle.vehicle_no,
      is_active: vehicle.is_active,
      last_oil_change_odometer: vehicle.last_oil_change_odometer?.toString() || '',
      current_odometer: vehicle.current_odometer?.toString() || '0'
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('この車両を削除してもよろしいですか？')) {
      return
    }

    try {
      const { error } = await supabase
        .from('vehicles')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('削除エラー:', error)
        if (error.code === '23503') {
          alert('この車両は配送記録で使用されているため削除できません。')
        } else {
          alert('削除に失敗しました: ' + error.message)
        }
        return
      }

      alert('車両を削除しました。')
      fetchVehicles()
    } catch (error) {
      console.error('削除エラー:', error)
      alert('削除に失敗しました: ' + (error instanceof Error ? error.message : String(error)))
    }
  }

  const handleCancel = () => {
    setFormData({
      vehicle_no: '',
      is_active: true,
      last_oil_change_odometer: '',
      current_odometer: ''
    })
    setEditingVehicle(null)
    setShowForm(false)
    setErrors({})
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
              <h1 className="text-xl font-bold text-gray-900">車両管理</h1>
              <p className="text-sm text-gray-600">車両情報の登録・編集・削除</p>
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
                {editingVehicle ? '車両編集' : '車両新規登録'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    車両番号 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.vehicle_no}
                    onChange={(e) => setFormData({...formData, vehicle_no: e.target.value})}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.vehicle_no ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="V001"
                  />
                  {errors.vehicle_no && <p className="mt-1 text-sm text-red-500">{errors.vehicle_no}</p>}
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    現在の走行距離 (km)
                  </label>
                  <input
                    type="number"
                    value={formData.current_odometer}
                    onChange={(e) => setFormData({ ...formData, current_odometer: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="現在の走行距離を入力"
                  />
                  <p className="mt-1 text-xs text-gray-500">最後の配送記録から自動入力されます（手動修正可能）</p>
                  {errors.current_odometer && (
                    <p className="mt-1 text-xs text-red-600">{errors.current_odometer}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    オイル交換時の走行距離 (km)
                  </label>
                  <input
                    type="number"
                    value={formData.last_oil_change_odometer}
                    onChange={(e) => setFormData({...formData, last_oil_change_odometer: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="オイル交換時の走行距離を入力"
                  />
                  <p className="mt-1 text-xs text-gray-500">オイル交換を実施した際の走行距離を入力してください</p>
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
                  {editingVehicle ? '更新' : '登録'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 車両一覧 */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">車両一覧</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    車両番号
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    現在の走行距離 (km)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    オイル交換状況
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
                {vehicles.map((vehicle) => {
                  const currentOdometer = vehicle.current_odometer || 0
                  const lastOilChange = vehicle.last_oil_change_odometer || 0
                  const nextOilChange = lastOilChange + 5000
                  const oilChangeStatus = currentOdometer >= nextOilChange ? 'due' : 'ok'
                  const remainingKm = Math.max(0, nextOilChange - currentOdometer)
                  
                  return (
                    <tr key={vehicle.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {vehicle.vehicle_no}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {currentOdometer.toFixed(1)} km
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {lastOilChange > 0 ? (
                          <div>
                            <div className={`text-xs font-medium ${
                              oilChangeStatus === 'due' ? 'text-red-600' : 'text-green-600'
                            }`}>
                              {oilChangeStatus === 'due' ? '交換時期' : `残り${remainingKm.toFixed(0)}km`}
                            </div>
                            <div className="text-xs text-gray-500">
                              前回: {lastOilChange.toFixed(0)}km
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500">未設定</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          vehicle.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {vehicle.is_active ? 'アクティブ' : '非アクティブ'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(vehicle.created_at).toLocaleDateString('ja-JP')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(vehicle)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            編集
                          </button>
                          <button
                            onClick={() => handleDelete(vehicle.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            削除
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {vehicles.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">車両が登録されていません</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}