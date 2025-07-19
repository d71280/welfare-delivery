'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getVehicleCurrentOdometer, createDeliveryRecord, deleteDeliveryRecord } from '@/lib/supabase/delivery-service'
import { Driver, Vehicle, Route, Destination } from '@/types'

export default function LoginPage() {
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [selectedDriver, setSelectedDriver] = useState('')
  const [selectedVehicle, setSelectedVehicle] = useState('')
  const [startOdometer, setStartOdometer] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [showSelectionForm, setShowSelectionForm] = useState(false)
  const [startTime, setStartTime] = useState('')
  const [currentTime, setCurrentTime] = useState('')
  const [selectedRoute, setSelectedRoute] = useState('')
  const [routes, setRoutes] = useState<Route[]>([])
  const [, setDestinations] = useState<Destination[]>([])
  const [duplicateRecord, setDuplicateRecord] = useState<{
    id: string;
    delivery_date: string;
    status: string;
    start_odometer?: number;
  } | null>(null)
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false)
  
  const router = useRouter()
  const supabase = createClient()

  // ページ読み込み時にドライバーと車両データを取得
  useEffect(() => {
    async function fetchData() {
      try {
        const [driversRes, vehiclesRes] = await Promise.all([
          supabase.from('drivers').select('*').eq('is_active', true),
          supabase.from('vehicles').select('*').eq('is_active', true)
        ])
        
        if (driversRes.data) setDrivers(driversRes.data)
        if (vehiclesRes.data) setVehicles(vehiclesRes.data)
        
        // ルートデータも取得
        const routesRes = await supabase.from('routes').select('*').eq('is_active', true)
        if (routesRes.data) {
          setRoutes(routesRes.data)
        } else {
          // デモルートデータ
          setRoutes([
            { 
              id: 'demo-route-1', 
              route_name: '渋谷エリア配送', 
              route_code: 'SHIBUYA',
              start_location: '配送センター',
              end_location: '配送センター',
              estimated_time: '8時間', 
              distance: '50km',
              display_order: 1,
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            },
            { 
              id: 'demo-route-2', 
              route_name: '新宿エリア配送', 
              route_code: 'SHINJUKU',
              start_location: '配送センター',
              end_location: '配送センター',
              estimated_time: '6時間', 
              distance: '35km',
              display_order: 2,
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            },
            { 
              id: 'demo-route-3', 
              route_name: '池袋エリア配送', 
              route_code: 'IKEBUKURO',
              start_location: '配送センター',
              end_location: '配送センター',
              estimated_time: '7時間', 
              distance: '45km',
              display_order: 3,
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          ])
        }
      } catch (err) {
        console.error('データ取得エラー:', err)
        // エラー時はダミーデータを設定
        setDrivers([
          { id: '1', name: '田中太郎', employee_no: 'D001', email: '', pin_code: '1234', is_active: true, created_at: '', updated_at: '' },
          { id: '2', name: '佐藤花子', employee_no: 'D002', email: '', pin_code: '5678', is_active: true, created_at: '', updated_at: '' },
          { id: '3', name: '山田次郎', employee_no: 'D003', email: '', pin_code: '9012', is_active: true, created_at: '', updated_at: '' }
        ])
        setVehicles([
          { id: '1', vehicle_no: 'V001', vehicle_type: '小型トラック', capacity: '2t', fuel_type: 'ガソリン', last_oil_change_odometer: null, is_active: true, created_at: '', updated_at: '' },
          { id: '2', vehicle_no: 'V002', vehicle_type: '中型トラック', capacity: '4t', fuel_type: '軽油', last_oil_change_odometer: null, is_active: true, created_at: '', updated_at: '' },
          { id: '3', vehicle_no: 'V003', vehicle_type: '軽バン', capacity: '500kg', fuel_type: 'ガソリン', last_oil_change_odometer: null, is_active: true, created_at: '', updated_at: '' }
        ])
        
        // デモルートデータ（上記の完全版を使用）
      }
    }
    fetchData()

    // 現在時刻を設定し、1秒ごとに更新
    const updateTime = () => {
      const now = new Date()
      setCurrentTime(now.toLocaleTimeString('ja-JP', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
      }))
      // 初期時刻も設定
      if (!startTime) {
        setStartTime(now.toTimeString().slice(0, 5))
      }
    }
    
    updateTime()
    const interval = setInterval(updateTime, 1000)
    
    return () => clearInterval(interval)
  }, [supabase, startTime])

  const handleStartDelivery = () => {
    setShowSelectionForm(true)
  }

  // 車両選択時に開始走行距離を取得
  const handleVehicleSelect = async (vehicleId: string) => {
    setSelectedVehicle(vehicleId)
    if (vehicleId) {
      try {
        const currentOdometer = await getVehicleCurrentOdometer(vehicleId)
        setStartOdometer(currentOdometer)
      } catch (error) {
        console.error('走行距離の取得に失敗:', error)
        setStartOdometer(null)
      }
    } else {
      setStartOdometer(null)
    }
  }

  const handleRouteSelect = (routeId: string) => {
    setSelectedRoute(routeId)
    if (routeId) {
      // 実際の配送先データ（画像から読み取り）
      /*
      const demoDestinations = [
        { 
          id: '1', 
          order: 1, 
          name: 'Mano Café', 
          address: '〒150-0001 東京都渋谷区神宮前1-2-3', 
          estimatedTime: '09:30',
          notes: 'カフェ・朝の営業時間・搬入口指定'
        },
        { 
          id: '2', 
          order: 2, 
          name: 'ABC フランチャイズ', 
          address: '〒150-0002 東京都渋谷区渋谷2-4-5', 
          estimatedTime: '10:15',
          notes: '冷凍食品・要冷蔵管理'
        },
        { 
          id: '3', 
          order: 3, 
          name: 'ファミリーマート', 
          address: '〒150-0003 東京都渋谷区道玄坂1-6-7', 
          estimatedTime: '11:00',
          notes: 'コンビニ・定期配送・バックヤード搬入'
        },
        { 
          id: '4', 
          order: 4, 
          name: 'JKL医院', 
          address: '〒150-0004 東京都渋谷区宇田川町3-8-9', 
          estimatedTime: '11:45',
          notes: '医療用品・院長直接受取・要サイン'
        },
        { 
          id: '5', 
          order: 5, 
          name: 'MNO食品株式会社', 
          address: '〒150-0005 東京都渋谷区桜丘町2-11-12', 
          estimatedTime: '12:30',
          notes: '食品卸・冷蔵品・大口配送'
        },
        { 
          id: '6', 
          order: 6, 
          name: 'PQR個人宅（田中様）', 
          address: '〒150-0006 東京都渋谷区恵比寿1-14-15 マンション201', 
          estimatedTime: '13:15',
          notes: '個人宅・不在時宅配ボックス可'
        },
        { 
          id: '7', 
          order: 7, 
          name: 'STU オフィス', 
          address: '〒150-0007 東京都渋谷区神南2-16-17 STUビル5F', 
          estimatedTime: '14:00',
          notes: 'オフィス・受付対応・平日のみ'
        },
        { 
          id: '8', 
          order: 8, 
          name: 'VWX薬局', 
          address: '〒150-0008 東京都渋谷区宮益坂3-18-19', 
          estimatedTime: '14:45',
          notes: '薬局・医薬品・薬剤師確認必要'
        },
        { 
          id: '9', 
          order: 9, 
          name: 'YZ商店', 
          address: '〒150-0009 東京都渋谷区神宮前4-20-21', 
          estimatedTime: '15:30',
          notes: '雑貨店・店長不在時は店員対応可'
        },
        { 
          id: '10', 
          order: 10, 
          name: 'アパートメント（鈴木様）', 
          address: '〒150-0010 東京都渋谷区恵比寿西2-22-23 アパート103', 
          estimatedTime: '16:15',
          notes: '個人宅・インターホン確認・手渡し希望'
        }
      ]
      */
      setDestinations([
        { 
          id: '1', 
          route_id: routeId,
          name: 'ABC商店', 
          address: '〒150-0001 東京都渋谷区神宮前1-1-1', 
          destination_type: 'facility' as const,
          display_order: 1,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
    }
  }

  // 配送開始処理
  const handleStartDeliveryWithRecord = async () => {
    if (!selectedDriver || !selectedVehicle || !selectedRoute) {
      setError('ドライバー、車両、ルートを選択してください')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      console.log('配送開始処理開始')
      console.log('選択されたドライバー:', selectedDriver)
      console.log('選択された車両:', selectedVehicle)
      console.log('選択されたルート:', selectedRoute)
      console.log('開始走行距離:', startOdometer)

      // 配送記録を作成（開始走行距離は自動設定）
      const deliveryData = {
        driverId: selectedDriver,
        vehicleId: selectedVehicle,
        routeId: selectedRoute,
        deliveryDate: new Date().toISOString().split('T')[0],
        gasCardUsed: false
      }

      console.log('配送データ:', deliveryData)

      const result = await createDeliveryRecord(deliveryData as any)
      
      console.log('配送記録作成結果:', result)
      
      if (result.error) {
        console.error('配送記録作成エラー:', result.error)
        
        // 重複エラーの場合は特別な処理
        const errorObj = result.error as { 
          code?: string; 
          existingRecord?: {
            id: string;
            delivery_date: string;
            status: string;
            start_odometer?: number;
          }
        }
        if (errorObj?.code === 'DUPLICATE_DELIVERY') {
          setDuplicateRecord(errorObj?.existingRecord || null)
          setShowDuplicateDialog(true)
          setIsLoading(false)
          return
        }
        
        throw new Error(`配送記録の作成に失敗しました: ${JSON.stringify(result.error)}`)
      }

      // セッション情報を保存（配送記録IDも含める）
      const currentTime = new Date().toLocaleTimeString('ja-JP', { hour12: false, hour: '2-digit', minute: '2-digit' })
      const sessionData = {
        driverId: selectedDriver,
        driverName: drivers.find(d => d.id === selectedDriver)?.name || '',
        vehicleId: selectedVehicle,
        vehicleNo: vehicles.find(v => v.id === selectedVehicle)?.vehicle_no || '',
        selectedRoute,
        routeName: routes.find(r => r.id === selectedRoute)?.route_name || '',
        deliveryRecordId: result.data?.id,
        startOdometer,
        loginTime: new Date().toISOString(),
        startTime: startTime || currentTime,
        endTime: null
      }

      console.log('=== ログイン時セッションデータ作成 ===')
      console.log('セッションデータ:', sessionData)
      console.log('車両ID:', sessionData.vehicleId)
      console.log('車両番号:', sessionData.vehicleNo)
      console.log('=== ログイン時セッションデータ作成終了 ===')
      localStorage.setItem('driverSession', JSON.stringify(sessionData))
      
      console.log('ドライバー画面に遷移します')
      router.push('/driver')
    } catch (error) {
      console.error('配送開始エラー:', error)
      const errorMessage = error instanceof Error ? error.message : '不明なエラーが発生しました'
      setError(`配送開始に失敗しました: ${errorMessage}`)
    } finally {
      setIsLoading(false)
    }
  }

  // 既存の配送記録を削除して新しく作成
  const handleDeleteAndRecreate = async () => {
    setIsLoading(true)
    setError('')
    
    try {
      // 既存の記録を削除
      if (!duplicateRecord) {
        throw new Error('削除対象の記録が見つかりません')
      }
      const deleteResult = await deleteDeliveryRecord(duplicateRecord.id)
      if (!deleteResult.success) {
        throw new Error('既存の配送記録の削除に失敗しました')
      }
      
      // ダイアログを閉じる
      setShowDuplicateDialog(false)
      setDuplicateRecord(null)
      
      // 新しい配送記録を作成
      await handleStartDeliveryWithRecord()
    } catch (error) {
      console.error('削除・再作成エラー:', error)
      const errorMessage = error instanceof Error ? error.message : '不明なエラーが発生しました'
      setError(`削除・再作成に失敗しました: ${errorMessage}`)
      setIsLoading(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      // 選択されたドライバーの情報を取得
      const driver = drivers.find(d => d.id === selectedDriver)
      if (!driver) {
        throw new Error('ドライバーが選択されていません')
      }


      // セッション情報をローカルストレージに保存（簡易実装）
      const sessionData = {
        driverId: selectedDriver,
        driverName: driver.name,
        vehicleId: selectedVehicle,
        vehicleNo: vehicles.find(v => v.id === selectedVehicle)?.vehicle_no,
        loginTime: new Date().toISOString(),
        startTime: startTime,
        selectedRoute: selectedRoute,
        routeName: routes.find(r => r.id === selectedRoute)?.route_name
      }
      
      localStorage.setItem('driverSession', JSON.stringify(sessionData))
      
      // ドライバー画面にリダイレクト
      router.push('/driver')
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ログインに失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    setShowSelectionForm(false)
    setSelectedDriver('')
    setSelectedVehicle('')
    setError('')
    setStartTime('')
    setSelectedRoute('')
    setDestinations([])
  }

  return (
    <div className="min-h-screen" style={{background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)'}}>
      {/* 福祉送迎アプリ用ヘッダー */}
      <div className="bg-white shadow-lg border-b-4 border-blue-500">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white text-xl font-bold">🚐</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">福祉送迎システム</h1>
                <p className="text-sm text-gray-600">安全・安心な送迎サービス</p>
              </div>
            </div>
            <Link 
              href="/admin/login"
              className="welfare-button welfare-button-outline text-sm"
            >
              📊 管理者ログイン
            </Link>
          </div>
        </div>
      </div>
      
      <div className="flex items-center justify-center p-6 pt-12">
        <div className="welfare-card w-full max-w-5xl fade-in">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <span className="text-white text-3xl">🚐</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              福祉送迎ドライバー
            </h1>
            <p className="text-xl text-gray-600 mb-4">安全運転でご利用者様をお送りします</p>
            {currentTime && (
              <div className="inline-flex items-center gap-2 bg-blue-50 px-6 py-3 rounded-full">
                <span className="text-blue-600">🕐</span>
                <span className="text-2xl font-mono font-bold text-blue-600">
                  {currentTime}
                </span>
              </div>
            )}
          </div>

        {!showSelectionForm ? (
          // 初期画面：送迎開始ボタンのみ表示
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="text-center p-6 bg-blue-50 rounded-xl">
                <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-white text-2xl">🏠</span>
                </div>
                <h3 className="font-bold text-gray-900 mb-1">通所支援</h3>
                <p className="text-sm text-gray-600">ご自宅と施設間の送迎</p>
              </div>
              <div className="text-center p-6 bg-green-50 rounded-xl">
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-white text-2xl">🏥</span>
                </div>
                <h3 className="font-bold text-gray-900 mb-1">医療送迎</h3>
                <p className="text-sm text-gray-600">病院・診療所への送迎</p>
              </div>
              <div className="text-center p-6 bg-orange-50 rounded-xl">
                <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-white text-2xl">🌟</span>
                </div>
                <h3 className="font-bold text-gray-900 mb-1">外出支援</h3>
                <p className="text-sm text-gray-600">お買い物・レクリエーション</p>
              </div>
            </div>
            <div className="text-center">
              <button
                onClick={handleStartDelivery}
                className="welfare-button welfare-button-primary text-2xl px-12 py-6 shadow-xl hover:shadow-2xl"
              >
                🚐 送迎を開始する
              </button>
              <p className="text-gray-500 mt-4 text-lg">安全第一でご利用者様をお送りします</p>
            </div>
          </div>
        ) : (
          // 選択フォーム：ドライバーと車両を選択
          <form onSubmit={handleLogin} className="space-y-8">
            <div className="bg-blue-50 p-6 rounded-xl border-l-4 border-blue-500">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                👨‍💼 送迎情報の設定
              </h2>
              <p className="text-gray-600">安全な送迎のため、必要な情報を入力してください</p>
            </div>

            {/* ドライバー選択 */}
            <div className="welfare-card">
              <label className="block text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                👨‍💼 担当ドライバー
              </label>
              <select
                value={selectedDriver}
                onChange={(e) => setSelectedDriver(e.target.value)}
                className="welfare-select"
                required
              >
                <option value="">ドライバーを選択してください</option>
                {drivers.map((driver) => (
                  <option key={driver.id} value={driver.id}>
                    👨‍💼 {driver.name} ({driver.employee_no})
                  </option>
                ))}
              </select>
            </div>

            {/* 車両選択 */}
            <div className="welfare-card">
              <label className="block text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                🚐 送迎車両
              </label>
              <select
                value={selectedVehicle}
                onChange={(e) => handleVehicleSelect(e.target.value)}
                className="welfare-select"
                required
              >
                <option value="">送迎車両を選択してください</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    🚐 {vehicle.vehicle_no} ({vehicle.vehicle_type})
                  </option>
                ))}
              </select>
              
              {/* 開始走行距離表示 */}
              {startOdometer !== null && (
                <div className="mt-4 p-4 bg-green-50 border-2 border-green-200 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-green-600 text-xl">📊</span>
                    <span className="font-bold text-green-800">走行距離情報</span>
                  </div>
                  <p className="text-green-700 text-lg">
                    開始走行距離: <span className="font-bold text-xl">{startOdometer.toLocaleString()} km</span>
                  </p>
                  <p className="text-green-600 text-sm mt-1">💡 車両から自動取得されました</p>
                </div>
              )}
            </div>


            {/* ルート選択 */}
            <div className="welfare-card">
              <label className="block text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                🗺️ 送迎ルート <span className="text-red-500 text-xl">*</span>
              </label>
              <select
                value={selectedRoute}
                onChange={(e) => handleRouteSelect(e.target.value)}
                className="welfare-select"
                required
              >
                <option value="">送迎ルートを選択してください</option>
                {routes.map((route) => (
                  <option key={route.id} value={route.id}>
                    🗺️ {route.route_name} ({route.estimated_time} / {route.distance})
                  </option>
                ))}
              </select>
              <p className="text-gray-600 text-sm mt-2">⚠️ 安全運転でご利用者様をお送りください</p>
            </div>

            {/* 時間入力セクション */}
            <div className="welfare-card border-l-4 border-orange-500">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                🕐 送迎開始時間
              </h3>
              
              {/* 開始時刻 */}
              <div>
                <label className="block text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                  🕐 開始時刻 <span className="text-red-500 text-xl">*</span>
                </label>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-3">
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="welfare-input text-2xl font-mono text-center"
                      required
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const now = new Date()
                      setStartTime(now.toTimeString().slice(0, 5))
                    }}
                    className="welfare-button welfare-button-outline"
                  >
                    🕐 現在時刻
                  </button>
                </div>
                <p className="text-orange-600 text-sm mt-2 flex items-center gap-1">
                  ⚠️ 予定時刻より早めの出発をお勧めします
                </p>
              </div>
            </div>


            {/* エラーメッセージ */}
            {error && (
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-red-500 text-xl">⚠️</span>
                  <span className="font-bold text-red-800">エラーが発生しました</span>
                </div>
                <p className="text-red-700 text-lg">{error}</p>
              </div>
            )}

            {/* ボタン */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
              <button
                type="button"
                onClick={handleCancel}
                className="welfare-button welfare-button-outline text-lg"
              >
                ❌ キャンセル
              </button>
              <button
                type="button"
                onClick={handleStartDeliveryWithRecord}
                disabled={isLoading || !selectedDriver || !selectedVehicle || !startTime || !selectedRoute}
                className="welfare-button welfare-button-primary text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin">⏳</span>
                    処理中...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    🚐 送迎開始
                  </span>
                )}
              </button>
            </div>
            
            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4 mt-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-yellow-600 text-xl">🛡️</span>
                <span className="font-bold text-yellow-800">安全運転のお願い</span>
              </div>
              <ul className="text-yellow-700 space-y-1 text-sm">
                <li>• シートベルトの着用確認をお願いします</li>
                <li>• ご利用者様の体調にご配慮ください</li>
                <li>• 急発進・急ブレーキはお控えください</li>
                <li>• 困ったときは本部にご連絡ください</li>
              </ul>
            </div>
          </form>
        )}

      </div>
      </div>
      
      {/* 重複記録ダイアログ */}
      {showDuplicateDialog && duplicateRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">配送記録が既に存在します</h3>
            <div className="space-y-2 mb-6">
              <p className="text-sm text-gray-600">
                同じ日付・ドライバー・ルートの配送記録が既に存在します。
              </p>
              <div className="bg-gray-50 p-3 rounded text-sm">
                <p><strong>日付:</strong> {duplicateRecord.delivery_date}</p>
                <p><strong>ステータス:</strong> {duplicateRecord.status}</p>
                {duplicateRecord.start_odometer && (
                  <p><strong>開始走行距離:</strong> {duplicateRecord.start_odometer.toLocaleString()} km</p>
                )}
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowDuplicateDialog(false)
                  setDuplicateRecord(null)
                }}
                className="flex-1 bg-gray-400 hover:bg-gray-500 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleDeleteAndRecreate}
                disabled={isLoading}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                {isLoading ? '処理中...' : '削除して新規作成'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}