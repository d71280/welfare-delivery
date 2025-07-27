'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getVehicleCurrentOdometer, createDeliveryRecord, deleteDeliveryRecord } from '@/lib/supabase/delivery-service'
import { Driver, Vehicle, User, UserAddress } from '@/types'

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
  const [userAddresses, setUserAddresses] = useState<{[userId: string]: UserAddress[]}>({})
  const [selectedAddresses, setSelectedAddresses] = useState<{[userId: string]: number}>({})
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
        if (usersRes.data) {
          setUsers(usersRes.data)
          
          // 各利用者の住所情報を取得
          const addressPromises = usersRes.data.map(async (user: User) => {
            const { data: addresses } = await supabase
              .from('user_addresses')
              .select('*')
              .eq('user_id', user.id)
              .eq('is_active', true)
              .order('display_order')
            return { userId: user.id, addresses: addresses || [] }
          })
          
          const addressResults = await Promise.all(addressPromises)
          const addressMap: {[userId: string]: UserAddress[]} = {}
          
          addressResults.forEach(({ userId, addresses }) => {
            addressMap[userId] = addresses
          })
          
          setUserAddresses(addressMap)
        }
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

  const handleUserSelect = async (userId: string) => {
    setSelectedUsers(prev => {
      if (prev.includes(userId)) {
        // 既に選択されている場合は削除
        return prev.filter(id => id !== userId)
      } else {
        // 新しく選択
        return [...prev, userId]
      }
    })

    // 選択された利用者の住所を取得
    if (!userAddresses[userId]) {
      try {
        const { data: addresses, error } = await supabase
          .from('user_addresses')
          .select('*')
          .eq('user_id', userId)
          .eq('is_active', true)
          .order('display_order')

        if (error) throw error

        setUserAddresses(prev => ({
          ...prev,
          [userId]: addresses || []
        }))

        // デフォルトで最初の住所を選択
        if (addresses && addresses.length > 0) {
          setSelectedAddresses(prev => ({
            ...prev,
            [userId]: 0
          }))
        }
      } catch (error) {
        console.error('住所取得エラー:', error)
      }
    }
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
        transportationType: 'regular' as const, // 暫定: データベース制約更新まで
        passengerCount: selectedUsers.length,
        specialNotes: `往復送迎 - 利用者${selectedUsers.length}名`,
        managementCodeId: currentManagementCodeId,
        selectedUsers: selectedUsers, // 利用者リストを渡す
        selectedAddresses: Object.fromEntries(
          Object.entries(selectedAddresses).map(([userId, index]) => [userId, index.toString()])
        ), // 選択された住所情報を文字列として変換
        startTime: startTime // 開始時刻を追加
      }

      console.log('送迎データ:', deliveryData)
      const result = await createDeliveryRecord(deliveryData)
      
      if (!result.data) {
        console.error('送迎記録作成エラー:', result)
        throw new Error('送迎記録の作成に失敗しました: データが取得できませんでした')
      }

      const deliveryResults = [result]
      const firstResult = result
      
      console.log('送迎記録作成結果:', firstResult)
      console.log('送迎記録作成結果の詳細:', {
        data: result.data,
        id: result.data?.id,
        error: result.error
      })

      // セッション情報を保存（複数利用者の情報を含める）
      const currentTime = new Date().toLocaleTimeString('ja-JP', { hour12: false, hour: '2-digit', minute: '2-digit' })
      const selectedUserNames = selectedUsers.map(id => users.find(u => u.id === id)?.name || '').join(', ')
      const deliveryRecordIds = result.data?.id ? [result.data.id] : []
      
      console.log('送迎記録IDリスト:', deliveryRecordIds)
      
      const sessionData = {
        driverId: selectedDriver,
        driverName: drivers.find(d => d.id === selectedDriver)?.name || '',
        vehicleId: selectedVehicle,
        vehicleNo: vehicles.find(v => v.id === selectedVehicle)?.vehicle_no || '',
        selectedUsers,
        userNames: selectedUserNames,
        selectedAddresses,
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
      console.log('送迎記録IDs:', sessionData.deliveryRecordIds)
      console.log('=== ログイン時セッションデータ作成終了 ===')
      localStorage.setItem('driverSession', JSON.stringify(sessionData))
      
      // ドライバー画面に遷移（送迎詳細入力のため）
      console.log('ドライバー画面に遷移します')
      router.push('/driver')
    } catch (error) {
      console.error('送迎開始エラー:', error)
      const errorMessage = error instanceof Error ? error.message : '不明なエラーが発生しました'
      
      // 重複エラーの場合はより分かりやすいメッセージに変更
      if (errorMessage.includes('同じ日付・ドライバー・車両の送迎記録が既に存在します')) {
        setError('本日の送迎記録は既に作成済みです。ドライバー画面から送迎を継続してください。')
      } else {
        setError(`送迎開始に失敗しました: ${errorMessage}`)
      }
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
        userNames: selectedUsers.map(id => users.find(u => u.id === id)?.name || '').join(', '),
        selectedAddresses
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* モバイルヘッダー */}
      <div className="mobile-header">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <span className="text-2xl">🚐</span>
            </div>
            <div>
              <h1>福祉送迎システム</h1>
              <div className="subtitle">安全・安心な送迎サービス</div>
            </div>
          </div>
          <Link 
            href="/admin/login"
            className="btn-modern btn-outline text-sm bg-white/10 border-white/20 text-white hover:bg-white/20"
          >
            📊 管理者
          </Link>
        </div>
      </div>
      
      <div className="container-mobile py-8">
        <div className="max-w-md mx-auto">
          {/* メインカード */}
          <div className="modern-card fade-in">
            <div className="text-center p-4">
              {/* アイコンとタイトル */}
              <div className="user-avatar mx-auto mb-3" style={{width: '3.5rem', height: '3.5rem', fontSize: '1.5rem'}}>
                🚐
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-1">
                福祉送迎ドライバー
              </h1>
              <p className="text-sm text-gray-600 mb-3">安全運転でご利用者様をお送りします</p>
              
              {/* 現在時刻 */}
              {currentTime && (
                <div className="inline-flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-full mb-3 text-sm">
                  <span className="text-blue-600 text-sm">🕐</span>
                  <span className="font-mono text-blue-600">
                    {currentTime}
                  </span>
                </div>
              )}
            </div>

            {!showSelectionForm ? (
              /* 初期画面：送迎開始ボタン */
              <div className="p-4 pt-0">
                {/* サービス紹介 */}
                <div className="grid-mobile gap-3 mb-4">
                  <div className="text-center p-3 bg-blue-50 rounded-xl">
                    <h3 className="font-bold text-gray-900 text-sm mb-1">通所支援</h3>
                    <p className="text-xs text-gray-600">ご自宅と施設間の送迎</p>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-xl">
                    <h3 className="font-bold text-gray-900 text-sm mb-1">医療送迎</h3>
                    <p className="text-xs text-gray-600">病院・診療所への送迎</p>
                  </div>
                </div>
                
                {/* メインボタン */}
                <button
                  onClick={handleStartDelivery}
                  className="btn-modern btn-primary btn-xl w-full text-xl"
                >
                  🚐 送迎を開始する
                </button>
                <p className="text-gray-500 mt-3 text-center text-xs">安全第一でご利用者様をお送りします</p>
              </div>
            ) : (
              /* 選択フォーム */
              <form onSubmit={handleLogin} className="p-4 pt-0 space-y-4">
                {/* 案内メッセージ */}
                <div className="bg-blue-50 p-3 rounded-xl border-l-4 border-blue-500">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-blue-600">👨‍💼</span>
                    <h2 className="font-bold text-gray-900 text-sm">送迎情報の設定</h2>
                  </div>
                  <p className="text-xs text-gray-600">安全な送迎のため、必要な情報を入力してください</p>
                </div>

                {/* 管理コード入力 */}
                {!codeVerified ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-orange-600 text-lg">🔑</span>
                      <label className="font-bold text-gray-900 text-sm">管理コード</label>
                    </div>
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={managementCode}
                        onChange={(e) => setManagementCode(e.target.value.toUpperCase())}
                        className="form-input text-center text-2xl font-mono tracking-widest"
                        placeholder="6桁のコード"
                        maxLength={6}
                        required
                      />
                      <button
                        type="button"
                        onClick={verifyManagementCode}
                        disabled={managementCode.length !== 6}
                        className="btn-modern btn-warning w-full disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        確認
                      </button>
                    </div>
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-2">
                      <p className="text-orange-700 text-xs">
                        ⚠️ 管理者から発行された6桁の管理コードを入力してください
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* ドライバー選択 */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-blue-600 text-xl">👨‍💼</span>
                        <label className="font-bold text-gray-900">担当ドライバー</label>
                      </div>
                      <select
                        value={selectedDriver}
                        onChange={(e) => setSelectedDriver(e.target.value)}
                        className="form-select"
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
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-green-600 text-xl">🚐</span>
                        <label className="font-bold text-gray-900">送迎車両</label>
                      </div>
                                             <select
                         value={selectedVehicle}
                         onChange={(e) => handleVehicleSelect(e.target.value)}
                         className="form-select"
                         required
                       >
                        <option value="">送迎車両を選択してください</option>
                        {vehicles.map((vehicle) => (
                          <option key={vehicle.id} value={vehicle.id}>
                            🚐 {vehicle.vehicle_no} ({vehicle.vehicle_name})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 利用者選択と住所選択 */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-purple-600 text-lg">👥</span>
                        <label className="font-semibold text-gray-900 text-sm">送迎対象の利用者様</label>
                        <span className="text-red-500">*</span>
                      </div>
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {users.map((user) => (
                          <div key={user.id} className="border rounded-lg p-3">
                            <div
                              className={`user-card-compact ${selectedUsers.includes(user.id) ? 'selected' : ''}`}
                              onClick={() => handleUserSelect(user.id)}
                            >
                              <div className="flex items-center gap-2">
                                <div className="user-avatar-small">
                                  {user.name.charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-medium text-gray-900 text-sm truncate">{user.name}</h3>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-600">{user.user_no}</span>
                                    {user.wheelchair_user && (
                                      <span className="text-xs bg-purple-100 text-purple-700 px-1 rounded">♿</span>
                                    )}
                                  </div>
                                </div>
                                <div className="text-lg">
                                  {selectedUsers.includes(user.id) ? '✅' : '○'}
                                </div>
                              </div>
                            </div>
                            
                            {/* 住所選択（利用者が選択されている場合のみ表示） */}
                            {selectedUsers.includes(user.id) && userAddresses[user.id] && (
                              <div className="mt-3 space-y-2">
                                <div className="text-xs font-medium text-gray-700 flex items-center gap-1">
                                  <span>🏠</span>
                                  <span>送迎先住所</span>
                                </div>
                                {userAddresses[user.id].map((address, index) => (
                                  <label 
                                    key={index} 
                                    className={`block p-2 rounded-lg border cursor-pointer transition-all text-sm ${
                                      selectedAddresses[user.id] === index 
                                        ? 'bg-blue-50 border-blue-500' 
                                        : 'bg-white border-gray-200 hover:border-gray-300'
                                    }`}
                                  >
                                    <div className="flex items-start gap-2">
                                      <input
                                        type="radio"
                                        name={`address-${user.id}`}
                                        value={index}
                                        checked={selectedAddresses[user.id] === index}
                                        onChange={() => setSelectedAddresses(prev => ({
                                          ...prev,
                                          [user.id]: index
                                        }))}
                                        className="w-3 h-3 mt-0.5 text-blue-600 cursor-pointer"
                                      />
                                      <div className="flex-1">
                                        <div className="font-medium text-xs text-gray-900">
                                          {address.address_name}
                                        </div>
                                        <div className="text-xs text-gray-600">
                                          📍 {address.address}
                                        </div>
                                      </div>
                                    </div>
                                  </label>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>


                    {/* 開始時刻 */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-blue-600 text-lg">🕐</span>
                        <label className="font-semibold text-gray-900 text-sm">開始時刻</label>
                        <span className="text-red-500">*</span>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="time"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          className="form-input flex-1 text-center"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setStartTime(new Date().toTimeString().slice(0, 5))}
                          className="btn-modern btn-outline text-xs px-3 py-1 whitespace-nowrap"
                        >
                          現在時刻
                        </button>
                      </div>
                    </div>

                    {/* 走行距離 */}
                    {startOdometer !== null && (
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-green-600 text-xl">📏</span>
                          <label className="font-bold text-gray-900">開始時走行距離</label>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-lg border">
                          <p className="text-lg font-mono font-bold text-center">
                            {startOdometer.toLocaleString()} km
                          </p>
                        </div>
                      </div>
                    )}

                    {/* エラー表示 */}
                    {error && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-red-700 text-sm">{error}</p>
                      </div>
                    )}

                    {/* ボタン */}
                    <div className="space-y-3">
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="btn-modern btn-primary btn-lg w-full disabled:opacity-50"
                      >
                        {isLoading ? (
                          <div className="flex items-center gap-2">
                            <div className="spinner"></div>
                            設定中...
                          </div>
                        ) : (
                          '🚐 送迎開始'
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={handleCancel}
                        className="btn-modern btn-outline w-full"
                      >
                        ❌ キャンセル
                      </button>
                    </div>
                  </div>
                )}
              </form>
            )}
          </div>
        </div>
      </div>

      {/* 重複記録ダイアログ */}
      {showDuplicateDialog && duplicateRecord && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="modern-card max-w-sm w-full">
            <div className="p-6">
              <div className="text-center mb-4">
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-yellow-600 text-2xl">⚠️</span>
                </div>
                <h3 className="text-lg font-bold text-gray-900">既存の送迎記録</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {duplicateRecord.delivery_date}の記録が見つかりました
                </p>
              </div>
              
              <div className="bg-gray-50 p-3 rounded-lg mb-4">
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">状態:</span> {duplicateRecord.status === 'in_progress' ? '進行中' : duplicateRecord.status === 'completed' ? '完了' : '待機中'}
                </p>
                {duplicateRecord.start_odometer && (
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold">開始距離:</span> {duplicateRecord.start_odometer}km
                  </p>
                )}
              </div>
              
              <div className="space-y-3">
                <button
                  onClick={handleDeleteAndRecreate}
                  className="btn-modern btn-warning w-full"
                >
                  既存記録を削除して新規作成
                </button>
                <button
                  onClick={() => setShowDuplicateDialog(false)}
                  className="btn-modern btn-outline w-full"
                >
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}