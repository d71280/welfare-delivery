'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Edit, Plus } from 'lucide-react'

type Vehicle = {
  id: string
  vehicle_no: string
  last_oil_change_odometer: number | null
  current_odometer: number | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [formData, setFormData] = useState({
    vehicle_no: '',
    current_odometer: '',
    last_oil_change_odometer: '',
    is_active: true
  })

  const router = useRouter()
  const supabase = createClientComponentClient()

  useEffect(() => {
    fetchVehicles()
  }, [])

  const fetchVehicles = async () => {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .order('vehicle_no')

      if (error) throw error
      setVehicles(data || [])
    } catch (error) {
      console.error('車両データの取得に失敗しました:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle)
    setFormData({
      vehicle_no: vehicle.vehicle_no,
      current_odometer: vehicle.current_odometer?.toString() || '',
      last_oil_change_odometer: vehicle.last_oil_change_odometer?.toString() || '',
      is_active: vehicle.is_active
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const updateData = {
        vehicle_no: formData.vehicle_no,
        current_odometer: formData.current_odometer ? parseInt(formData.current_odometer) : null,
        last_oil_change_odometer: formData.last_oil_change_odometer ? parseInt(formData.last_oil_change_odometer) : null,
        is_active: formData.is_active
      }

      console.log('更新データ:', updateData)
      console.log('編集中の車両:', editingVehicle)

      if (editingVehicle && editingVehicle.id) {
        // 更新
        console.log('車両更新開始:', editingVehicle.id)
        const { data, error } = await supabase
          .from('vehicles')
          .update(updateData)
          .eq('id', editingVehicle.id)
          .select()

        if (error) {
          console.error('更新エラー:', error)
          alert(`更新に失敗しました: ${error.message}`)
          return
        }
        console.log('更新成功:', data)
        alert('車両情報を更新しました')
      } else {
        // 新規作成
        console.log('車両新規作成開始')
        const { data, error } = await supabase
          .from('vehicles')
          .insert([updateData])
          .select()

        if (error) {
          console.error('作成エラー:', error)
          alert(`作成に失敗しました: ${error.message}`)
          return
        }
        console.log('作成成功:', data)
        alert('車両情報を作成しました')
      }

      await fetchVehicles()
      setEditingVehicle(null)
      setFormData({
        vehicle_no: '',
        current_odometer: '',
        last_oil_change_odometer: '',
        is_active: true
      })
    } catch (error) {
      console.error('車両データの保存に失敗しました:', error)
      alert(`エラーが発生しました: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const handleCancel = () => {
    setEditingVehicle(null)
    setFormData({
      vehicle_no: '',
      current_odometer: '',
      last_oil_change_odometer: '',
      is_active: true
    })
  }

  const getOilChangeStatus = (currentOdometer: number | null, lastOilChange: number | null) => {
    if (!currentOdometer || !lastOilChange) return '未設定'
    
    const distance = currentOdometer - lastOilChange
    if (distance >= 25000) {
      return '要交換'
    } else if (distance >= 20000) {
      return '注意'
    }
    return '正常'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case '要交換': return 'text-red-600'
      case '注意': return 'text-yellow-600'
      case '正常': return 'text-green-600'
      default: return 'text-gray-600'
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">読み込み中...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">車両管理</h1>
          <p className="text-gray-600">車両情報の登録・編集・削除</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => router.push('/admin/dashboard')}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            ダッシュボードに戻る
          </button>
          <button 
            onClick={() => {
              setEditingVehicle({ id: '', vehicle_no: '', last_oil_change_odometer: null, current_odometer: null, is_active: true, created_at: '', updated_at: '' })
              setFormData({
                vehicle_no: '',
                current_odometer: '',
                last_oil_change_odometer: '',
                is_active: true
              })
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus size={16} />
            新規登録
          </button>
        </div>
      </div>

      {editingVehicle && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">車両編集</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  車両番号 *
                </label>
                <input
                  type="text"
                  value={formData.vehicle_no}
                  onChange={(e) => setFormData({...formData, vehicle_no: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ステータス
                </label>
                <select
                  value={formData.is_active ? 'active' : 'inactive'}
                  onChange={(e) => setFormData({...formData, is_active: e.target.value === 'active'})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">アクティブ</option>
                  <option value="inactive">非アクティブ</option>
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  現在の走行距離 (km)
                </label>
                <input
                  type="number"
                  value={formData.current_odometer}
                  onChange={(e) => setFormData({...formData, current_odometer: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="最新の走行距離を入力してください（手動更新可能）"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  オイル交換時の走行距離 (km)
                </label>
                <input
                  type="number"
                  value={formData.last_oil_change_odometer}
                  onChange={(e) => setFormData({...formData, last_oil_change_odometer: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="オイル交換を実施した際の走行距離を入力してください"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                更新
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4">車両一覧</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">車両番号</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">現在の走行距離 (KM)</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">オイル交換状況</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">ステータス</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">登録日</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">操作</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.map((vehicle) => {
                  const oilStatus = getOilChangeStatus(vehicle.current_odometer, vehicle.last_oil_change_odometer)
                  return (
                    <tr key={vehicle.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">{vehicle.vehicle_no}</td>
                      <td className="py-3 px-4">
                        {vehicle.current_odometer ? `${vehicle.current_odometer.toLocaleString()} km` : '0.0 km'}
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <div className={`font-medium ${getStatusColor(oilStatus)}`}>
                            {oilStatus}
                          </div>
                          {vehicle.last_oil_change_odometer && (
                            <div className="text-sm text-gray-500">
                              前回 {vehicle.last_oil_change_odometer.toLocaleString()}km
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          vehicle.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {vehicle.is_active ? 'アクティブ' : '非アクティブ'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {new Date(vehicle.created_at).toLocaleDateString('ja-JP')}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleEdit(vehicle)}
                            className="text-blue-600 hover:text-blue-800 text-sm px-2 py-1 rounded border border-blue-200 hover:bg-blue-50 flex items-center gap-1"
                          >
                            <Edit size={14} />
                            編集
                          </button>
                          <button
                            className="text-red-600 hover:text-red-800 text-sm px-2 py-1 rounded border border-red-200 hover:bg-red-50"
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
          </div>
        </div>
      </div>
    </div>
  )
} 