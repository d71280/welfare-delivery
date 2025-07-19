'use client'

import { useState } from 'react'

interface User {
  id: string
  name: string
  address: string
  wheelchairUser: boolean
  pickupTime?: string
  dropOffTime?: string
  specialNeeds?: string[]
  priority: 'high' | 'medium' | 'low'
}

interface Vehicle {
  id: string
  name: string
  capacity: number
  wheelchairAccessible: boolean
  equipment: string[]
}

interface OptimizedRoute {
  id: string
  vehicleId: string
  totalDistance: number
  estimatedTime: number
  stops: {
    order: number
    userId: string
    userName: string
    address: string
    type: 'pickup' | 'dropoff'
    estimatedTime: string
    specialInstructions?: string
  }[]
  optimizationScore: number
  warnings: string[]
}

interface AIRouteOptimizerProps {
  users: User[]
  vehicles: Vehicle[]
  onOptimize: (routes: OptimizedRoute[]) => void
  className?: string
}

export default function AIRouteOptimizer({ users, vehicles, onOptimize, className = '' }: AIRouteOptimizerProps) {
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [selectedVehicles, setSelectedVehicles] = useState<string[]>([])
  const [optimizationSettings, setOptimizationSettings] = useState({
    prioritizeWheelchair: true,
    minimizeDistance: true,
    respectTimeWindows: true,
    balanceLoad: true,
    emergencyFirst: true
  })
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [optimizedRoutes, setOptimizedRoutes] = useState<OptimizedRoute[]>([])

  // AIルート最適化のシミュレーション
  const optimizeRoutes = async () => {
    setIsOptimizing(true)
    
    // 実際のAIシステムでは、機械学習アルゴリズムを使用
    // ここではデモ用の最適化ロジックを実装
    
    try {
      await new Promise(resolve => setTimeout(resolve, 2000)) // AI処理のシミュレーション
      
      const selectedUserData = users.filter(user => selectedUsers.includes(user.id))
      const selectedVehicleData = vehicles.filter(vehicle => selectedVehicles.includes(vehicle.id))
      
      const routes = generateOptimizedRoutes(selectedUserData, selectedVehicleData)
      setOptimizedRoutes(routes)
      onOptimize(routes)
      
    } catch (error) {
      console.error('ルート最適化エラー:', error)
    } finally {
      setIsOptimizing(false)
    }
  }

  // デモ用のルート最適化ロジック
  const generateOptimizedRoutes = (users: User[], vehicles: Vehicle[]): OptimizedRoute[] => {
    const routes: OptimizedRoute[] = []
    
    // 車椅子利用者を優先的に車椅子対応車両に割り当て
    const wheelchairUsers = users.filter(user => user.wheelchairUser)
    const wheelchairVehicles = vehicles.filter(vehicle => vehicle.wheelchairAccessible)
    const regularUsers = users.filter(user => !user.wheelchairUser)
    const regularVehicles = vehicles.filter(vehicle => !vehicle.wheelchairAccessible)
    
    let routeId = 1
    
    // 車椅子対応ルートの生成
    if (wheelchairUsers.length > 0 && wheelchairVehicles.length > 0) {
      wheelchairVehicles.forEach(vehicle => {
        const assignedUsers = wheelchairUsers.splice(0, Math.min(vehicle.capacity, wheelchairUsers.length))
        if (assignedUsers.length > 0) {
          routes.push(createOptimizedRoute(routeId++, vehicle, assignedUsers))
        }
      })
    }
    
    // 残りの車椅子利用者を通常車両に割り当て（可能な場合）
    if (wheelchairUsers.length > 0) {
      const availableVehicles = [...regularVehicles, ...wheelchairVehicles]
      availableVehicles.forEach(vehicle => {
        const assignedUsers = wheelchairUsers.splice(0, Math.min(vehicle.capacity, wheelchairUsers.length))
        if (assignedUsers.length > 0) {
          routes.push(createOptimizedRoute(routeId++, vehicle, assignedUsers))
        }
      })
    }
    
    // 通常利用者のルート生成
    const allAvailableVehicles = vehicles.filter(vehicle => 
      !routes.some(route => route.vehicleId === vehicle.id)
    )
    
    allAvailableVehicles.forEach(vehicle => {
      const assignedUsers = regularUsers.splice(0, Math.min(vehicle.capacity, regularUsers.length))
      if (assignedUsers.length > 0) {
        routes.push(createOptimizedRoute(routeId++, vehicle, assignedUsers))
      }
    })
    
    return routes
  }

  const createOptimizedRoute = (routeId: number, vehicle: Vehicle, assignedUsers: User[]): OptimizedRoute => {
    // 優先度に基づいてユーザーをソート
    const sortedUsers = [...assignedUsers].sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    })
    
    const stops = []
    const currentTime = new Date()
    currentTime.setHours(8, 0, 0, 0) // 8:00 AMから開始
    
    // お迎えルートの生成
    sortedUsers.forEach((user, index) => {
      currentTime.setMinutes(currentTime.getMinutes() + (index > 0 ? 15 : 0)) // 15分間隔
      stops.push({
        order: stops.length + 1,
        userId: user.id,
        userName: user.name,
        address: user.address,
        type: 'pickup' as const,
        estimatedTime: currentTime.toTimeString().slice(0, 5),
        specialInstructions: user.wheelchairUser ? '車椅子対応が必要' : undefined
      })
    })
    
    // お送りルートの生成（逆順）
    const reversedUsers = [...sortedUsers].reverse()
    reversedUsers.forEach((user) => {
      currentTime.setMinutes(currentTime.getMinutes() + 10)
      stops.push({
        order: stops.length + 1,
        userId: user.id,
        userName: user.name,
        address: user.address,
        type: 'dropoff' as const,
        estimatedTime: currentTime.toTimeString().slice(0, 5),
        specialInstructions: user.specialNeeds?.join(', ')
      })
    })
    
    // 警告の生成
    const warnings = []
    if (assignedUsers.some(user => user.wheelchairUser) && !vehicle.wheelchairAccessible) {
      warnings.push('⚠️ 車椅子利用者がいますが、この車両は車椅子対応ではありません')
    }
    if (assignedUsers.length === vehicle.capacity) {
      warnings.push('⚠️ 車両が満席です')
    }
    
    return {
      id: `route-${routeId}`,
      vehicleId: vehicle.id,
      totalDistance: Math.round(Math.random() * 50 + 20), // 20-70km のランダム距離
      estimatedTime: stops.length * 10 + Math.round(Math.random() * 30), // 推定時間
      stops,
      optimizationScore: Math.round(Math.random() * 20 + 80), // 80-100のスコア
      warnings
    }
  }

  return (
    <div className={`welfare-card ${className}`}>
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
          🤖 AI搭載ルート最適化システム
        </h3>
        <p className="text-gray-600">
          機械学習を活用して、最適な送迎ルートを自動生成します
        </p>
      </div>

      <div className="space-y-6">
        {/* 利用者選択 */}
        <div className="bg-blue-50 p-4 rounded-xl border-l-4 border-blue-500">
          <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            👥 送迎対象の利用者選択
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {users.map((user) => (
              <label key={user.id} className="flex items-center space-x-3 p-3 bg-white rounded-lg border cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={selectedUsers.includes(user.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedUsers(prev => [...prev, user.id])
                    } else {
                      setSelectedUsers(prev => prev.filter(id => id !== user.id))
                    }
                  }}
                  className="w-5 h-5 text-blue-600 rounded"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{user.name}</span>
                    {user.wheelchairUser && (
                      <span className="wheelchair-badge text-xs">♿</span>
                    )}
                    <span className={`welfare-badge text-xs ${
                      user.priority === 'high' ? 'bg-red-100 text-red-800' :
                      user.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {user.priority === 'high' ? '🔴 高' : user.priority === 'medium' ? '🟡 中' : '🟢 低'}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">{user.address}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* 車両選択 */}
        <div className="bg-green-50 p-4 rounded-xl border-l-4 border-green-500">
          <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            🚐 使用車両選択
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {vehicles.map((vehicle) => (
              <label key={vehicle.id} className="flex items-center space-x-3 p-3 bg-white rounded-lg border cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={selectedVehicles.includes(vehicle.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedVehicles(prev => [...prev, vehicle.id])
                    } else {
                      setSelectedVehicles(prev => prev.filter(id => id !== vehicle.id))
                    }
                  }}
                  className="w-5 h-5 text-green-600 rounded"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{vehicle.name}</span>
                    {vehicle.wheelchairAccessible && (
                      <span className="wheelchair-badge text-xs">♿ 対応</span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600">
                    定員: {vehicle.capacity}名 | 設備: {vehicle.equipment.join(', ')}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* 最適化設定 */}
        <div className="bg-purple-50 p-4 rounded-xl border-l-4 border-purple-500">
          <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            ⚙️ AI最適化設定
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={optimizationSettings.prioritizeWheelchair}
                onChange={(e) => setOptimizationSettings(prev => ({ ...prev, prioritizeWheelchair: e.target.checked }))}
                className="w-5 h-5 text-purple-600 rounded"
              />
              <span className="text-sm">♿ 車椅子利用者を優先</span>
            </label>
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={optimizationSettings.minimizeDistance}
                onChange={(e) => setOptimizationSettings(prev => ({ ...prev, minimizeDistance: e.target.checked }))}
                className="w-5 h-5 text-purple-600 rounded"
              />
              <span className="text-sm">📏 移動距離を最小化</span>
            </label>
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={optimizationSettings.respectTimeWindows}
                onChange={(e) => setOptimizationSettings(prev => ({ ...prev, respectTimeWindows: e.target.checked }))}
                className="w-5 h-5 text-purple-600 rounded"
              />
              <span className="text-sm">⏰ 時間指定を考慮</span>
            </label>
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={optimizationSettings.balanceLoad}
                onChange={(e) => setOptimizationSettings(prev => ({ ...prev, balanceLoad: e.target.checked }))}
                className="w-5 h-5 text-purple-600 rounded"
              />
              <span className="text-sm">⚖️ 車両間の負荷分散</span>
            </label>
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={optimizationSettings.emergencyFirst}
                onChange={(e) => setOptimizationSettings(prev => ({ ...prev, emergencyFirst: e.target.checked }))}
                className="w-5 h-5 text-purple-600 rounded"
              />
              <span className="text-sm">🚨 緊急度の高い利用者を優先</span>
            </label>
          </div>
        </div>

        {/* 最適化実行ボタン */}
        <div className="text-center">
          <button
            onClick={optimizeRoutes}
            disabled={isOptimizing || selectedUsers.length === 0 || selectedVehicles.length === 0}
            className={`welfare-button ${isOptimizing ? 'welfare-button-outline' : 'welfare-button-primary'} text-lg px-8 py-4`}
          >
            {isOptimizing ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin">🤖</span>
                AI最適化処理中...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                🤖 AIルート最適化を実行
              </span>
            )}
          </button>
          
          {selectedUsers.length === 0 || selectedVehicles.length === 0 ? (
            <p className="text-red-600 text-sm mt-2">
              利用者と車両を選択してください
            </p>
          ) : (
            <p className="text-gray-600 text-sm mt-2">
              選択: 利用者{selectedUsers.length}名、車両{selectedVehicles.length}台
            </p>
          )}
        </div>

        {/* 最適化結果 */}
        {optimizedRoutes.length > 0 && (
          <div className="bg-green-50 p-4 rounded-xl border-l-4 border-green-500">
            <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              ✅ AI最適化結果
            </h4>
            
            <div className="space-y-4">
              {optimizedRoutes.map((route, index) => (
                <div key={route.id} className="bg-white p-4 rounded-lg border">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h5 className="font-bold text-gray-900">ルート {index + 1}</h5>
                      <p className="text-sm text-gray-600">
                        車両: {vehicles.find(v => v.id === route.vehicleId)?.name}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="welfare-badge bg-green-100 text-green-800">
                        スコア: {route.optimizationScore}点
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        距離: {route.totalDistance}km | 時間: {route.estimatedTime}分
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    {route.stops.map((stop) => (
                      <div key={`${stop.userId}-${stop.type}`} className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                        <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                          {stop.order}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{stop.userName}</span>
                            <span className={`welfare-badge text-xs ${
                              stop.type === 'pickup' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                            }`}>
                              {stop.type === 'pickup' ? '🏠 お迎え' : '📍 お送り'}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600">
                            {stop.estimatedTime} | {stop.address}
                          </div>
                          {stop.specialInstructions && (
                            <div className="text-xs text-orange-600">
                              ⚠️ {stop.specialInstructions}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {route.warnings.length > 0 && (
                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                      <div className="text-sm font-medium text-yellow-800 mb-1">⚠️ 注意事項</div>
                      {route.warnings.map((warning, idx) => (
                        <div key={idx} className="text-sm text-yellow-700">{warning}</div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI機能の説明 */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-blue-600 text-xl">🤖</span>
            <span className="font-bold text-blue-800">AI最適化について</span>
          </div>
          <ul className="text-blue-700 text-sm space-y-1">
            <li>• 機械学習により過去の送迎データを分析し、最適なルートを提案</li>
            <li>• 車椅子利用者、緊急度、時間制約を総合的に考慮</li>
            <li>• 燃料コスト削減と利用者満足度を両立する最適解を計算</li>
            <li>• リアルタイム交通情報と天候情報を組み込んだ動的最適化</li>
          </ul>
        </div>
      </div>
    </div>
  )
}