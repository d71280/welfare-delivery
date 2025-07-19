'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { DeliveryRecord } from '@/types'

interface ReportData {
  totalDeliveries: number
  completedDeliveries: number
  inProgressDeliveries: number
  pendingDeliveries: number
  driverStats: {
    driver_id: string
    driver_name: string
    total_deliveries: number
    completed_deliveries: number
    completion_rate: number
  }[]
  vehicleStats: {
    vehicle_id: string
    vehicle_no: string
    total_deliveries: number
    completed_deliveries: number
    completion_rate: number
  }[]
  routeStats: {
    route_id: string
    route_name: string
    total_deliveries: number
    completed_deliveries: number
    completion_rate: number
  }[]
  monthlyData: {
    month: string
    total_deliveries: number
    completed_deliveries: number
  }[]
}

export default function ReportsPage() {
  const [reportData, setReportData] = useState<ReportData>({
    totalDeliveries: 0,
    completedDeliveries: 0,
    inProgressDeliveries: 0,
    pendingDeliveries: 0,
    driverStats: [],
    vehicleStats: [],
    routeStats: [],
    monthlyData: []
  })
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState('current_month')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // 管理者セッション確認
    const sessionData = localStorage.getItem('adminSession')
    if (!sessionData) {
      router.push('/admin/login')
      return
    }
    
    // 初期日付設定
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    
    setStartDate(firstDay.toISOString().split('T')[0])
    setEndDate(lastDay.toISOString().split('T')[0])
    
    fetchReportData()
  }, [router])

  const fetchReportData = async () => {
    try {
      setIsLoading(true)
      
      // 基本統計の取得
      const { data: allDeliveries } = await supabase
        .from('delivery_records')
        .select('*')
      
      const totalDeliveries = allDeliveries?.length || 0
      const completedDeliveries = allDeliveries?.filter(d => d.status === 'completed').length || 0
      const inProgressDeliveries = allDeliveries?.filter(d => d.status === 'in_progress').length || 0
      const pendingDeliveries = allDeliveries?.filter(d => d.status === 'pending').length || 0

      // ドライバー統計
      const { data: driverDeliveries } = await supabase
        .from('delivery_records')
        .select(`
          driver_id,
          status,
          drivers(name)
        `)
      
      const driverStats = processDriverStats((driverDeliveries || []) as unknown as DeliveryRecord[])

      // 車両統計
      const { data: vehicleDeliveries } = await supabase
        .from('delivery_records')
        .select(`
          vehicle_id,
          status,
          vehicles(vehicle_no)
        `)
      
      const vehicleStats = processVehicleStats((vehicleDeliveries || []) as unknown as DeliveryRecord[])

      // ルート統計
      const { data: routeDeliveries } = await supabase
        .from('delivery_records')
        .select(`
          route_id,
          status,
          routes(route_name)
        `)
      
      const routeStats = processRouteStats((routeDeliveries || []) as unknown as DeliveryRecord[])

      // 月別データ
      const monthlyData = processMonthlyData((allDeliveries || []) as unknown as DeliveryRecord[])

      setReportData({
        totalDeliveries,
        completedDeliveries,
        inProgressDeliveries,
        pendingDeliveries,
        driverStats,
        vehicleStats,
        routeStats,
        monthlyData
      })
    } catch (error) {
      console.error('レポートデータ取得エラー:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const processDriverStats = (data: DeliveryRecord[]) => {
    const stats: Record<string, {driver_id: string, driver_name: string, total_deliveries: number, completed_deliveries: number, completion_rate: number}> = {}
    
    data.forEach(item => {
      if (!item.driver_id) return
      
      if (!stats[item.driver_id]) {
        stats[item.driver_id] = {
          driver_id: item.driver_id,
          driver_name: (item as {drivers?: {name: string}}).drivers?.name || 'Unknown',
          total_deliveries: 0,
          completed_deliveries: 0,
          completion_rate: 0
        }
      }
      
      stats[item.driver_id].total_deliveries++
      if (item.status === 'completed') {
        stats[item.driver_id].completed_deliveries++
      }
    })
    
    return Object.values(stats).map((stat) => ({
      ...stat,
      completion_rate: stat.total_deliveries > 0 
        ? Math.round((stat.completed_deliveries / stat.total_deliveries) * 100)
        : 0
    }))
  }

  const processVehicleStats = (data: DeliveryRecord[]) => {
    const stats: Record<string, {vehicle_id: string, vehicle_no: string, total_deliveries: number, completed_deliveries: number, completion_rate: number}> = {}
    
    data.forEach(item => {
      if (!item.vehicle_id) return
      
      if (!stats[item.vehicle_id]) {
        stats[item.vehicle_id] = {
          vehicle_id: item.vehicle_id,
          vehicle_no: (item as {vehicles?: {vehicle_no: string}}).vehicles?.vehicle_no || 'Unknown',
          total_deliveries: 0,
          completed_deliveries: 0,
          completion_rate: 0
        }
      }
      
      stats[item.vehicle_id].total_deliveries++
      if (item.status === 'completed') {
        stats[item.vehicle_id].completed_deliveries++
      }
    })
    
    return Object.values(stats).map((stat) => ({
      ...stat,
      completion_rate: stat.total_deliveries > 0 
        ? Math.round((stat.completed_deliveries / stat.total_deliveries) * 100)
        : 0
    }))
  }

  const processRouteStats = (data: DeliveryRecord[]) => {
    const stats: Record<string, {route_id: string, route_name: string, total_deliveries: number, completed_deliveries: number, completion_rate: number}> = {}
    
    data.forEach(item => {
      if (!item.route_id) return
      
      if (!stats[item.route_id]) {
        stats[item.route_id] = {
          route_id: item.route_id,
          route_name: (item as {routes?: {route_name: string}}).routes?.route_name || 'Unknown',
          total_deliveries: 0,
          completed_deliveries: 0,
          completion_rate: 0
        }
      }
      
      stats[item.route_id].total_deliveries++
      if (item.status === 'completed') {
        stats[item.route_id].completed_deliveries++
      }
    })
    
    return Object.values(stats).map((stat) => ({
      ...stat,
      completion_rate: stat.total_deliveries > 0 
        ? Math.round((stat.completed_deliveries / stat.total_deliveries) * 100)
        : 0
    }))
  }

  const processMonthlyData = (data: DeliveryRecord[]) => {
    const monthlyStats: Record<string, {month: string, total_deliveries: number, completed_deliveries: number, completion_rate: number}> = {}
    
    data.forEach(item => {
      const month = new Date(item.delivery_date).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit' })
      
      if (!monthlyStats[month]) {
        monthlyStats[month] = {
          month,
          total_deliveries: 0,
          completed_deliveries: 0,
          completion_rate: 0
        }
      }
      
      monthlyStats[month].total_deliveries++
      if (item.status === 'completed') {
        monthlyStats[month].completed_deliveries++
      }
    })
    
    return Object.values(monthlyStats).sort((a, b) => a.month.localeCompare(b.month))
  }

  const exportToCsv = () => {
    const csvContent = [
      ['配送統計レポート'],
      [''],
      ['基本統計'],
      ['総配送数', reportData.totalDeliveries],
      ['完了', reportData.completedDeliveries],
      ['進行中', reportData.inProgressDeliveries],
      ['待機中', reportData.pendingDeliveries],
      [''],
      ['ドライバー別統計'],
      ['ドライバー名', '総配送数', '完了数', '完了率(%)'],
      ...reportData.driverStats.map(stat => [
        stat.driver_name,
        stat.total_deliveries,
        stat.completed_deliveries,
        stat.completion_rate
      ])
    ]
    
    const csvString = csvContent.map(row => row.join(',')).join('\n')
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    
    link.setAttribute('href', url)
    link.setAttribute('download', `delivery-report-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
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
        <div className="px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold text-gray-900">レポート</h1>
              <p className="text-sm text-gray-600">配送実績の確認とデータ出力</p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => router.push('/admin/dashboard')}
                className="text-gray-600 text-sm px-3 py-1 border border-gray-300 rounded hover:bg-gray-50"
              >
                ダッシュボードに戻る
              </button>
              <button
                onClick={exportToCsv}
                className="bg-green-600 text-white text-sm px-3 py-1 rounded hover:bg-green-700"
              >
                CSV出力
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* フィルター */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">フィルター</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  期間
                </label>
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="current_month">今月</option>
                  <option value="last_month">先月</option>
                  <option value="custom">カスタム</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  開始日
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  終了日
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 統計カード */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">総配送数</p>
                <p className="text-2xl font-bold text-gray-900">{reportData.totalDeliveries}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">完了</p>
                <p className="text-2xl font-bold text-gray-900">{reportData.completedDeliveries}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">進行中</p>
                <p className="text-2xl font-bold text-gray-900">{reportData.inProgressDeliveries}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-gray-100 rounded-lg">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">待機中</p>
                <p className="text-2xl font-bold text-gray-900">{reportData.pendingDeliveries}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ドライバー統計 */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">ドライバー別統計</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ドライバー名
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    総配送数
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    完了数
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    完了率
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reportData.driverStats.map((stat) => (
                  <tr key={stat.driver_id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {stat.driver_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {stat.total_deliveries}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {stat.completed_deliveries}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {stat.completion_rate}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {reportData.driverStats.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">データがありません</p>
              </div>
            )}
          </div>
        </div>

        {/* 車両統計 */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">車両別統計</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    車両番号
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    総配送数
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    完了数
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    完了率
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reportData.vehicleStats.map((stat) => (
                  <tr key={stat.vehicle_id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {stat.vehicle_no}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {stat.total_deliveries}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {stat.completed_deliveries}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {stat.completion_rate}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {reportData.vehicleStats.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">データがありません</p>
              </div>
            )}
          </div>
        </div>

        {/* ルート統計 */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">ルート別統計</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ルート名
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    総配送数
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    完了数
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    完了率
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reportData.routeStats.map((stat) => (
                  <tr key={stat.route_id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {stat.route_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {stat.total_deliveries}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {stat.completed_deliveries}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {stat.completion_rate}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {reportData.routeStats.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">データがありません</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}