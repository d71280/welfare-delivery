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

    // 今日の配送記録を取得
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

      // 各配送記録に対応する利用者情報を取得
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

      setDeliveries(deliveryItems)
    } catch (err) {
      console.error('配送記録取得エラー:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs font-medium">待機中</span>
      case 'in_progress':
        return <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">配送中</span>
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
                配送管理
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
          <h2 className="text-xl font-bold text-gray-900 mb-2">今日の配送一覧</h2>
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
            <h3 className="text-lg font-medium text-gray-900 mb-2">配送予定がありません</h3>
            <p className="text-gray-600">本日の配送はすべて完了しているか、まだ配送が登録されていません。</p>
          </div>
        ) : (
          <div className="space-y-4">
            {deliveries.map((delivery) => (
              <div
                key={delivery.record.id}
                className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => router.push(`/driver/delivery/${delivery.record.id}`)}
              >
                <div className="flex items-center justify-between mb-4">
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

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <span className="text-sm text-gray-600">開始時刻:</span>
                    <p className="font-medium">
                      {delivery.record.start_time 
                        ? delivery.record.start_time.substring(0, 5)
                        : '未設定'
                      }
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">終了時刻:</span>
                    <p className="font-medium">
                      {delivery.record.end_time 
                        ? delivery.record.end_time.substring(0, 5)
                        : '未設定'
                      }
                    </p>
                  </div>
                </div>

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

                <div className="mt-4 text-right">
                  <span className="text-blue-600 text-sm font-medium">詳細を見る →</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}