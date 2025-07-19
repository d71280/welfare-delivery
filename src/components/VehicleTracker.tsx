'use client'

import { useState, useEffect } from 'react'

interface VehicleLocation {
  id: string
  vehicleNo: string
  driverName: string
  lat: number
  lng: number
  speed: number
  heading: number
  timestamp: string
  status: 'moving' | 'stopped' | 'picking_up' | 'dropping_off'
  currentUser?: {
    name: string
    destination: string
  }
}

interface VehicleTrackerProps {
  vehicleId?: string
  showMap?: boolean
  className?: string
}

export default function VehicleTracker({ vehicleId, showMap = true, className = '' }: VehicleTrackerProps) {
  const [vehicles, setVehicles] = useState<VehicleLocation[]>([])
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [isTracking, setIsTracking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // GPS追跡開始
  const startTracking = () => {
    if (!('geolocation' in navigator)) {
      setError('このデバイスはGPSに対応していません')
      return
    }

    setIsTracking(true)
    setError(null)

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const newLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        }
        setCurrentLocation(newLocation)
        
        // 車両位置を更新
        updateVehicleLocation(newLocation, position.coords.speed || 0, position.coords.heading || 0)
      },
      (error) => {
        console.error('GPS取得エラー:', error)
        setError('GPS位置情報の取得に失敗しました')
        setIsTracking(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000
      }
    )

    // クリーンアップ関数を返す
    return () => {
      navigator.geolocation.clearWatch(watchId)
      setIsTracking(false)
    }
  }

  // 車両位置更新
  const updateVehicleLocation = async (location: { lat: number; lng: number }, speed: number, heading: number) => {
    try {
      const sessionData = JSON.parse(localStorage.getItem('driverSession') || '{}')
      if (!sessionData.vehicleId || !sessionData.driverName) return

      const vehicleUpdate: VehicleLocation = {
        id: sessionData.vehicleId,
        vehicleNo: sessionData.vehicleNo || 'Unknown',
        driverName: sessionData.driverName,
        lat: location.lat,
        lng: location.lng,
        speed: Math.round(speed * 3.6), // m/s to km/h
        heading: Math.round(heading),
        timestamp: new Date().toISOString(),
        status: speed > 5 ? 'moving' : 'stopped'
      }

      // 実際のシステムではAPIに送信
      // await fetch('/api/vehicle-location', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(vehicleUpdate)
      // })

      // デモ用: ローカルストレージに保存
      const vehicleLocations = JSON.parse(localStorage.getItem('vehicleLocations') || '[]')
      const existingIndex = vehicleLocations.findIndex((v: VehicleLocation) => v.id === vehicleUpdate.id)
      
      if (existingIndex >= 0) {
        vehicleLocations[existingIndex] = vehicleUpdate
      } else {
        vehicleLocations.push(vehicleUpdate)
      }
      
      localStorage.setItem('vehicleLocations', JSON.stringify(vehicleLocations))
      setVehicles(vehicleLocations)

    } catch (error) {
      console.error('車両位置更新エラー:', error)
    }
  }

  // 車両データ取得
  const fetchVehicleLocations = () => {
    try {
      const storedLocations = JSON.parse(localStorage.getItem('vehicleLocations') || '[]')
      setVehicles(storedLocations)
    } catch (error) {
      console.error('車両位置取得エラー:', error)
    }
  }

  // 初期化とリアルタイム更新
  useEffect(() => {
    fetchVehicleLocations()
    
    // 10秒ごとに車両位置を更新
    const interval = setInterval(fetchVehicleLocations, 10000)
    
    return () => clearInterval(interval)
  }, [])

  const getStatusLabel = (status: string) => {
    const statusMap = {
      moving: '🚗 移動中',
      stopped: '🛑 停車中',
      picking_up: '🔄 お迎え中',
      dropping_off: '🏠 お送り中'
    }
    return statusMap[status as keyof typeof statusMap] || status
  }

  const getStatusColor = (status: string) => {
    const colorMap = {
      moving: 'bg-green-100 text-green-800',
      stopped: 'bg-yellow-100 text-yellow-800', 
      picking_up: 'bg-blue-100 text-blue-800',
      dropping_off: 'bg-purple-100 text-purple-800'
    }
    return colorMap[status as keyof typeof colorMap] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className={`welfare-card ${className}`}>
      <div className="mb-4">
        <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
          📍 車両位置追跡
        </h3>
        
        {/* GPS追跡制御 */}
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={startTracking}
            disabled={isTracking}
            className={`welfare-button ${
              isTracking ? 'welfare-button-outline' : 'welfare-button-primary'
            } text-sm`}
          >
            {isTracking ? (
              <span className="flex items-center gap-2">
                <span className="animate-pulse">📡</span>
                追跡中...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                📍 GPS追跡開始
              </span>
            )}
          </button>
          
          {currentLocation && (
            <div className="text-sm text-gray-600">
              📍 現在位置: {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-red-600 text-sm flex items-center gap-2">
              ⚠️ {error}
            </p>
          </div>
        )}
      </div>

      {/* 車両一覧 */}
      <div className="space-y-4">
        {vehicles.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl text-gray-400">🚗</span>
            </div>
            <p className="text-gray-600">追跡中の車両がありません</p>
          </div>
        ) : (
          vehicles.map((vehicle) => (
            <div key={vehicle.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-bold text-gray-900 flex items-center gap-2">
                    🚗 {vehicle.vehicleNo}
                  </h4>
                  <p className="text-gray-600">👨‍💼 {vehicle.driverName}</p>
                </div>
                <span className={`welfare-badge ${getStatusColor(vehicle.status)}`}>
                  {getStatusLabel(vehicle.status)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <p className="flex items-center gap-2">
                    <span className="text-blue-600">📍</span>
                    緯度: {vehicle.lat.toFixed(6)}
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="text-blue-600">📍</span>
                    経度: {vehicle.lng.toFixed(6)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="flex items-center gap-2">
                    <span className="text-green-600">🏃</span>
                    速度: {vehicle.speed} km/h
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="text-purple-600">🧭</span>
                    方角: {vehicle.heading}°
                  </p>
                </div>
              </div>

              {vehicle.currentUser && (
                <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-blue-600">👤</span>
                    <span className="font-medium text-blue-800">現在の利用者様</span>
                  </div>
                  <p className="text-blue-700 text-sm">
                    {vehicle.currentUser.name} → {vehicle.currentUser.destination}
                  </p>
                </div>
              )}

              <div className="mt-3 text-xs text-gray-500">
                最終更新: {new Date(vehicle.timestamp).toLocaleString('ja-JP')}
              </div>

              {/* 簡易マップ表示（実際のプロジェクトではGoogle Maps等を使用） */}
              {showMap && (
                <div className="mt-3 bg-gray-100 rounded-lg p-4 text-center">
                  <div className="text-4xl mb-2">🗺️</div>
                  <p className="text-sm text-gray-600">
                    地図表示（Google Maps連携で実装予定）
                  </p>
                  <button className="welfare-button welfare-button-outline text-xs mt-2">
                    📍 地図で詳細を見る
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* 追跡ステータス */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-blue-600 text-lg">💡</span>
          <span className="font-bold text-blue-800">リアルタイム追跡について</span>
        </div>
        <ul className="text-blue-700 text-sm space-y-1">
          <li>• 10秒ごとに位置情報を自動更新</li>
          <li>• 緊急時は本部で全車両の位置を確認可能</li>
          <li>• バッテリー節約のため適度に更新間隔を調整</li>
          <li>• プライバシー保護のため業務時間のみ追跡</li>
        </ul>
      </div>
    </div>
  )
}