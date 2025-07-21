'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getVehicleCurrentOdometer, createDeliveryRecord, deleteDeliveryRecord } from '@/lib/supabase/delivery-service'
import { Driver, Vehicle, User } from '@/types'

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
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [managementCode, setManagementCode] = useState('')
  const [codeVerified, setCodeVerified] = useState(false)
  const [currentManagementCodeId, setCurrentManagementCodeId] = useState<string | null>(null)
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
        const [driversRes, vehiclesRes, usersRes] = await Promise.all([
          supabase.from('drivers').select('*').eq('is_active', true),
          supabase.from('vehicles').select('*').eq('is_active', true),
          supabase.from('users').select('*').eq('is_active', true)
        ])
        
        if (driversRes.data) setDrivers(driversRes.data)
        if (vehiclesRes.data) setVehicles(vehiclesRes.data)
        if (usersRes.data) setUsers(usersRes.data)
      } catch (err) {
        console.error('データ取得エラー:', err)
        // エラー時はダミーデータを設定
        setDrivers([
          { id: '1', name: '田中太郎', employee_no: 'D001', email: '', pin_code: '1234', driver_license_number: null, management_code_id: null, is_active: true, created_at: '', updated_at: '' },
          { id: '2', name: '佐藤花子', employee_no: 'D002', email: '', pin_code: '5678', driver_license_number: null, management_code_id: null, is_active: true, created_at: '', updated_at: '' },
          { id: '3', name: '山田次郎', employee_no: 'D003', email: '', pin_code: '9012', driver_license_number: null, management_code_id: null, is_active: true, created_at: '', updated_at: '' }
        ])
        setVehicles([
          { 
            id: '1', 
            vehicle_no: 'V001', 
            vehicle_name: 'ハイエース1号車',
            vehicle_type: 'ハイエース', 
            capacity: '8', 
            fuel_type: 'ガソリン', 
            wheelchair_accessible: false,
            current_odometer: 15000,
            last_oil_change_odometer: 12000,
            management_code_id: null, 
            is_active: true, 
            created_at: '', 
            updated_at: '' 
          },
          { 
            id: '2', 
            vehicle_no: 'V002', 
            vehicle_name: 'ハイエース2号車',
            vehicle_type: 'ハイエース', 
            capacity: '8', 
            fuel_type: 'ガソリン', 
            wheelchair_accessible: true,
            current_odometer: 12000,
            last_oil_change_odometer: 10000,
            management_code_id: null, 
            is_active: true, 
            created_at: '', 
            updated_at: '' 
          },
          { 
            id: '3', 
            vehicle_no: 'V003', 
            vehicle_name: 'セレナ1号車',
            vehicle_type: 'セレナ', 
            capacity: '8', 
            fuel_type: 'ガソリン', 
            wheelchair_accessible: false,
            current_odometer: 8000,
            last_oil_change_odometer: 7000,
            management_code_id: null, 
            is_active: true, 
            created_at: '', 
            updated_at: '' 
          }
        ])
        setUsers([
          { 
            id: '1', 
            user_no: 'U001', 
            name: '山田花子', 
            phone: '03-1234-5678',
            address: '東京都新宿区西新宿1-1-1',
            emergency_contact: '山田太郎', 
            emergency_phone: '090-1234-5678',
            wheelchair_user: false,
            special_notes: '血圧の薬を服用中',
            management_code_id: null,
            is_active: true, 
            created_at: '', 
            updated_at: '' 
          },
          { 
            id: '2', 
            user_no: 'U002', 
            name: '佐藤次郎', 
            phone: '03-2345-6789',
            address: '東京都渋谷区渋谷2-2-2',
            emergency_contact: '佐藤三郎', 
            emergency_phone: '090-2345-6789',
            wheelchair_user: true,
            special_notes: '車椅子利用、アレルギー：卵',
            management_code_id: null,
            is_active: true, 
            created_at: '', 
            updated_at: '' 
          },
          { 
            id: '3', 
            user_no: 'U003', 
            name: '田中一郎', 
            phone: '03-3456-7890',
            address: '東京都港区六本木3-3-3',
            emergency_contact: '田中二郎', 
            emergency_phone: '090-3456-7890',
            wheelchair_user: false,
            special_notes: '膝が悪く、歩行に時間がかかる',
            management_code_id: null,
            is_active: true, 
            created_at: '', 
            updated_at: '' 
          }
        ])
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

  const handleUserSelect = (userId: string) => {
    setSelectedUsers(prev => {
      if (prev.includes(userId)) {
        // 既に選択されている場合は削除
        return prev.filter(id => id !== userId)
      } else {
        // 新しく選択
        return [...prev, userId]
      }
    })
  }

  // 送迎開始処理
  const handleStartDeliveryWithRecord = async () => {
    // 既に処理中の場合は何もしない（重複クリック防止）
    if (isLoading) {
      console.log('既に処理中のため、リクエストを無視します')
      return
    }

    if (!selectedDriver || !selectedVehicle || selectedUsers.length === 0) {
      setError('ドライバー、車両、利用者を選択してください')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      console.log('送迎開始処理開始')
      console.log('選択されたドライバー:', selectedDriver)
      console.log('選択された車両:', selectedVehicle)
      console.log('選択された利用者:', selectedUsers)
      console.log('開始走行距離:', startOdometer)

      // 1件の往復送迎記録として作成
      const deliveryData = {
        driverId: selectedDriver,
        vehicleId: selectedVehicle,
        transportationDate: new Date().toISOString().split('T')[0],
        transportationType: 'round_trip' as const,
        passengerCount: selectedUsers.length,
        specialNotes: `往復送迎 - 利用者${selectedUsers.length}名`,
        managementCodeId: currentManagementCodeId,
        selectedUsers: selectedUsers // 利用者リストを渡す
      }

      console.log('送迎データ:', deliveryData)
      const result = await createDeliveryRecord(deliveryData)
      
      if (result.error) {
        console.error('送迎記録作成エラー:', result.error)
        throw new Error(`送迎記録の作成に失敗しました: ${result.error}`)
      }

      const deliveryResults = [result]
      const firstResult = result
      
      console.log('送迎記録作成結果:', firstResult)

      // セッション情報を保存（複数利用者の情報を含める）
      const currentTime = new Date().toLocaleTimeString('ja-JP', { hour12: false, hour: '2-digit', minute: '2-digit' })
      const selectedUserNames = selectedUsers.map(id => users.find(u => u.id === id)?.name || '').join(', ')
      const deliveryRecordIds = deliveryResults.map(result => result.data?.id).filter(Boolean)
      
      const sessionData = {
        driverId: selectedDriver,
        driverName: drivers.find(d => d.id === selectedDriver)?.name || '',
        vehicleId: selectedVehicle,
        vehicleNo: vehicles.find(v => v.id === selectedVehicle)?.vehicle_no || '',
        selectedUsers,
        userNames: selectedUserNames,
        deliveryRecordIds,
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
      
      // 送迎完了ページにリダイレクト
      const recordId = firstResult.data?.id
      if (recordId) {
        console.log('送迎完了ページに遷移します。記録ID:', recordId)
        router.push(`/transportation-complete?recordId=${recordId}`)
      } else {
        console.log('記録IDが取得できないため、ドライバー画面に遷移します')
        router.push('/driver')
      }
    } catch (error) {
      console.error('送迎開始エラー:', error)
      const errorMessage = error instanceof Error ? error.message : '不明なエラーが発生しました'
      setError(`送迎開始に失敗しました: ${errorMessage}`)
    } finally {
      setIsLoading(false)
    }
  }

  // 既存の送迎記録を削除して新しく作成
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
        throw new Error('既存の送迎記録の削除に失敗しました')
      }
      
      // ダイアログを閉じる
      setShowDuplicateDialog(false)
      setDuplicateRecord(null)
      
      // 新しい送迎記録を作成
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
        selectedUsers: selectedUsers,
        userNames: selectedUsers.map(id => users.find(u => u.id === id)?.name || '').join(', ')
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

  const verifyManagementCode = async () => {
    if (managementCode.length !== 6) {
      setError('管理コードは6桁で入力してください')
      return
    }

    try {
      const { data: codeData, error: codeError } = await supabase
        .from('management_codes')
        .select('id, organization_id, name, is_active')
        .eq('code', managementCode)
        .eq('is_active', true)
        .single()

      if (codeError || !codeData) {
        setError('無効な管理コードです')
        return
      }

      setCurrentManagementCodeId(codeData.id)
      setCodeVerified(true)
      setError('')
      
      // 管理コードに紐づいたデータを取得
      await fetchFilteredData(codeData.id)
      
    } catch (err) {
      console.error('管理コード確認エラー:', err)
      setError('管理コードの確認に失敗しました')
    }
  }

  const fetchFilteredData = async (managementCodeId: string) => {
    try {
      const [driversRes, vehiclesRes, usersRes] = await Promise.all([
        supabase.from('drivers').select('*').eq('is_active', true).eq('management_code_id', managementCodeId),
        supabase.from('vehicles').select('*').eq('is_active', true).eq('management_code_id', managementCodeId),
        supabase.from('users').select('*').eq('is_active', true).eq('management_code_id', managementCodeId)
      ])
      
      if (driversRes.data) setDrivers(driversRes.data)
      if (vehiclesRes.data) setVehicles(vehiclesRes.data)
      if (usersRes.data) setUsers(usersRes.data)
    } catch (err) {
      console.error('フィルタされたデータ取得エラー:', err)
      setError('データの取得に失敗しました')
    }
  }

  const handleCancel = () => {
    setShowSelectionForm(false)
    setSelectedDriver('')
    setSelectedVehicle('')
    setError('')
    setStartTime('')
    setSelectedUsers([])
    setManagementCode('')
    setCodeVerified(false)
    setCurrentManagementCodeId(null)
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

            {/* 管理コード入力 */}
            {!codeVerified ? (
              <div className="welfare-card border-l-4 border-orange-500">
                <label className="block text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                  🔑 管理コード
                </label>
                <div className="flex gap-4">
                  <input
                    type="text"
                    value={managementCode}
                    onChange={(e) => setManagementCode(e.target.value.toUpperCase())}
                    className="flex-1 welfare-input text-center text-2xl font-mono tracking-widest"
                    placeholder="6桁の管理コードを入力"
                    maxLength={6}
                    required
                  />
                  <button
                    type="button"
                    onClick={verifyManagementCode}
                    disabled={managementCode.length !== 6}
                    className="bg-orange-600 text-white px-6 py-2 rounded font-medium hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    確認
                  </button>
                </div>
                <p className="text-orange-600 text-sm mt-2">
                  ⚠️ 管理者から発行された6桁の管理コードを入力してください
                </p>
              </div>
            ) : (
              <>
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


            {/* 利用者選択 */}
            <div className="welfare-card">
              <label className="block text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                👤 送迎対象の利用者様 <span className="text-red-500 text-xl">*</span>
                {selectedUsers.length > 0 && (
                  <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded ml-2">
                    {selectedUsers.length}名選択中
                  </span>
                )}
              </label>
              <div className="grid gap-4">
                {users.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => handleUserSelect(user.id)}
                    className={`p-4 border-2 rounded-xl text-left transition-all ${
                      selectedUsers.includes(user.id)
                        ? 'border-blue-500 bg-blue-50 text-blue-900'
                        : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        user.wheelchair_user ? 'bg-purple-100' : 'bg-blue-100'
                      }`}>
                        <span className="text-2xl">{user.wheelchair_user ? '♿' : '👤'}</span>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-lg">{user.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm bg-gray-100 px-2 py-1 rounded">
                            {user.user_no}
                          </span>
                          {user.wheelchair_user && (
                            <span className="text-sm bg-purple-100 text-purple-800 px-2 py-1 rounded">
                              車椅子利用
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">📍 {user.address}</p>
                        {user.special_notes && (
                          <p className="text-sm text-orange-600 mt-1">📝 {user.special_notes}</p>
                        )}
                      </div>
                      {selectedUsers.includes(user.id) && (
                        <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">
                          {selectedUsers.indexOf(user.id) + 1}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
              <p className="text-gray-600 text-sm mt-4">⚠️ 複数の利用者様を選択できます。体調と安全を最優先にお送りください</p>
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
                disabled={isLoading || !selectedDriver || !selectedVehicle || !startTime || selectedUsers.length === 0 || !codeVerified}
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
              </>
            )}
            
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
            <h3 className="text-lg font-medium text-gray-900 mb-4">送迎記録が既に存在します</h3>
            <div className="space-y-2 mb-6">
              <p className="text-sm text-gray-600">
                同じ日付・ドライバー・ルートの送迎記録が既に存在します。
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