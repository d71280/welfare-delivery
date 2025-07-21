'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface AdminSession {
  role: string
  username: string
  loginTime: string
}


interface RoutePerformance {
  routeId: string
  routeName: string
  monthlyAverageMinutes: number
  todayAverageMinutes: number
  deviation: number
  deviationPercentage: number
  deliveryCount: number
}

export default function AdminDashboardPage() {
  const [session, setSession] = useState<AdminSession | null>(null)
  const [routePerformances, setRoutePerformances] = useState<RoutePerformance[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // 管理者セッション確認
    const sessionData = localStorage.getItem('adminSession')
    if (!sessionData) {
      router.push('/admin/login')
      return
    }

    const parsedSession = JSON.parse(sessionData) as AdminSession
    setSession(parsedSession)

    // ダッシュボードデータ取得
    fetchDashboardData()
  }, [router])

  const fetchDashboardData = async () => {
    try {
      // ルートパフォーマンス分析を実行
      await fetchRoutePerformanceData()

    } catch (error) {
      console.error('ダッシュボードデータ取得エラー:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchRoutePerformanceData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const oneMonthAgo = new Date()
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)
      const monthAgo = oneMonthAgo.toISOString().split('T')[0]

      // 全ルートを取得
      const { data: routes } = await supabase
        .from('routes')
        .select('id, route_name')
        .eq('is_active', true)

      if (!routes) return

      const performances: RoutePerformance[] = await Promise.all(
        routes.map(async (route) => {
          // 今月の配送記録を取得
          const { data: monthlyData, error: monthlyError } = await supabase
            .from('transportation_records')
            .select(`
              *,
              start_time,
              end_time,
              transportation_details(
                pickup_time,
                drop_off_time,
                destinations(display_order)
              )
            `)
            .eq('route_id', route.id)
            .gte('transportation_date', monthAgo)
            .order('transportation_date', { ascending: false })

          console.log(`Monthly data for route ${route.route_name}:`, monthlyData)
          if (monthlyError) console.error('Monthly data error:', monthlyError)

          // 今日の配送記録を取得
          const { data: todayData, error: todayError } = await supabase
            .from('transportation_records')
            .select(`
              *,
              start_time,
              end_time,
              transportation_details(
                pickup_time,
                drop_off_time,
                destinations(display_order)
              )
            `)
            .eq('route_id', route.id)
            .eq('transportation_date', today)

          console.log(`Today's data for route ${route.route_name}:`, todayData)
          if (todayError) console.error('Today data error:', todayError)

          // 配送時間を計算する関数
          const calculateDeliveryTime = (record: {
            start_time?: string
            end_time?: string
            transportation_details?: Array<{
              pickup_time?: string
              drop_off_time?: string
              destinations?: { display_order?: number }
            }>
          }) => {
            console.log('calculateDeliveryTime called with record:', record)
            
            // まず、delivery_recordsテーブルのstart_timeとend_timeを使用
            if (record.start_time && record.end_time) {
              console.log('Found start_time and end_time:', record.start_time, record.end_time)
              
              // TIME形式 (HH:MM:SS) を今日の日付と組み合わせてDateオブジェクトを作成
              const today = new Date().toISOString().split('T')[0]
              const startTime = new Date(`${today}T${record.start_time}`)
              const endTime = new Date(`${today}T${record.end_time}`)
              
              console.log('Parsed times:', startTime, endTime)
              
              if (!isNaN(startTime.getTime()) && !isNaN(endTime.getTime())) {
                const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60)
                console.log('Calculated duration:', duration, 'minutes')
                return duration
              } else {
                console.log('Invalid time format')
              }
            } else {
              console.log('No start_time or end_time found')
            }
            
            // フォールバック：transportation_detailsから計算
            if (!record.transportation_details || record.transportation_details.length === 0) return 0
            
            const sortedDetails = record.transportation_details
              .filter((d) => d.pickup_time && d.drop_off_time)
              .sort((a, b) => (a.destinations?.display_order || 0) - (b.destinations?.display_order || 0))
            
            if (sortedDetails.length === 0) return 0
            
            const firstDetail = sortedDetails[0]
            const lastDetail = sortedDetails[sortedDetails.length - 1]
            
            if (!firstDetail.pickup_time || !lastDetail.drop_off_time) return 0
            
            // TIME型のデータを今日の日付と組み合わせてDateオブジェクトを作成
            const today = new Date().toISOString().split('T')[0]
            const startTime = new Date(`${today}T${firstDetail.pickup_time}`)
            const endTime = new Date(`${today}T${lastDetail.drop_off_time}`)
            
            // 時間が有効でない場合は0を返す
            if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) return 0
            
            return (endTime.getTime() - startTime.getTime()) / (1000 * 60) // 分単位
          }

          // 月間平均時間
          const monthlyTimes = monthlyData?.map(calculateDeliveryTime).filter(time => time > 0) || []
          const monthlyAverage = monthlyTimes.length > 0 
            ? monthlyTimes.reduce((sum, time) => sum + time, 0) / monthlyTimes.length 
            : 0

          // 今日の平均時間
          const todayTimes = todayData?.map(calculateDeliveryTime).filter(time => time > 0) || []
          const todayAverage = todayTimes.length > 0 
            ? todayTimes.reduce((sum, time) => sum + time, 0) / todayTimes.length 
            : 0

          // 乖離計算
          const deviation = todayAverage - monthlyAverage
          const deviationPercentage = monthlyAverage > 0 ? (deviation / monthlyAverage) * 100 : 0

          return {
            routeId: route.id,
            routeName: route.route_name,
            monthlyAverageMinutes: monthlyAverage,
            todayAverageMinutes: todayAverage,
            deviation,
            deviationPercentage,
            deliveryCount: todayData?.length || 0
          }
        })
      )

      setRoutePerformances(performances)
    } catch (error) {
      console.error('ルートパフォーマンスデータ取得エラー:', error)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('adminSession')
    router.push('/admin/login')
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

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-white shadow">
        <div className="px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                管理者ダッシュボード
              </h1>
              <p className="text-sm text-gray-600">
                ようこそ、{session.username}さん
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="text-red-600 text-sm px-3 py-1 border border-red-300 rounded hover:bg-red-50"
            >
              ログアウト
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">

        {/* メニューカード */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <button
            onClick={() => router.push('/admin/master/drivers')}
            className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow text-left"
          >
            <h3 className="text-lg font-medium text-gray-900 mb-2">ドライバー管理</h3>
            <p className="text-gray-600">ドライバー情報の登録・編集・削除</p>
          </button>

          <button
            onClick={() => router.push('/admin/master/vehicles')}
            className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow text-left"
          >
            <h3 className="text-lg font-medium text-gray-900 mb-2">車両管理</h3>
            <p className="text-gray-600">車両情報の登録・編集・削除</p>
          </button>

          <button
            onClick={() => router.push('/admin/master/routes')}
            className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow text-left"
          >
            <h3 className="text-lg font-medium text-gray-900 mb-2">ルート管理</h3>
            <p className="text-gray-600">配送ルートと配送先の管理</p>
          </button>

          <button
            onClick={() => router.push('/admin/master/users')}
            className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow text-left"
          >
            <h3 className="text-lg font-medium text-gray-900 mb-2">利用者管理</h3>
            <p className="text-gray-600">ご利用者様の情報管理</p>
          </button>

          <button
            onClick={() => router.push('/admin/transportation-records')}
            className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow text-left"
          >
            <h3 className="text-lg font-medium text-gray-900 mb-2">送迎記録</h3>
            <p className="text-gray-600">送迎記録の一覧と詳細確認</p>
          </button>

          <button
            onClick={() => router.push('/admin/reports')}
            className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow text-left"
          >
            <h3 className="text-lg font-medium text-gray-900 mb-2">レポート</h3>
            <p className="text-gray-600">月次レポートと統計情報</p>
          </button>
        </div>

        {/* ルートパフォーマンス分析 */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">ルートパフォーマンス分析</h2>
            <p className="text-sm text-gray-600 mt-1">月間平均配送時間と当日平均の乖離</p>
          </div>
          <div className="p-6">
            {routePerformances.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-900">ルート名</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-900">月間平均時間</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-900">当日実績</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-900">乖離</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-900">当日配送数</th>
                    </tr>
                  </thead>
                  <tbody>
                    {routePerformances.map((performance) => (
                      <tr key={performance.routeId} className="border-b border-gray-100">
                        <td className="py-3 px-4 font-medium">{performance.routeName}</td>
                        <td className="py-3 px-4 text-center font-mono">
                          {performance.monthlyAverageMinutes > 0 
                            ? `${Math.round(performance.monthlyAverageMinutes)}分`
                            : '-'}
                        </td>
                        <td className="py-3 px-4 text-center font-mono">
                          {performance.todayAverageMinutes > 0 
                            ? `${Math.round(performance.todayAverageMinutes)}分`
                            : '-'}
                        </td>
                        <td className="py-3 px-4 text-center font-mono">
                          {performance.monthlyAverageMinutes > 0 && performance.todayAverageMinutes > 0 
                            ? `${performance.deviation > 0 ? '+' : ''}${Math.round(performance.deviation)}分`
                            : '-'}
                        </td>
                        <td className="py-3 px-4 text-center font-medium text-blue-600">
                          {performance.deliveryCount}件
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">パフォーマンスデータがありません</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}