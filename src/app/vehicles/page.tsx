'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Vehicle } from '@/types'

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    fetchVehicles()
  }, [])

  const fetchVehicles = async () => {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('is_active', true)
        .order('vehicle_no')

      if (error) throw error
      setVehicles(data || [])
    } catch (error) {
      console.error('車両の取得に失敗しました:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateOdometer = async (vehicleId: string, newOdometer: number) => {
    try {
      const { error } = await supabase
        .from('vehicles')
        .update({ 
          current_odometer: newOdometer,
          updated_at: new Date().toISOString()
        })
        .eq('id', vehicleId)

      if (error) throw error
      await fetchVehicles()
      alert('走行距離を更新しました')
    } catch (error) {
      console.error('走行距離の更新に失敗しました:', error)
      alert('走行距離の更新に失敗しました')
    }
  }

  const recordOilChange = async (vehicleId: string, odometer: number) => {
    try {
      const { error } = await supabase
        .from('vehicles')
        .update({ 
          last_oil_change_odometer: odometer,
          updated_at: new Date().toISOString()
        })
        .eq('id', vehicleId)

      if (error) throw error
      await fetchVehicles()
      setShowMaintenanceModal(false)
      alert('オイル交換記録を更新しました')
    } catch (error) {
      console.error('オイル交換記録の更新に失敗しました:', error)
      alert('オイル交換記録の更新に失敗しました')
    }
  }

  const getMaintenanceStatus = (vehicle: Vehicle) => {
    if (!vehicle.current_odometer || !vehicle.last_oil_change_odometer) {
      return { status: 'unknown', message: '要確認', class: 'bg-gray-100 text-gray-800' }
    }

    const kmSinceLastChange = vehicle.current_odometer - vehicle.last_oil_change_odometer
    
    if (kmSinceLastChange >= 10000) {
      return { status: 'urgent', message: 'オイル交換必要', class: 'bg-red-100 text-red-800' }
    } else if (kmSinceLastChange >= 8000) {
      return { status: 'warning', message: 'オイル交換推奨', class: 'bg-yellow-100 text-yellow-800' }
    } else {
      return { status: 'good', message: '良好', class: 'bg-green-100 text-green-800' }
    }
  }

  const getFuelTypeIcon = (fuelType: string | null) => {
    switch (fuelType) {
      case 'ガソリン': return '⛽'
      case 'ディーゼル': return '🛢️'
      case 'ハイブリッド': return '🔋'
      default: return '🚗'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-200 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">車両情報を読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-200">
      {/* ヘッダー */}
      <div className="bg-white shadow-lg border-b-4 border-blue-500">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white text-2xl">🚐</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">車両管理</h1>
                <p className="text-gray-600">送迎車両の状態確認・メンテナンス管理</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* 車両一覧 */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {vehicles.map((vehicle) => {
            const maintenanceStatus = getMaintenanceStatus(vehicle)
            return (
              <div key={vehicle.id} className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
                {/* 車両基本情報 */}
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-3xl">🚐</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900">
                      {vehicle.vehicle_name || vehicle.vehicle_no}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                        {vehicle.vehicle_no}
                      </span>
                      {vehicle.wheelchair_accessible && (
                        <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-sm">
                          ♿ 対応
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 車両詳細 */}
                <div className="space-y-3 mb-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">車種</span>
                    <span className="font-medium">{vehicle.vehicle_type || '-'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">定員</span>
                    <span className="font-medium">{vehicle.capacity || '-'}名</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">燃料</span>
                    <span className="font-medium flex items-center gap-1">
                      {getFuelTypeIcon(vehicle.fuel_type)}
                      {vehicle.fuel_type || '-'}
                    </span>
                  </div>
                </div>

                {/* 走行距離情報 */}
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                    📊 走行距離
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">現在</span>
                      <span className="font-bold text-lg">
                        {vehicle.current_odometer ? `${vehicle.current_odometer.toLocaleString()}km` : '-'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">前回オイル交換</span>
                      <span className="text-sm">
                        {vehicle.last_oil_change_odometer ? `${vehicle.last_oil_change_odometer.toLocaleString()}km` : '-'}
                      </span>
                    </div>
                    {vehicle.current_odometer && vehicle.last_oil_change_odometer && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">交換後走行</span>
                        <span className="text-sm font-medium">
                          {(vehicle.current_odometer - vehicle.last_oil_change_odometer).toLocaleString()}km
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* メンテナンス状態 */}
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600">メンテナンス</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${maintenanceStatus.class}`}>
                      {maintenanceStatus.message}
                    </span>
                  </div>
                </div>

                {/* アクションボタン */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      const newOdometer = prompt('現在の走行距離を入力してください (km)', 
                        vehicle.current_odometer?.toString() || '0')
                      if (newOdometer && !isNaN(Number(newOdometer))) {
                        updateOdometer(vehicle.id, Number(newOdometer))
                      }
                    }}
                    className="bg-blue-100 hover:bg-blue-200 text-blue-800 px-3 py-2 rounded text-sm"
                  >
                    📊 走行距離更新
                  </button>
                  <button
                    onClick={() => {
                      setSelectedVehicle(vehicle)
                      setShowMaintenanceModal(true)
                    }}
                    className="bg-green-100 hover:bg-green-200 text-green-800 px-3 py-2 rounded text-sm"
                  >
                    🔧 オイル交換
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {vehicles.length === 0 && (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl text-gray-400">🚐</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">利用可能な車両がありません</h3>
            <p className="text-gray-600">管理者に車両登録を依頼してください</p>
          </div>
        )}
      </div>

      {/* オイル交換記録モーダル */}
      {showMaintenanceModal && selectedVehicle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              🔧 オイル交換記録
            </h3>
            <div className="mb-4">
              <p className="text-gray-600 mb-2">
                車両: {selectedVehicle.vehicle_name || selectedVehicle.vehicle_no}
              </p>
              <p className="text-gray-600 mb-4">
                現在の走行距離: {selectedVehicle.current_odometer ? `${selectedVehicle.current_odometer.toLocaleString()}km` : '未設定'}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setShowMaintenanceModal(false)}
                className="bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded"
              >
                キャンセル
              </button>
              <button
                onClick={() => {
                  if (selectedVehicle.current_odometer) {
                    recordOilChange(selectedVehicle.id, selectedVehicle.current_odometer)
                  } else {
                    alert('先に走行距離を設定してください')
                  }
                }}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
              >
                記録する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}