'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { TransportationRecord, Driver, Vehicle, User } from '@/types'

interface DriverSession {
  driverId: string
  driverName: string
  vehicleId: string
  vehicleNo: string
  loginTime: string
}

export default function DeliveryDetailPage() {
  const [session, setSession] = useState<DriverSession | null>(null)
  const [deliveryRecord, setDeliveryRecord] = useState<TransportationRecord | null>(null)
  const [driver, setDriver] = useState<Driver | null>(null)
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [currentTime, setCurrentTime] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [notes, setNotes] = useState('')
  const [startOdometer, setStartOdometer] = useState<number | null>(null)
  const [endOdometer, setEndOdometer] = useState<number | null>(null)
  const [pickupAddress, setPickupAddress] = useState('')
  const [dropoffAddress, setDropoffAddress] = useState('')
  const [safetyNotes, setSafetyNotes] = useState('')
  const [wheelchairFixing, setWheelchairFixing] = useState('')
  const [healthStatus, setHealthStatus] = useState('')
  const [companions, setCompanions] = useState('')
  const [transportDistance, setTransportDistance] = useState<number | null>(null)
  const [duration, setDuration] = useState('')
  const [organization, setOrganization] = useState<any>(null)

  const router = useRouter()
  const params = useParams()
  const supabase = createClient()
  const deliveryId = params.deliveryId as string

  useEffect(() => {
    // セッション情報を取得
    const sessionData = localStorage.getItem('driverSession')
    if (!sessionData) {
      router.push('/login')
      return
    }

    const parsedSession = JSON.parse(sessionData) as DriverSession
    setSession(parsedSession)
    
    // 現在時刻を設定
    const now = new Date()
    setCurrentTime(now.toLocaleTimeString('ja-JP', { 
      hour: '2-digit', 
      minute: '2-digit' 
    }))

    // 送迎記録を取得
    fetchDeliveryRecord()
  }, [router, deliveryId])

  const fetchDeliveryRecord = async () => {
    try {
      const { data: record, error } = await supabase
        .from('transportation_records')
        .select('*')
        .eq('id', deliveryId)
        .single()

      if (error) throw error
      
      setDeliveryRecord(record)
      setNotes(record.special_notes || '')
      setStartOdometer(record.start_odometer)
      setEndOdometer(record.end_odometer)
      setPickupAddress(record.pickup_address || '')
      setDropoffAddress(record.dropoff_address || '')
      setSafetyNotes(record.safety_check_boarding || '')
      setWheelchairFixing(record.wheelchair_fixing || '')
      setHealthStatus(record.health_status || '')
      setCompanions(record.companions || '')
      setTransportDistance(record.transport_distance)
      setDuration(record.duration || '')

      // 時刻の設定
      if (record.start_time) {
        const timeComponents = record.start_time.split(':')
        setStartTime(`${timeComponents[0]}:${timeComponents[1]}`)
      }
      if (record.end_time) {
        const timeComponents = record.end_time.split(':')
        setEndTime(`${timeComponents[0]}:${timeComponents[1]}`)
      }

      // 関連データを取得
      await Promise.all([
        fetchDriver(record.driver_id),
        fetchVehicle(record.vehicle_id),
        extractUserFromNotes(record.special_notes),
        fetchOrganization(record.management_code_id)
      ])
    } catch (err) {
      console.error('送迎記録取得エラー:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchDriver = async (driverId: string) => {
    try {
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .eq('id', driverId)
        .single()

      if (error) throw error
      setDriver(data)
    } catch (err) {
      console.error('ドライバー取得エラー:', err)
    }
  }

  const fetchVehicle = async (vehicleId: string) => {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('id', vehicleId)
        .single()

      if (error) throw error
      setVehicle(data)
    } catch (err) {
      console.error('車両取得エラー:', err)
    }
  }

  const extractUserFromNotes = async (specialNotes: string | null) => {
    if (!specialNotes) return

    // special_notesから利用者IDを抽出
    const match = specialNotes.match(/利用者ID: ([a-f0-9-]+)/)
    if (match) {
      const userId = match[1]
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single()

        if (error) throw error
        setUser(data)
      } catch (err) {
        console.error('利用者取得エラー:', err)
      }
    }
  }

  const fetchOrganization = async (managementCodeId: string | null) => {
    if (!managementCodeId) return

    try {
      const { data: mgmtCode, error: mgmtError } = await supabase
        .from('management_codes')
        .select('organization_id')
        .eq('id', managementCodeId)
        .single()

      if (mgmtError) throw mgmtError

      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', mgmtCode.organization_id)
        .single()

      if (orgError) throw orgError
      setOrganization(orgData)
    } catch (err) {
      console.error('事業者情報取得エラー:', err)
    }
  }

  const handleStartDelivery = async () => {
    if (!deliveryRecord || !startOdometer) {
      alert('開始時の走行距離を入力してください')
      return
    }

    const currentTimeStr = new Date().toTimeString().substring(0, 5)
    
    try {
      const { data, error } = await supabase
        .from('transportation_records')
        .update({
          start_time: currentTimeStr + ':00',
          status: 'in_progress',
          start_odometer: startOdometer,
          pickup_address: pickupAddress,
          safety_check_boarding: safetyNotes,
          wheelchair_fixing: wheelchairFixing,
          health_status: healthStatus,
          companions: companions,
          updated_at: new Date().toISOString()
        })
        .eq('id', deliveryRecord.id)
        .select()
        .single()

      if (error) throw error
      
      setDeliveryRecord(data)
      setStartTime(currentTimeStr)
      alert('送迎を開始しました')
    } catch (err) {
      console.error('送迎開始エラー:', err)
      alert('送迎開始に失敗しました')
    }
  }

  const handleCompleteDelivery = async () => {
    if (!deliveryRecord || !endOdometer) {
      alert('終了時の走行距離を入力してください')
      return
    }

    const currentTimeStr = new Date().toTimeString().substring(0, 5)
    
    try {
      const { data, error } = await supabase
        .from('transportation_records')
        .update({
          end_time: currentTimeStr + ':00',
          status: 'completed',
          end_odometer: endOdometer,
          dropoff_address: dropoffAddress,
          special_notes: notes,
          safety_check_alighting: safetyNotes,
          transport_distance: transportDistance,
          duration: duration,
          updated_at: new Date().toISOString()
        })
        .eq('id', deliveryRecord.id)
        .select()
        .single()

      if (error) throw error
      
      setDeliveryRecord(data)
      setEndTime(currentTimeStr)
      
      // 車両の現在走行距離を更新
      await supabase
        .from('vehicles')
        .update({
          current_odometer: endOdometer,
          updated_at: new Date().toISOString()
        })
        .eq('id', deliveryRecord.vehicle_id)

      alert('送迎を完了しました')
    } catch (err) {
      console.error('送迎完了エラー:', err)
      alert('送迎完了に失敗しました')
    }
  }

  const handleBack = () => {
    router.push('/driver')
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

  if (!deliveryRecord || !driver || !vehicle) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">送迎記録が見つかりません</p>
          <button
            onClick={handleBack}
            className="mt-4 text-blue-600 hover:underline"
          >
            戻る
          </button>
        </div>
      </div>
    )
  }

  const isStarted = deliveryRecord.status !== 'pending'
  const isCompleted = deliveryRecord.status === 'completed'

  return (
    <div className="min-h-screen bg-gray-50 pb-safe">
      {/* ヘッダー */}
      <div className="bg-white shadow sticky top-0 z-10">
        <div className="px-4 py-3 safe-area-inset-top">
          <div className="flex items-center justify-between">
            <button
              onClick={handleBack}
              className="text-blue-600 text-sm font-medium p-2 -m-2"
            >
              ← 戻る
            </button>
            <div className="text-center flex-1">
              <h1 className="text-lg font-semibold text-gray-900">
                送迎詳細
              </h1>
              <p className="text-xs text-gray-600 mt-1">
                {driver.name} / {vehicle.vehicle_no}
              </p>
            </div>
            <div className="text-sm text-gray-600 w-12 text-right">
              {currentTime}
            </div>
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="p-4 max-w-lg mx-auto">
        {/* 利用者情報カード */}
        {user && (
          <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
            <h2 className="text-lg font-bold text-gray-900 mb-3">利用者情報</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">氏名:</span>
                <span className="font-medium">{user.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">利用者番号:</span>
                <span className="font-medium">{user.user_no}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">住所:</span>
                <span className="font-medium text-sm">{user.address}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">電話番号:</span>
                <span className="font-medium">{user.phone}</span>
              </div>
              {user.wheelchair_user && (
                <div className="flex justify-between">
                  <span className="text-gray-600">車椅子利用:</span>
                  <span className="font-medium text-orange-600">あり</span>
                </div>
              )}
              {user.special_notes && (
                <div className="border-t pt-3">
                  <span className="text-gray-600 block mb-1">特記事項:</span>
                  <span className="text-sm">{user.special_notes}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 送迎ステータス */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <h2 className="text-lg font-bold text-gray-900 mb-3">送迎ステータス</h2>
          
          {/* 開始セクション */}
          <div className="border-b pb-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <div className={`w-4 h-4 rounded-full mr-3 ${
                  isStarted ? 'bg-green-500' : 'bg-gray-300'
                }`}></div>
                <span className="text-gray-900 font-medium">送迎開始</span>
              </div>
              {startTime && (
                <span className="text-lg font-mono font-bold text-blue-600">
                  {startTime}
                </span>
              )}
            </div>

            {!isStarted && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    開始時走行距離 (km)
                  </label>
                  <input
                    type="number"
                    value={startOdometer || ''}
                    onChange={(e) => setStartOdometer(e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="走行距離を入力"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    乗車地点住所
                  </label>
                  <input
                    type="text"
                    value={pickupAddress}
                    onChange={(e) => setPickupAddress(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="乗車地点の住所"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    乗車時安全確認
                  </label>
                  <textarea
                    value={safetyNotes}
                    onChange={(e) => setSafetyNotes(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    rows={2}
                    placeholder="乗車時の安全確認状況"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    車椅子等福祉用具の固定状況
                  </label>
                  <textarea
                    value={wheelchairFixing}
                    onChange={(e) => setWheelchairFixing(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    rows={2}
                    placeholder="車椅子や福祉用具の固定状況を記録"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    利用者の健康状態・特記事項
                  </label>
                  <textarea
                    value={healthStatus}
                    onChange={(e) => setHealthStatus(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    rows={2}
                    placeholder="健康状態や特記事項を記録"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    同乗者（介助者等）の有無と氏名
                  </label>
                  <input
                    type="text"
                    value={companions}
                    onChange={(e) => setCompanions(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="同乗者の氏名（いない場合は「なし」）"
                  />
                </div>
                <button
                  onClick={handleStartDelivery}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 active:bg-blue-800 transition-colors"
                >
                  送迎開始
                </button>
              </div>
            )}
          </div>

          {/* 完了セクション */}
          {isStarted && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <div className={`w-4 h-4 rounded-full mr-3 ${
                    isCompleted ? 'bg-green-500' : 'bg-gray-300'
                  }`}></div>
                  <span className="text-gray-900 font-medium">送迎完了</span>
                </div>
                {endTime && (
                  <span className="text-lg font-mono font-bold text-green-600">
                    {endTime}
                  </span>
                )}
              </div>

              {!isCompleted && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      終了時走行距離 (km)
                    </label>
                    <input
                      type="number"
                      value={endOdometer || ''}
                      onChange={(e) => setEndOdometer(e.target.value ? parseInt(e.target.value) : null)}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="走行距離を入力"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      降車地点住所
                    </label>
                    <input
                      type="text"
                      value={dropoffAddress}
                      onChange={(e) => setDropoffAddress(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="降車地点の住所"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      送迎距離 (km)
                    </label>
                    <input
                      type="number"
                      value={transportDistance || ''}
                      onChange={(e) => setTransportDistance(e.target.value ? parseFloat(e.target.value) : null)}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="送迎距離を入力"
                      step="0.1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      所要時間
                    </label>
                    <input
                      type="text"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="例：30分、1時間15分"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      特記事項・メモ
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                      rows={3}
                      placeholder="送迎に関するメモ"
                    />
                  </div>
                  <button
                    onClick={handleCompleteDelivery}
                    className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 active:bg-green-800 transition-colors"
                  >
                    送迎完了
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 走行距離情報 */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <h2 className="text-lg font-bold text-gray-900 mb-3">走行距離</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">開始時:</span>
              <span className="font-medium text-lg">
                {startOdometer !== null ? `${startOdometer.toLocaleString()} km` : '未入力'}
              </span>
            </div>
            {endOdometer !== null && (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">終了時:</span>
                  <span className="font-medium text-lg">
                    {endOdometer.toLocaleString()} km
                  </span>
                </div>
                <div className="flex justify-between items-center border-t pt-3">
                  <span className="text-gray-600">走行距離:</span>
                  <span className="font-bold text-lg text-blue-600">
                    {(endOdometer - (startOdometer || 0)).toLocaleString()} km
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* 事業者情報 */}
        {organization && (
          <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
            <h2 className="text-lg font-bold text-gray-900 mb-3">事業者情報</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">事業者名:</span>
                <span className="font-medium">{organization.name}</span>
              </div>
              {organization.address && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">住所:</span>
                  <span className="font-medium text-sm">{organization.address}</span>
                </div>
              )}
              {organization.phone && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">電話番号:</span>
                  <span className="font-medium">{organization.phone}</span>
                </div>
              )}
              {organization.representative_name && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">代表者:</span>
                  <span className="font-medium">{organization.representative_name}</span>
                </div>
              )}
              {organization.license_number && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">許可番号:</span>
                  <span className="font-medium">{organization.license_number}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 完了メッセージ */}
        {isCompleted && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-green-800 font-medium">送迎が完了しました</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}