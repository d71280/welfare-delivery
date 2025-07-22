'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function TransportationCompleteContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [recordId, setRecordId] = useState<string | null>(null)
  const [transportationData, setTransportationData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const id = searchParams.get('recordId')
    if (id) {
      setRecordId(id)
      fetchTransportationData(id)
    } else {
      setIsLoading(false)
    }
  }, [searchParams])

  const fetchTransportationData = async (id: string) => {
    const supabase = createClient()
    try {
      const { data, error } = await supabase
        .from('transportation_records')
        .select(`
          *,
          drivers(name),
          vehicles(vehicle_no, vehicle_name),
          transportation_details(
            *,
            users(name, user_no),
            destinations(name, address)
          )
        `)
        .eq('id', id)
        .single()

      if (error) throw error
      setTransportationData(data)
    } catch (error) {
      console.error('Error fetching transportation data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleStartNewTransportation = () => {
    router.push('/login')
  }

  const handleViewHistory = () => {
    router.push('/driver-history')
  }

  const handleBackToHome = () => {
    router.push('/')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">データを読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      <div className="container mx-auto px-4 py-8">
        {/* 成功メッセージ */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🎉 送迎登録完了
          </h1>
          <p className="text-lg text-gray-600">
            送迎記録の登録が正常に完了しました
          </p>
        </div>

        {/* 登録内容の確認 */}
        {transportationData && (
          <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 border-b pb-2">
              📋 登録内容
            </h2>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">日付</label>
                  <p className="text-gray-900">{new Date(transportationData.transportation_date).toLocaleDateString('ja-JP')}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">送迎タイプ</label>
                  <p className="text-gray-900">
                    {transportationData.transportation_type === 'round_trip' ? '往復送迎' : 
                     transportationData.transportation_type === 'individual' ? '個別送迎' :
                     transportationData.transportation_type === 'medical' ? '医療送迎' :
                     transportationData.transportation_type === 'emergency' ? '緊急送迎' :
                     transportationData.transportation_type === 'outing' ? '外出送迎' : '通常送迎'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ドライバー</label>
                  <p className="text-gray-900">{transportationData.drivers?.name || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">車両</label>
                  <p className="text-gray-900">
                    {transportationData.vehicles?.vehicle_no} ({transportationData.vehicles?.vehicle_name})
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">乗車人数</label>
                <p className="text-gray-900">{transportationData.passenger_count || 0}名</p>
              </div>

              {transportationData.transportation_details && transportationData.transportation_details.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">利用者</label>
                  <div className="bg-gray-50 rounded p-3">
                    {transportationData.transportation_details.map((detail: any) => (
                      <div key={detail.id} className="flex justify-between items-center py-1">
                        <span className="text-gray-900">
                          {detail.users?.name} ({detail.users?.user_no})
                        </span>
                        <span className="text-sm text-gray-600">
                          → {detail.destinations?.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* アクションボタン */}
        <div className="max-w-2xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={handleStartNewTransportation}
              className="welfare-button welfare-button-primary text-center py-4"
            >
              <div className="flex flex-col items-center">
                <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="font-semibold">新しい送迎を開始</span>
                <span className="text-sm opacity-80">ログイン画面へ</span>
              </div>
            </button>

            <button
              onClick={handleViewHistory}
              className="welfare-button welfare-button-secondary text-center py-4"
            >
              <div className="flex flex-col items-center">
                <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-semibold">送迎履歴</span>
                <span className="text-sm opacity-80">過去の記録を確認</span>
              </div>
            </button>

            <button
              onClick={handleBackToHome}
              className="welfare-button welfare-button-outline text-center py-4"
            >
              <div className="flex flex-col items-center">
                <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span className="font-semibold">ホームに戻る</span>
                <span className="text-sm opacity-80">トップページへ</span>
              </div>
            </button>
          </div>
        </div>

        {/* 補足情報 */}
        <div className="max-w-2xl mx-auto mt-8 text-center">
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">📌 次の手順</h3>
            <div className="text-sm text-blue-800 space-y-1">
              <p>• 新しい送迎を開始する場合は「新しい送迎を開始」ボタンをクリック</p>
              <p>• 今回の送迎記録を確認したい場合は「送迎履歴」ボタンをクリック</p>
              <p>• システムを終了する場合は「ホームに戻る」ボタンをクリック</p>
            </div>
          </div>
        </div>

        {/* レコードID表示（開発/デバッグ用） */}
        {recordId && (
          <div className="max-w-2xl mx-auto mt-4 text-center">
            <p className="text-xs text-gray-400">
              記録ID: {recordId}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function TransportationCompletePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">ページを読み込み中...</p>
        </div>
      </div>
    }>
      <TransportationCompleteContent />
    </Suspense>
  )
}