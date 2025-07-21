'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { TransportationRecord, User } from '@/types'

interface DriverSession {
  driverId: string
  driverName: string
  vehicleId: string
  vehicleNo: string
  loginTime: string
  selectedUsers?: string[]
  userNames?: string
}

interface DeliveryItem {
  record: TransportationRecord
  user: User | null
}

export default function DriverPage() {
  const [session, setSession] = useState<DriverSession | null>(null)
  const [deliveries, setDeliveries] = useState<DeliveryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState('')
  const [editingTimes, setEditingTimes] = useState<{[key: string]: {arrival?: string, departure?: string}}>({})
  const [endOdometers, setEndOdometers] = useState<{[key: string]: number}>({})
  const [allCompleted, setAllCompleted] = useState(false)

  const router = useRouter()
  const supabase = createClient()

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

    // 今日の送迎記録を取得
    fetchTodayDeliveries(parsedSession.driverId)
  }, [router])

  const fetchTodayDeliveries = async (driverId: string) => {
    try {
      const today = new Date().toISOString().split('T')[0]
      
      const { data: records, error } = await supabase
        .from('transportation_records')
        .select('*')
        .eq('driver_id', driverId)
        .eq('transportation_date', today)
        .eq('transportation_type', 'individual')
        .order('created_at', { ascending: true })

      if (error) throw error

      // 各送迎記録に対応する利用者情報を取得
      const deliveryItems: DeliveryItem[] = []
      
      for (const record of records || []) {
        let user: User | null = null
        
        // special_notesから利用者IDを抽出
        if (record.special_notes) {
          const match = record.special_notes.match(/利用者ID: ([a-f0-9-]+)/)
          if (match) {
            const userId = match[1]
            try {
              const { data: userData } = await supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .single()
              
              user = userData
            } catch (userErr) {
              console.error('利用者取得エラー:', userErr)
            }
          }
        }
        
        deliveryItems.push({ record, user })
      }

      // 選択順序で並び替え（special_notesの番号を使用）
      deliveryItems.sort((a, b) => {
        const getOrderNumber = (notes: string | null) => {
          if (!notes) return 999
          const match = notes.match(/(\d+)番目/)
          return match ? parseInt(match[1]) : 999
        }
        return getOrderNumber(a.record.special_notes) - getOrderNumber(b.record.special_notes)
      })

      setDeliveries(deliveryItems)
      
      // 全ての送迎が完了しているかチェック
      const completed = deliveryItems.every(item => item.record.status === 'completed')
      setAllCompleted(completed)
    } catch (err) {
      console.error('送迎記録取得エラー:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleArrivalTime = async (recordId: string) => {
    const currentTimeStr = new Date().toTimeString().substring(0, 5)
    
    try {
      const { data, error } = await supabase
        .from('transportation_records')
        .update({
          arrival_time: currentTimeStr + ':00',
          status: 'in_progress',
          updated_at: new Date().toISOString()
        })
        .eq('id', recordId)
        .select()
        .single()

      if (error) throw error
      
      // 状態を更新
      setDeliveries(prev => 
        prev.map(item => 
          item.record.id === recordId 
            ? { ...item, record: { ...item.record, arrival_time: currentTimeStr + ':00', status: 'in_progress' }}
            : item
        )
      )
      
      alert('到着時刻を記録しました')
    } catch (err) {
      console.error('到着時刻記録エラー:', err)
      alert('到着時刻の記録に失敗しました')
    }
  }

  const handleDepartureTime = async (recordId: string) => {
    const currentTimeStr = new Date().toTimeString().substring(0, 5)
    
    try {
      const { data, error } = await supabase
        .from('transportation_records')
        .update({
          departure_time: currentTimeStr + ':00',
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', recordId)
        .select()
        .single()

      if (error) throw error
      
      // 状態を更新
      setDeliveries(prev => 
        prev.map(item => 
          item.record.id === recordId 
            ? { ...item, record: { ...item.record, departure_time: currentTimeStr + ':00', status: 'completed' }}
            : item
        )
      )
      
      // 全完了チェック
      const updatedDeliveries = deliveries.map(item => 
        item.record.id === recordId 
          ? { ...item, record: { ...item.record, status: 'completed' }}
          : item
      )
      const completed = updatedDeliveries.every(item => item.record.status === 'completed')
      setAllCompleted(completed)
      
      alert('出発時刻を記録しました')
    } catch (err) {
      console.error('出発時刻記録エラー:', err)
      alert('出発時刻の記録に失敗しました')
    }
  }

  const handleTimeEdit = async (recordId: string, type: 'arrival' | 'departure', time: string) => {
    try {
      const updateData = type === 'arrival' 
        ? { arrival_time: time + ':00' }
        : { departure_time: time + ':00' }

      const { data, error } = await supabase
        .from('transportation_records')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', recordId)
        .select()
        .single()

      if (error) throw error
      
      // 状態を更新
      setDeliveries(prev => 
        prev.map(item => 
          item.record.id === recordId 
            ? { ...item, record: { ...item.record, ...updateData }}
            : item
        )
      )
      
      // 編集状態をクリア
      setEditingTimes(prev => ({
        ...prev,
        [recordId]: {
          ...prev[recordId],
          [type]: undefined
        }
      }))
      
    } catch (err) {
      console.error('時刻更新エラー:', err)
      alert('時刻の更新に失敗しました')
    }
  }

  const handleCompleteAllDeliveries = async () => {
    if (!allCompleted) {
      alert('すべての送迎を完了してください')
      return
    }

    const finalOdometer = endOdometers['final']
    if (!finalOdometer) {
      alert('終了時走行距離を入力してください')
      return
    }

    try {
      // 車両の走行距離を更新
      if (session) {
        await supabase
          .from('vehicles')
          .update({
            current_odometer: finalOdometer,
            updated_at: new Date().toISOString()
          })
          .eq('id', session.vehicleId)
      }

      if (confirm('本日の送迎をすべて終了しますか？')) {
        alert('お疲れさまでした！送迎が完了しました。')
        // 必要に応じて追加の処理（ログアウトなど）
      }
    } catch (err) {
      console.error('車両走行距離更新エラー:', err)
      alert('車両走行距離の更新に失敗しました')
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs font-medium">待機中</span>
      case 'in_progress':
        return <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">送迎中</span>
      case 'completed':
        return <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">完了</span>
      default:
        return <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs font-medium">{status}</span>
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('driverSession')
    router.push('/login')
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-white shadow">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="text-center flex-1">
              <h1 className="text-lg font-medium text-gray-900">
                送迎管理
              </h1>
              {session && (
                <p className="text-sm text-gray-600">
                  {session.driverName} / {session.vehicleNo}
                </p>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                {currentTime}
              </div>
              <button
                onClick={handleLogout}
                className="text-red-600 text-sm font-medium"
              >
                ログアウト
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="p-4 max-w-4xl mx-auto">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-2">今日の送迎一覧</h2>
          <p className="text-gray-600 text-sm">
            {new Date().toLocaleDateString('ja-JP', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              weekday: 'long' 
            })}
          </p>
        </div>

        {deliveries.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">送迎予定がありません</h3>
            <p className="text-gray-600">本日の送迎はすべて完了しているか、まだ送迎が登録されていません。</p>
          </div>
        ) : (
          <>
            <div className="space-y-6">
              {deliveries.map((delivery) => (
                <div
                  key={delivery.record.id}
                  className="bg-white rounded-lg shadow p-6"
                >
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {delivery.user ? delivery.user.name : '利用者不明'}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {delivery.user ? `利用者番号: ${delivery.user.user_no}` : ''}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(delivery.record.status)}
                  </div>

                  {/* 到着・出発時刻 */}
                  <div className="grid grid-cols-2 gap-6 mb-6">
                    <div>
                      <span className="text-sm font-medium text-gray-700 block mb-2">到着時刻:</span>
                      {delivery.record.arrival_time ? (
                        <div className="flex items-center space-x-2">
                          {editingTimes[delivery.record.id]?.arrival !== undefined ? (
                            <>
                              <input
                                type="time"
                                value={editingTimes[delivery.record.id]?.arrival || delivery.record.arrival_time?.substring(0, 5) || ''}
                                onChange={(e) => setEditingTimes(prev => ({
                                  ...prev,
                                  [delivery.record.id]: {
                                    ...prev[delivery.record.id],
                                    arrival: e.target.value
                                  }
                                }))}
                                className="px-2 py-1 border rounded text-sm"
                              />
                              <button
                                onClick={() => handleTimeEdit(delivery.record.id, 'arrival', editingTimes[delivery.record.id]?.arrival || '')}
                                className="text-blue-600 text-sm"
                              >
                                保存
                              </button>
                              <button
                                onClick={() => setEditingTimes(prev => ({
                                  ...prev,
                                  [delivery.record.id]: { ...prev[delivery.record.id], arrival: undefined }
                                }))}
                                className="text-gray-600 text-sm"
                              >
                                キャンセル
                              </button>
                            </>
                          ) : (
                            <>
                              <span className="font-mono text-lg font-bold text-blue-600">
                                {delivery.record.arrival_time?.substring(0, 5)}
                              </span>
                              <button
                                onClick={() => setEditingTimes(prev => ({
                                  ...prev,
                                  [delivery.record.id]: {
                                    ...prev[delivery.record.id],
                                    arrival: delivery.record.arrival_time?.substring(0, 5) || ''
                                  }
                                }))}
                                className="text-gray-500 text-sm underline"
                              >
                                修正
                              </button>
                            </>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => handleArrivalTime(delivery.record.id)}
                          className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
                        >
                          到着記録
                        </button>
                      )}
                    </div>

                    <div>
                      <span className="text-sm font-medium text-gray-700 block mb-2">出発時刻:</span>
                      {delivery.record.departure_time ? (
                        <div className="flex items-center space-x-2">
                          {editingTimes[delivery.record.id]?.departure !== undefined ? (
                            <>
                              <input
                                type="time"
                                value={editingTimes[delivery.record.id]?.departure || delivery.record.departure_time?.substring(0, 5) || ''}
                                onChange={(e) => setEditingTimes(prev => ({
                                  ...prev,
                                  [delivery.record.id]: {
                                    ...prev[delivery.record.id],
                                    departure: e.target.value
                                  }
                                }))}
                                className="px-2 py-1 border rounded text-sm"
                              />
                              <button
                                onClick={() => handleTimeEdit(delivery.record.id, 'departure', editingTimes[delivery.record.id]?.departure || '')}
                                className="text-blue-600 text-sm"
                              >
                                保存
                              </button>
                              <button
                                onClick={() => setEditingTimes(prev => ({
                                  ...prev,
                                  [delivery.record.id]: { ...prev[delivery.record.id], departure: undefined }
                                }))}
                                className="text-gray-600 text-sm"
                              >
                                キャンセル
                              </button>
                            </>
                          ) : (
                            <>
                              <span className="font-mono text-lg font-bold text-green-600">
                                {delivery.record.departure_time?.substring(0, 5)}
                              </span>
                              <button
                                onClick={() => setEditingTimes(prev => ({
                                  ...prev,
                                  [delivery.record.id]: {
                                    ...prev[delivery.record.id],
                                    departure: delivery.record.departure_time?.substring(0, 5) || ''
                                  }
                                }))}
                                className="text-gray-500 text-sm underline"
                              >
                                修正
                              </button>
                            </>
                          )}
                        </div>
                      ) : delivery.record.arrival_time ? (
                        <button
                          onClick={() => handleDepartureTime(delivery.record.id)}
                          className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700"
                        >
                          出発記録
                        </button>
                      ) : (
                        <span className="text-gray-500 text-sm">到着記録後に入力可能</span>
                      )}
                    </div>
                  </div>

                  {/* 利用者情報 */}
                  {delivery.user && (
                    <div className="border-t pt-4">
                      <div className="grid grid-cols-1 gap-2">
                        <div>
                          <span className="text-sm text-gray-600">住所:</span>
                          <p className="text-sm">{delivery.user.address}</p>
                        </div>
                        {delivery.user.wheelchair_user && (
                          <div className="flex items-center">
                            <svg className="w-4 h-4 text-orange-600 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-sm text-orange-600 font-medium">車椅子利用</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                </div>
              ))}
            </div>

            {/* 送迎終了ボタン */}
            <div className="mt-8 bg-white rounded-lg shadow p-6">
              <div className="mb-6">
                <label className="block text-lg font-medium text-gray-700 mb-3">
                  終了時走行距離 (km)
                </label>
                <input
                  type="number"
                  value={endOdometers['final'] || ''}
                  onChange={(e) => setEndOdometers(prev => ({
                    ...prev,
                    final: parseInt(e.target.value) || 0
                  }))}
                  placeholder="終了時走行距離を入力"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <button
                onClick={handleCompleteAllDeliveries}
                disabled={!allCompleted || !endOdometers['final']}
                className={`w-full py-4 rounded-lg font-medium text-lg transition-colors ${
                  allCompleted && endOdometers['final']
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {allCompleted ? '本日の送迎を終了する' : `送迎完了待ち (${deliveries.filter(d => d.record.status === 'completed').length}/${deliveries.length})`}
              </button>
              {!allCompleted && (
                <p className="text-sm text-gray-600 text-center mt-2">
                  すべての利用者の送迎を完了してから終了してください
                </p>
              )}
              {!endOdometers['final'] && (
                <p className="text-sm text-gray-600 text-center mt-2">
                  終了時走行距離を入力してください
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}