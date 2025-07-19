'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Vehicle } from '@/types'

interface VehicleWithOilChange extends Vehicle {
  currentOdometer: number | null
  lastOilChangeOdometer: number | null
  kmSinceLastOilChange: number | null
  needsOilChange: boolean
  daysUntilOverdue: number | null
}

const OIL_CHANGE_INTERVAL = 5000 // 5000km間隔

export default function OilChangeManagementPage() {
  const [vehicles, setVehicles] = useState<VehicleWithOilChange[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    fetchVehiclesWithOilChangeData()
  }, [])

  const fetchVehiclesWithOilChangeData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // 車両一覧を取得
      const { data: vehicleData, error: vehicleError } = await supabase
        .from('vehicles')
        .select('*')
        .eq('is_active', true)
        .order('vehicle_no')

      if (vehicleError) throw vehicleError

      // 各車両の最新走行距離を取得
      const vehiclesWithOilChange: VehicleWithOilChange[] = await Promise.all(
        vehicleData.map(async (vehicle) => {
          // 最新の配送記録から現在の走行距離を取得
          const { data: latestRecord } = await supabase
            .from('delivery_records')
            .select('end_odometer')
            .eq('vehicle_id', vehicle.id)
            .not('end_odometer', 'is', null)
            .order('delivery_date', { ascending: false })
            .order('end_time', { ascending: false })
            .limit(1)

          const currentOdometer = latestRecord && latestRecord.length > 0 
            ? latestRecord[0].end_odometer 
            : null

          const lastOilChangeOdometer = vehicle.last_oil_change_odometer
          const kmSinceLastOilChange = currentOdometer && lastOilChangeOdometer 
            ? currentOdometer - lastOilChangeOdometer 
            : null

          const needsOilChange = kmSinceLastOilChange !== null && kmSinceLastOilChange >= OIL_CHANGE_INTERVAL

          return {
            ...vehicle,
            currentOdometer,
            lastOilChangeOdometer,
            kmSinceLastOilChange,
            needsOilChange,
            daysUntilOverdue: null // 今回は走行距離ベースのため、日数は計算しない
          }
        })
      )

      setVehicles(vehiclesWithOilChange)
    } catch (err) {
      console.error('データ取得エラー:', err)
      setError('データの取得に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  const handleManualOilChange = async (vehicleId: string, odometer: number) => {
    try {
      const { error } = await supabase
        .from('vehicles')
        .update({
          last_oil_change_odometer: odometer,
          updated_at: new Date().toISOString()
        })
        .eq('id', vehicleId)

      if (error) throw error

      // データを再取得
      await fetchVehiclesWithOilChangeData()
      alert('オイル交換記録を更新しました')
    } catch (err) {
      console.error('オイル交換記録エラー:', err)
      alert('オイル交換記録の更新に失敗しました')
    }
  }

  const getStatusColor = (vehicle: VehicleWithOilChange) => {
    if (vehicle.needsOilChange) return 'text-red-600 bg-red-50'
    if (vehicle.kmSinceLastOilChange !== null && vehicle.kmSinceLastOilChange >= OIL_CHANGE_INTERVAL * 0.8) {
      return 'text-yellow-600 bg-yellow-50'
    }
    return 'text-green-600 bg-green-50'
  }

  const getStatusText = (vehicle: VehicleWithOilChange) => {
    if (vehicle.needsOilChange) return 'オイル交換必要'
    if (vehicle.kmSinceLastOilChange !== null && vehicle.kmSinceLastOilChange >= OIL_CHANGE_INTERVAL * 0.8) {
      return 'オイル交換間近'
    }
    return '正常'
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

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchVehiclesWithOilChangeData}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            再読み込み
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">オイル交換管理</h1>
          <p className="text-gray-600">車両のオイル交換状況を管理します（5000km間隔）</p>
        </div>

        {/* 統計情報 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-red-100 text-red-600 mr-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">オイル交換必要</p>
                <p className="text-2xl font-bold text-gray-900">
                  {vehicles.filter(v => v.needsOilChange).length}台
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-yellow-100 text-yellow-600 mr-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">オイル交換間近</p>
                <p className="text-2xl font-bold text-gray-900">
                  {vehicles.filter(v => !v.needsOilChange && v.kmSinceLastOilChange !== null && v.kmSinceLastOilChange >= OIL_CHANGE_INTERVAL * 0.8).length}台
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100 text-green-600 mr-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">正常</p>
                <p className="text-2xl font-bold text-gray-900">
                  {vehicles.filter(v => !v.needsOilChange && (v.kmSinceLastOilChange === null || v.kmSinceLastOilChange < OIL_CHANGE_INTERVAL * 0.8)).length}台
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 車両一覧 */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">車両一覧</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">車両番号</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">現在の走行距離</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">最終オイル交換時</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">前回交換からの走行距離</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ステータス</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {vehicles.map((vehicle) => (
                  <tr key={vehicle.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{vehicle.vehicle_no}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {vehicle.currentOdometer !== null ? `${vehicle.currentOdometer.toLocaleString()} km` : '未記録'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {vehicle.lastOilChangeOdometer !== null ? `${vehicle.lastOilChangeOdometer.toLocaleString()} km` : '未記録'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {vehicle.kmSinceLastOilChange !== null ? `${vehicle.kmSinceLastOilChange.toLocaleString()} km` : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(vehicle)}`}>
                        {getStatusText(vehicle)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => {
                          const odometer = prompt('オイル交換時の走行距離を入力してください (km):', vehicle.currentOdometer?.toString() || '')
                          if (odometer) {
                            const value = parseInt(odometer)
                            if (!isNaN(value) && value > 0) {
                              handleManualOilChange(vehicle.id, value)
                            }
                          }
                        }}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        オイル交換記録
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}