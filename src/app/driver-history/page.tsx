'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function DriverHistoryPage() {
  const router = useRouter()
  const supabase = createClient()
  const [managementCode, setManagementCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [records, setRecords] = useState<any[]>([])
  const [showRecords, setShowRecords] = useState(false)

  const handleSearch = async () => {
    if (!managementCode.trim()) {
      alert('管理コードを入力してください')
      return
    }

    setIsLoading(true)
    try {
      // 管理コードで送迎記録を検索
      const { data, error } = await supabase
        .from('transportation_records')
        .select(`
          *,
          drivers(name),
          vehicles(vehicle_no, vehicle_name),
          transportation_details(
            *,
            users(*)
          )
        `)
        .eq('management_code_id', managementCode)
        .order('transportation_date', { ascending: false })

      if (error) {
        console.error('送迎記録検索エラー:', error)
        alert('送迎記録の検索に失敗しました')
        return
      }

      if (!data || data.length === 0) {
        alert('指定された管理コードの送迎記録が見つかりません')
        return
      }

      setRecords(data)
      setShowRecords(true)
    } catch (error) {
      console.error('検索エラー:', error)
      alert('検索中にエラーが発生しました')
    } finally {
      setIsLoading(false)
    }
  }

  const handleBack = () => {
    if (showRecords) {
      setShowRecords(false)
      setRecords([])
    } else {
      router.back()
    }
  }

  if (showRecords) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
        <div className="container mx-auto px-4 py-6">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-gray-900">送迎履歴</h1>
              <button
                onClick={handleBack}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                ← 戻る
              </button>
            </div>

            <div className="mb-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-blue-800">
                <strong>管理コード:</strong> {managementCode}
              </p>
              <p className="text-blue-800">
                <strong>検索結果:</strong> {records.length}件の送迎記録
              </p>
            </div>

            <div className="space-y-4">
              {records.map((record, index) => (
                <div key={record.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-lg">
                        送迎記録 #{index + 1}
                      </h3>
                      <p className="text-gray-600">
                        {new Date(record.transportation_date).toLocaleDateString('ja-JP')}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      record.status === 'completed' 
                        ? 'bg-green-100 text-green-800'
                        : record.status === 'in_progress'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {record.status === 'completed' ? '完了' : 
                       record.status === 'in_progress' ? '進行中' : '待機中'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-600">ドライバー</p>
                      <p className="font-medium">{record.drivers?.name || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">車両</p>
                      <p className="font-medium">{record.vehicles?.vehicle_no || '-'} ({record.vehicles?.vehicle_name || '-'})</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">乗車人数</p>
                      <p className="font-medium">{record.passenger_count || 0}名</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">走行距離</p>
                      <p className="font-medium">
                        {record.start_odometer && record.end_odometer 
                          ? `${record.end_odometer - record.start_odometer}km`
                          : '-'
                        }
                      </p>
                    </div>
                  </div>

                  {record.transportation_details && record.transportation_details.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">利用者詳細</h4>
                      <div className="bg-gray-50 rounded p-3">
                        {record.transportation_details.map((detail: any, detailIndex: number) => (
                          <div key={detail.id} className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
                            <div>
                              <span className="font-medium">{detail.users?.name || '-'}</span>
                              <span className="text-sm text-gray-600 ml-2">({detail.users?.user_no || '-'})</span>
                            </div>
                            <div className="text-sm text-gray-600">
                              {detail.arrival_time && (
                                <span className="mr-2">到着: {detail.arrival_time.substring(0, 5)}</span>
                              )}
                              {detail.departure_time && (
                                <span>出発: {detail.departure_time.substring(0, 5)}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-gray-900">送迎履歴検索</h1>
              <button
                onClick={handleBack}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                ← 戻る
              </button>
            </div>

            <div className="mb-6">
              <label className="block text-lg font-medium text-gray-700 mb-3">
                管理コード
              </label>
              <input
                type="text"
                value={managementCode}
                onChange={(e) => setManagementCode(e.target.value)}
                placeholder="管理コードを入力してください"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !isLoading) {
                    handleSearch()
                  }
                }}
              />
            </div>

            <button
              onClick={handleSearch}
              disabled={isLoading || !managementCode.trim()}
              className={`w-full py-3 rounded-lg font-medium text-lg transition-colors ${
                isLoading || !managementCode.trim()
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isLoading ? '検索中...' : '送迎履歴を検索'}
            </button>

            <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
              <h3 className="font-semibold text-yellow-800 mb-2">📋 使用方法</h3>
              <div className="text-sm text-yellow-700 space-y-1">
                <p>• 送迎記録の管理コードを入力してください</p>
                <p>• 管理コードは送迎登録時に発行されます</p>
                <p>• 該当する送迎記録の履歴が表示されます</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}