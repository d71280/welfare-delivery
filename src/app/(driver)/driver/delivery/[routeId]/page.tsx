'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Route, DeliveryRecord } from '@/types'

interface DriverSession {
  driverId: string
  driverName: string
  vehicleId: string
  vehicleNo: string
  loginTime: string
}

export default function DeliveryPage() {
  const [session, setSession] = useState<DriverSession | null>(null)
  const [route, setRoute] = useState<Route | null>(null)
  const [deliveryRecord, setDeliveryRecord] = useState<DeliveryRecord | null>(null)
  const [currentTime, setCurrentTime] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isStarted, setIsStarted] = useState(false)
  const [isCompleted, setIsCompleted] = useState(false)
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [notes, setNotes] = useState('')
  const [showTimeInput, setShowTimeInput] = useState(false)
  const [timeInputType, setTimeInputType] = useState<'start' | 'end'>('start')
  const [startOdometer, setStartOdometer] = useState<number | null>(null)
  const [endOdometer, setEndOdometer] = useState<number | null>(null)
  const [showOdometerInput, setShowOdometerInput] = useState(false)
  const [oilChangeChecked, setOilChangeChecked] = useState(false)
  const [lastOdometer, setLastOdometer] = useState<number | null>(null)

  const router = useRouter()
  const params = useParams()
  const supabase = createClient()
  const routeId = params.routeId as string

  useEffect(() => {
    // セッション情報を取得
    const sessionData = localStorage.getItem('driverSession')
    if (!sessionData) {
      router.push('/login')
      return
    }

    const parsedSession = JSON.parse(sessionData) as DriverSession
    setSession(parsedSession)
    
    // 車両の最新走行距離を取得
    fetchLastOdometer(parsedSession.vehicleId)

    // 現在時刻を設定
    const now = new Date()
    setCurrentTime(now.toLocaleTimeString('ja-JP', { 
      hour: '2-digit', 
      minute: '2-digit' 
    }))

    // ルート情報を取得
    fetchRoute()
    
    // 既存の配送記録を確認
    checkExistingDeliveryRecord(parsedSession)
  }, [router, routeId])

  const fetchLastOdometer = async (vehicleId: string) => {
    try {
      // 最新の配送記録から終了時の走行距離を取得
      const { data } = await supabase
        .from('delivery_records')
        .select('end_odometer')
        .eq('vehicle_id', vehicleId)
        .not('end_odometer', 'is', null)
        .order('delivery_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1)

      if (data && data.length > 0 && data[0].end_odometer) {
        setLastOdometer(data[0].end_odometer)
        setStartOdometer(data[0].end_odometer)
      }
    } catch (err) {
      console.error('最終走行距離取得エラー:', err)
    }
  }

  const fetchRoute = async () => {
    try {
      const { data, error } = await supabase
        .from('routes')
        .select('*')
        .eq('id', routeId)
        .single()

      if (error) throw error
      setRoute(data)
    } catch (err) {
      console.error('ルート取得エラー:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const checkExistingDeliveryRecord = async (session: DriverSession) => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const { data } = await supabase
        .from('delivery_records')
        .select('*')
        .eq('driver_id', session.driverId)
        .eq('vehicle_id', session.vehicleId)
        .eq('route_id', routeId)
        .eq('delivery_date', today)
        .single()

      if (data) {
        setDeliveryRecord(data)
        setIsStarted(data.status !== 'pending')
        setIsCompleted(data.status === 'completed')
        console.log('Raw start_time from DB:', data.start_time)
        console.log('Raw end_time from DB:', data.end_time)
        
        // start_timeとend_timeの処理を改善 (TIME形式: HH:MM:SS)
        if (data.start_time) {
          // TIME形式 (HH:MM:SS) から HH:MM 形式に変換
          const timeComponents = data.start_time.split(':')
          if (timeComponents.length >= 2) {
            setStartTime(`${timeComponents[0]}:${timeComponents[1]}`)
          } else {
            setStartTime(data.start_time)
          }
        }
        
        if (data.end_time) {
          // TIME形式 (HH:MM:SS) から HH:MM 形式に変換
          const timeComponents = data.end_time.split(':')
          if (timeComponents.length >= 2) {
            setEndTime(`${timeComponents[0]}:${timeComponents[1]}`)
          } else {
            setEndTime(data.end_time)
          }
        }
        setNotes(data.notes || '')
        setStartOdometer(data.start_odometer)
        setEndOdometer(data.end_odometer)
      }
    } catch (err) {
      console.error('配送記録確認エラー:', err)
    }
  }

  const handleStartDelivery = () => {
    if (startOdometer === null) {
      alert('開始時の走行距離を入力してください')
      return
    }
    setTimeInputType('start')
    setShowTimeInput(true)
  }

  const handleCompleteDelivery = () => {
    if (endOdometer === null) {
      alert('終了時の走行距離を入力してください')
      return
    }
    setTimeInputType('end')
    setShowTimeInput(true)
  }

  const handleOdometerSubmit = async (odometer: number, type: 'start' | 'end') => {
    if (!session) return

    if (type === 'start') {
      setStartOdometer(odometer)
      setTimeInputType('start')
      setShowOdometerInput(false)
      setShowTimeInput(true)
    } else {
      setEndOdometer(odometer)
      setTimeInputType('end')
      setShowOdometerInput(false)
      setShowTimeInput(true)
    }
  }

  const handleTimeSubmit = async (inputTime: string) => {
    if (!session) return

    try {
      const now = new Date()
      const [hours, minutes] = inputTime.split(':')
      const timeDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), parseInt(hours), parseInt(minutes))
      
      console.log('Input time:', inputTime)
      console.log('Parsed time date:', timeDate)
      console.log('ISO string:', timeDate.toISOString())

      if (timeInputType === 'start') {
        // 配送開始
        let recordData
        if (deliveryRecord) {
          // 既存の記録を更新
          const { data, error } = await supabase
            .from('delivery_records')
            .update({
              start_time: inputTime + ':00', // TIME形式に変換 (HH:MM:SS)
              status: 'in_progress',
              start_odometer: startOdometer,
              updated_at: new Date().toISOString()
            })
            .eq('id', deliveryRecord.id)
            .select()
            .single()

          if (error) throw error
          recordData = data
        } else {
          // 新規記録作成
          const { data, error } = await supabase
            .from('delivery_records')
            .insert([{
              driver_id: session.driverId,
              vehicle_id: session.vehicleId,
              route_id: routeId,
              delivery_date: new Date().toISOString().split('T')[0],
              start_time: inputTime + ':00', // TIME形式に変換 (HH:MM:SS)
              status: 'in_progress',
              start_odometer: startOdometer
            }])
            .select()
            .single()

          if (error) throw error
          recordData = data
        }

        setDeliveryRecord(recordData)
        setIsStarted(true)
        setStartTime(inputTime)
      } else {
        // 配送完了
        if (deliveryRecord) {
          const { data, error } = await supabase
            .from('delivery_records')
            .update({
              end_time: inputTime + ':00', // TIME形式に変換 (HH:MM:SS)
              status: 'completed',
              notes: notes,
              end_odometer: endOdometer,
              updated_at: new Date().toISOString()
            })
            .eq('id', deliveryRecord.id)
            .select()
            .single()

          if (error) throw error
          setDeliveryRecord(data)
          setIsCompleted(true)
          setEndTime(inputTime)
          
          // オイル交換チェック時の処理
          if (oilChangeChecked && endOdometer) {
            await updateVehicleOilChange(session.vehicleId, endOdometer)
          }
        }
      }

      setShowTimeInput(false)
    } catch (err) {
      console.error('時間記録エラー:', err)
      alert('時間の記録に失敗しました')
    }
  }

  const updateVehicleOilChange = async (vehicleId: string, odometer: number) => {
    try {
      // 車両の最終オイル交換走行距離を更新
      const { error } = await supabase
        .from('vehicles')
        .update({
          last_oil_change_odometer: odometer,
          updated_at: new Date().toISOString()
        })
        .eq('id', vehicleId)

      if (error) throw error
    } catch (err) {
      console.error('オイル交換記録エラー:', err)
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

  if (!session || !route) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-white shadow">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={handleBack}
              className="text-blue-600 text-sm font-medium"
            >
              ← 戻る
            </button>
            <div className="text-center">
              <h1 className="text-lg font-medium text-gray-900">
                {route.route_name}
              </h1>
              <p className="text-sm text-gray-600">
                {session.driverName} / {session.vehicleNo}
              </p>
            </div>
            <div className="text-sm text-gray-600">
              {currentTime}
            </div>
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="p-4 max-w-md mx-auto">
        {/* 配送情報カード */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">配送情報</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">ルート:</span>
              <span className="font-medium">{route.route_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">開始地点:</span>
              <span className="font-medium">{route.start_location || '未設定'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">終了地点:</span>
              <span className="font-medium">{route.end_location || '未設定'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">予定時間:</span>
              <span className="font-medium">{route.estimated_time || '未設定'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">距離:</span>
              <span className="font-medium">{route.distance || '未設定'}</span>
            </div>
          </div>
        </div>

        {/* 走行距離情報 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">走行距離</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">開始時の走行距離:</span>
              <span className="font-medium text-lg">
                {startOdometer !== null ? `${startOdometer.toLocaleString()} km` : '未入力'}
              </span>
            </div>
            {endOdometer !== null && (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">終了時の走行距離:</span>
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

        {/* 配送ステータス */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">配送ステータス</h2>
          
          {/* 開始時刻 */}
          <div className="flex items-center justify-between py-3 border-b">
            <div className="flex items-center">
              <div className={`w-4 h-4 rounded-full mr-3 ${
                isStarted ? 'bg-green-500' : 'bg-gray-300'
              }`}></div>
              <span className="text-gray-900">開始時刻</span>
            </div>
            <div className="flex items-center">
              {startTime && (
                <span className="text-lg font-mono font-bold text-blue-600 mr-3">
                  {startTime}
                </span>
              )}
              {!isStarted && (
                <button
                  onClick={handleStartDelivery}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  開始
                </button>
              )}
            </div>
          </div>

          {/* 開始時走行距離 */}
          <div className="flex items-center justify-between py-3 border-b">
            <div className="flex items-center">
              <div className={`w-4 h-4 rounded-full mr-3 ${
                startOdometer !== null ? 'bg-green-500' : 'bg-gray-300'
              }`}></div>
              <span className="text-gray-900">開始時走行距離</span>
            </div>
            <div className="flex items-center">
              {startOdometer !== null && (
                <span className="text-lg font-mono font-bold text-blue-600 mr-3">
                  {startOdometer.toLocaleString()} km
                </span>
              )}
              {!isStarted && (
                <input
                  type="number"
                  value={startOdometer !== null ? startOdometer.toString() : ''}
                  onChange={(e) => setStartOdometer(e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="走行距離"
                  className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              )}
            </div>
          </div>

          {/* 終了時走行距離 */}
          {isStarted && (
            <div className="flex items-center justify-between py-3 border-b">
              <div className="flex items-center">
                <div className={`w-4 h-4 rounded-full mr-3 ${
                  endOdometer !== null ? 'bg-green-500' : 'bg-gray-300'
                }`}></div>
                <span className="text-gray-900">終了時走行距離</span>
              </div>
              <div className="flex items-center">
                {endOdometer !== null && (
                  <span className="text-lg font-mono font-bold text-green-600 mr-3">
                    {endOdometer.toLocaleString()} km
                  </span>
                )}
                {!isCompleted && (
                  <input
                    type="number"
                    value={endOdometer !== null ? endOdometer.toString() : ''}
                    onChange={(e) => setEndOdometer(e.target.value ? parseInt(e.target.value) : null)}
                    placeholder="走行距離"
                    className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                )}
              </div>
            </div>
          )}

          {/* 終了時刻 */}
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center">
              <div className={`w-4 h-4 rounded-full mr-3 ${
                isCompleted ? 'bg-green-500' : 'bg-gray-300'
              }`}></div>
              <span className="text-gray-900">終了時刻</span>
            </div>
            <div className="flex items-center">
              {endTime && (
                <span className="text-lg font-mono font-bold text-green-600 mr-3">
                  {endTime}
                </span>
              )}
              {isStarted && !isCompleted && (
                <button
                  onClick={handleCompleteDelivery}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                >
                  完了
                </button>
              )}
            </div>
          </div>
        </div>

        {/* メモ */}
        {isStarted && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">メモ</h2>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              placeholder="配送に関するメモを入力してください..."
              disabled={isCompleted}
            />
            {/* オイル交換チェックボックス */}
            {isStarted && !isCompleted && (
              <div className="mt-4 flex items-center">
                <input
                  type="checkbox"
                  id="oil-change"
                  checked={oilChangeChecked}
                  onChange={(e) => setOilChangeChecked(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="oil-change" className="ml-2 text-gray-700">
                  オイル交換を実施した
                </label>
              </div>
            )}
          </div>
        )}

        {/* 完了メッセージ */}
        {isCompleted && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-green-800 font-medium">配送が完了しました</span>
            </div>
          </div>
        )}
      </div>

      {/* 走行距離入力モーダル */}
      {showOdometerInput && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              開始時の走行距離を入力
            </h2>
            
            <OdometerInput
              onSubmit={(odometer) => handleOdometerSubmit(odometer, 'start')}
              onCancel={() => setShowOdometerInput(false)}
              initialValue={startOdometer}
              lastOdometer={lastOdometer}
              type="start"
            />
          </div>
        </div>
      )}

      {/* 時間入力モーダル */}
      {showTimeInput && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {timeInputType === 'start' ? '開始時刻' : '終了時刻'}を入力
            </h2>
            
            <TimeInput
              onSubmit={handleTimeSubmit}
              onCancel={() => setShowTimeInput(false)}
              initialTime={currentTime}
              type={timeInputType}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// 時間入力コンポーネント
function TimeInput({ 
  onSubmit, 
  onCancel, 
  initialTime, 
  type 
}: { 
  onSubmit: (time: string) => void
  onCancel: () => void
  initialTime: string
  type: 'start' | 'end'
}) {
  const [time, setTime] = useState(initialTime)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(time)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          時刻を入力してください
        </label>
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-2xl font-mono text-center"
          required
        />
      </div>

      <div className="flex space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-gray-400 hover:bg-gray-500 text-white font-medium py-3 px-4 rounded-lg transition-colors"
        >
          キャンセル
        </button>
        <button
          type="submit"
          className={`flex-1 font-medium py-3 px-4 rounded-lg transition-colors ${
            type === 'start' 
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
        >
          {type === 'start' ? '開始記録' : '完了記録'}
        </button>
      </div>
    </form>
  )
}

// 走行距離入力コンポーネント
function OdometerInput({ 
  onSubmit, 
  onCancel, 
  initialValue, 
  lastOdometer,
  type 
}: { 
  onSubmit: (odometer: number) => void
  onCancel: () => void
  initialValue: number | null
  lastOdometer: number | null
  type: 'start' | 'end'
}) {
  const [odometer, setOdometer] = useState(initialValue?.toString() || '')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const value = parseInt(odometer)
    if (!isNaN(value) && value >= 0) {
      onSubmit(value)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          走行距離を入力してください (km)
        </label>
        {type === 'start' && lastOdometer !== null && (
          <p className="text-sm text-gray-600 mb-2">
            前回終了時: {lastOdometer.toLocaleString()} km
          </p>
        )}
        <input
          type="number"
          value={odometer}
          onChange={(e) => setOdometer(e.target.value)}
          className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-2xl font-mono text-center"
          placeholder="例: 45678"
          required
          min="0"
        />
      </div>

      <div className="flex space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-gray-400 hover:bg-gray-500 text-white font-medium py-3 px-4 rounded-lg transition-colors"
        >
          キャンセル
        </button>
        <button
          type="submit"
          className={`flex-1 font-medium py-3 px-4 rounded-lg transition-colors ${
            type === 'start' 
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
        >
          {type === 'start' ? '開始記録' : '完了記録'}
        </button>
      </div>
    </form>
  )
}