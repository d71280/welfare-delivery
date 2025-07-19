'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { DeliveryRecord, Driver, Vehicle, Route } from '@/types'

interface DeliveryRecordWithDetails extends DeliveryRecord {
  drivers?: { name: string }
  vehicles?: { vehicle_no: string }
  routes?: { route_name: string }
  start_time?: string | null
  end_time?: string | null
  delivery_details?: Array<{
    id: string
    delivery_record_id: string
    destination_id: string
    arrival_time: string | null
    departure_time: string | null
    has_invoice: boolean
    remarks: string | null
    time_slot: number | null
    destinations?: {
      id: string
      name: string
      address: string | null
      display_order: number
    }
  }>
}


export default function DeliveryRecordsPage() {
  const [records, setRecords] = useState<DeliveryRecordWithDetails[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedRecord, setSelectedRecord] = useState<DeliveryRecordWithDetails | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [filterDriver, setFilterDriver] = useState<string>('all')
  const [filterVehicle, setFilterVehicle] = useState<string>('all')
  const [filterRoute, setFilterRoute] = useState<string>('all')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [routes, setRoutes] = useState<Route[]>([])
  const [viewMode, setViewMode] = useState<'individual' | 'grouped'>('individual')
  
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // 管理者セッション確認
    const sessionData = localStorage.getItem('adminSession')
    if (!sessionData) {
      router.push('/admin/login')
      return
    }
    
    fetchRecords()
    fetchFilterData()
  }, [router, supabase])

  const handleTodayFilter = () => {
    const today = new Date().toISOString().split('T')[0]
    setFilterDateFrom(today)
    setFilterDateTo(today)
    setViewMode('individual')
  }

  // 日付範囲による表示モード自動切り替え
  useEffect(() => {
    if (filterDateFrom && filterDateTo) {
      const fromDate = new Date(filterDateFrom)
      const toDate = new Date(filterDateTo)
      const daysDiff = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24))
      
      if (daysDiff > 0) {
        setViewMode('grouped')
      } else {
        setViewMode('individual')
      }
    }
  }, [filterDateFrom, filterDateTo])

  const fetchFilterData = async () => {
    try {
      const [driversRes, vehiclesRes, routesRes] = await Promise.all([
        supabase.from('drivers').select('*').eq('is_active', true),
        supabase.from('vehicles').select('*').eq('is_active', true),
        supabase.from('routes').select('*').eq('is_active', true)
      ])

      if (driversRes.data) setDrivers(driversRes.data)
      if (vehiclesRes.data) setVehicles(vehiclesRes.data)
      if (routesRes.data) setRoutes(routesRes.data)
    } catch (error) {
      console.error('フィルターデータ取得エラー:', error)
    }
  }

  const fetchRecords = async () => {
    try {
      setIsLoading(true)
      console.log('配送記録を取得中...')
      
      const { data, error } = await supabase
        .from('delivery_records')
        .select(`
          *,
          drivers(name),
          vehicles(vehicle_no),
          routes(route_name),
          delivery_details(
            id,
            arrival_time,
            departure_time,
            destinations(
              id,
              name,
              address,
              display_order
            )
          )
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('配送記録取得エラー:', error)
        return
      }

      console.log('取得した配送記録:', data)
      console.log('配送記録の件数:', data?.length || 0)
      
      // 実データのみを表示
      const realData = data || []
      setRecords(realData)
      
      // 完了状態の記録を確認
      const completedRecords = realData.filter(record => record.status === 'completed')
      console.log('完了済み配送記録:', completedRecords.length, '件')
      
    } catch (error) {
      console.error('配送記録取得エラー:', error)
      // エラー時は空の配列を設定
      setRecords([])
    } finally {
      setIsLoading(false)
    }
  }


  const handleCSVExport = () => {
    // CSVヘッダー
    const headers = [
      '配送日',
      'ドライバー名',
      '車両番号',
      'ルート名',
      '配送開始時間',
      '配送終了時間',
      '所要時間',
      '配送件数',
      '開始走行距離',
      '終了走行距離',
      '走行距離',
      'ガソリンカード使用',
      'メモ'
    ]

    // CSVデータ作成
    const csvData = filteredRecords.map(record => {
      const { deliveryCount, startTime, endTime, duration } = calculateSummary(record)
      
      return [
        new Date(record.delivery_date).toLocaleDateString('ja-JP'),
        record.drivers?.name || '-',
        record.vehicles?.vehicle_no || '-',
        record.routes?.route_name || '-',
        startTime,
        endTime,
        duration,
        deliveryCount,
        record.start_odometer || '-',
        record.end_odometer || '-',
        record.start_odometer && record.end_odometer 
          ? record.end_odometer - record.start_odometer 
          : '-',
        record.gas_card_used ? 'はい' : 'いいえ',
        '-' // メモ欄は現在利用していない
      ]
    })

    // CSV文字列作成
    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n')

    // BOMを追加してExcelでの文字化けを防ぐ
    const bom = '\uFEFF'
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' })
    
    // ダウンロード
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    
    const date = new Date().toISOString().split('T')[0]
    link.setAttribute('download', `配送記録_${date}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleDelete = async (recordId: string) => {
    if (!confirm('この配送記録を削除してもよろしいですか？')) {
      return
    }

    try {
      // まず配送詳細を削除
      const { error: detailsError } = await supabase
        .from('delivery_details')
        .delete()
        .eq('delivery_record_id', recordId)

      if (detailsError) {
        console.error('配送詳細削除エラー:', detailsError)
        alert('配送詳細の削除に失敗しました')
        return
      }

      // 次に配送記録を削除
      const { error } = await supabase
        .from('delivery_records')
        .delete()
        .eq('id', recordId)

      if (error) {
        console.error('削除エラー:', error)
        alert('配送記録の削除に失敗しました')
        return
      }

      alert('配送記録を削除しました')
      fetchRecords()
    } catch (error) {
      console.error('削除エラー:', error)
      alert('削除処理中にエラーが発生しました')
    }
  }

  const handleViewDetails = (record: DeliveryRecordWithDetails) => {
    setSelectedRecord(record)
    setShowDetails(true)
  }


  const filteredRecords = records.filter(record => {
    const matchesDriver = filterDriver === 'all' || record.driver_id === filterDriver
    const matchesVehicle = filterVehicle === 'all' || record.vehicle_id === filterVehicle
    const matchesRoute = filterRoute === 'all' || record.route_id === filterRoute
    
    // 日付レンジフィルター
    let matchesDateRange = true
    if (filterDateFrom || filterDateTo) {
      const recordDate = record.delivery_date
      if (filterDateFrom && recordDate < filterDateFrom) {
        matchesDateRange = false
      }
      if (filterDateTo && recordDate > filterDateTo) {
        matchesDateRange = false
      }
    }
    
    return matchesDriver && matchesVehicle && matchesRoute && matchesDateRange
  })

  const calculateSummary = (record: DeliveryRecordWithDetails) => {
    const deliveryCount = record.delivery_details?.length || 0
    let startTime = record.start_time || '-'
    let endTime = record.end_time || '-'
    let duration = '-'
    
    console.log('calculateSummary called with record:', record.id)
    console.log('Raw start_time:', record.start_time)
    console.log('Raw end_time:', record.end_time)
    
    // start_timeとend_timeの表示形式を修正 (TIME形式: HH:MM:SS)
    if (record.start_time) {
      // TIME形式 (HH:MM:SS) から HH:MM 形式に変換
      const timeComponents = record.start_time.split(':')
      if (timeComponents.length >= 2) {
        startTime = `${timeComponents[0]}:${timeComponents[1]}`
      } else {
        startTime = record.start_time
      }
    }
    
    if (record.end_time) {
      // TIME形式 (HH:MM:SS) から HH:MM 形式に変換
      const timeComponents = record.end_time.split(':')
      if (timeComponents.length >= 2) {
        endTime = `${timeComponents[0]}:${timeComponents[1]}`
      } else {
        endTime = record.end_time
      }
    }
    
    // 配送詳細から時間を取得する場合
    if (record.delivery_details && record.delivery_details.length > 0) {
      const sortedDetails = [...record.delivery_details].sort((a, b) => 
        (a.destinations?.display_order || 0) - (b.destinations?.display_order || 0)
      )
      
      const firstArrival = sortedDetails[0]?.arrival_time
      const lastDeparture = sortedDetails[sortedDetails.length - 1]?.departure_time
      
      // 配送記録の時間が設定されていない場合は配送詳細から取得
      if (!record.start_time && firstArrival) {
        startTime = firstArrival
      }
      if (!record.end_time && lastDeparture) {
        endTime = lastDeparture
      }
    }
    
    // 所要時間を計算
    if (startTime !== '-' && endTime !== '-') {
      // 時間文字列を数値に変換（HH:MM 形式）
      const parseTime = (timeStr: string) => {
        const [hours, minutes] = timeStr.split(':').map(Number)
        return hours * 60 + minutes
      }
      
      const startMinutes = parseTime(startTime)
      const endMinutes = parseTime(endTime)
      
      let diffMinutes = endMinutes - startMinutes
      
      // 日をまたいでいる場合（終了時刻が開始時刻より小さい）
      if (diffMinutes < 0) {
        diffMinutes += 24 * 60 // 24時間加算
      }
      
      const hours = Math.floor(diffMinutes / 60)
      const minutes = diffMinutes % 60
      
      if (hours > 0) {
        duration = `${hours}時間${minutes}分`
      } else {
        duration = `${minutes}分`
      }
    }
    
    return { deliveryCount, startTime, endTime, duration }
  }

  // ルート毎にグループ化する関数
  interface GroupedRecord {
    routeId: string
    routeName: string
    records: DeliveryRecordWithDetails[]
  }

  const groupRecordsByRoute = (records: DeliveryRecordWithDetails[]): GroupedRecord[] => {
    const grouped = records.reduce((acc, record) => {
      const routeId = record.route_id
      const routeName = record.routes?.route_name || 'Unknown Route'
      
      if (!acc[routeId]) {
        acc[routeId] = {
          routeId,
          routeName,
          records: []
        }
      }
      
      acc[routeId].records.push(record)
      return acc
    }, {} as Record<string, GroupedRecord>)
    
    // 各ルートの記録を日付順でソート（新しい順）
    Object.values(grouped).forEach(group => {
      group.records.sort((a, b) => new Date(b.delivery_date).getTime() - new Date(a.delivery_date).getTime())
    })
    
    return Object.values(grouped).sort((a, b) => a.routeName.localeCompare(b.routeName))
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
    <>
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-white shadow">
        <div className="px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold text-gray-900">配送記録</h1>
              <p className="text-sm text-gray-600">配送記録の一覧と詳細確認</p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handleCSVExport}
                className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2 rounded-lg transition-colors"
              >
                CSV出力
              </button>
              <button
                onClick={() => router.push('/admin/dashboard')}
                className="text-gray-600 text-sm px-3 py-1 border border-gray-300 rounded hover:bg-gray-50"
              >
                ダッシュボードに戻る
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
            <div className="mb-4 flex space-x-2">
              <button
                onClick={handleTodayFilter}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                本日
              </button>
              <button
                onClick={fetchRecords}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
              >
                更新
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ドライバー名
                </label>
                <select
                  value={filterDriver}
                  onChange={(e) => setFilterDriver(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">すべて</option>
                  {drivers.map((driver) => (
                    <option key={driver.id} value={driver.id}>
                      {driver.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  車両番号
                </label>
                <select
                  value={filterVehicle}
                  onChange={(e) => setFilterVehicle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">すべて</option>
                  {vehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.vehicle_no}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ルート名
                </label>
                <select
                  value={filterRoute}
                  onChange={(e) => setFilterRoute(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">すべて</option>
                  {routes.map((route) => (
                    <option key={route.id} value={route.id}>
                      {route.route_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  配送日（開始）
                </label>
                <input
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="開始日"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  配送日（終了）
                </label>
                <input
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="終了日"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setFilterDriver('all')
                    setFilterVehicle('all')
                    setFilterRoute('all')
                    setFilterDateFrom('')
                    setFilterDateTo('')
                  }}
                  className="w-full px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                >
                  クリア
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 配送記録一覧 */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">
                配送記録一覧 ({filteredRecords.length}件)
              </h2>
              {filteredRecords.length > 0 && (
                <div className="text-sm text-gray-500">
                  表示モード: {viewMode === 'individual' ? '個別' : 'ルート別'}
                </div>
              )}
            </div>
          </div>
          
          {viewMode === 'individual' ? (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      日付
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ドライバー / 車両 / ルート
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      配送開始時間
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      配送終了時間
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      所要時間
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      配送件数
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredRecords.map((record) => {
                    const { deliveryCount, startTime, endTime, duration } = calculateSummary(record)
                    return (
                      <tr key={record.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(record.delivery_date).toLocaleDateString('ja-JP')}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          <div className="space-y-1">
                            <div className="font-medium text-gray-900">{record.drivers?.name || '-'}</div>
                            <div className="text-xs">{record.vehicles?.vehicle_no || '-'} / {record.routes?.route_name || '-'}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-mono">
                          {startTime}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-mono">
                          {endTime}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-bold text-purple-600">
                          {duration}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-bold text-blue-600">
                          {deliveryCount}件
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-center">
                          <button
                            onClick={() => handleViewDetails(record)}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                          >
                            詳細
                          </button>
                          <button
                            onClick={() => handleDelete(record.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            削除
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {filteredRecords.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500">配送記録がありません</p>
                </div>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {groupRecordsByRoute(filteredRecords).map((group) => (
                <div key={group.routeId} className="p-6">
                  <div className="mb-4">
                    <h3 className="text-lg font-medium text-gray-900">{group.routeName}</h3>
                    <p className="text-sm text-gray-500">{group.records.length}件の配送記録</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            日付
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            ドライバー / 車両
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            配送開始時間
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            配送終了時間
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            所要時間
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            配送件数
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            操作
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {group.records.map((record) => {
                          const { deliveryCount, startTime, endTime, duration } = calculateSummary(record)
                          return (
                            <tr key={record.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {new Date(record.delivery_date).toLocaleDateString('ja-JP')}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-500">
                                <div className="space-y-1">
                                  <div className="font-medium text-gray-900">{record.drivers?.name || '-'}</div>
                                  <div className="text-xs">{record.vehicles?.vehicle_no || '-'}</div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-mono">
                                {startTime}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-mono">
                                {endTime}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-bold text-purple-600">
                                {duration}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-bold text-blue-600">
                                {deliveryCount}件
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-center">
                                <button
                                  onClick={() => handleViewDetails(record)}
                                  className="text-blue-600 hover:text-blue-900 mr-3"
                                >
                                  詳細
                                </button>
                                <button
                                  onClick={() => handleDelete(record.id)}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  削除
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
              {filteredRecords.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500">配送記録がありません</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 配送ルート詳細 */}
        {filteredRecords.length > 0 && (
          <div className="bg-white rounded-lg shadow mt-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">
                配送ルート詳細
              </h2>
            </div>
            <div className="divide-y divide-gray-200">
              {filteredRecords.map((record) => {
                const sortedDetails = record.delivery_details ? 
                  [...record.delivery_details].sort((a, b) => 
                    (a.destinations?.display_order || 0) - (b.destinations?.display_order || 0)
                  ) : []

                return (
                  <div key={record.id} className="px-6 py-4">
                    <div className="mb-3">
                      <h3 className="text-md font-medium text-gray-900">
                        {new Date(record.delivery_date).toLocaleDateString('ja-JP')} - {record.drivers?.name} ({record.routes?.route_name})
                      </h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              順序
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              配送先
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              住所
                            </th>
                            <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                              到着時間
                            </th>
                            <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                              出発時間
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {sortedDetails.map((detail) => (
                            <tr key={detail.id}>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                {detail.destinations?.display_order || '-'}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                                {detail.destinations?.name || '-'}
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-500">
                                {detail.destinations?.address || '-'}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-center font-mono">
                                {detail.arrival_time || '-'}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-center font-mono">
                                {detail.departure_time || '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {sortedDetails.length === 0 && (
                        <div className="text-center py-4">
                          <p className="text-gray-500 text-sm">配送詳細情報がありません</p>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {filteredRecords.length === 0 && (
          <div className="bg-white rounded-lg shadow">
            <div className="text-center py-12">
              <p className="text-gray-500">配送記録がありません</p>
            </div>
          </div>
        )}
      </div>

      {/* 詳細モーダル */}
      {showDetails && selectedRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">配送記録詳細</h2>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-6">
              {/* 基本情報 */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">基本情報</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">配送日</label>
                    <p className="text-sm text-gray-900">{new Date(selectedRecord.delivery_date).toLocaleDateString('ja-JP')}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">ドライバー</label>
                    <p className="text-sm text-gray-900">{selectedRecord.drivers?.name || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">車両</label>
                    <p className="text-sm text-gray-900">{selectedRecord.vehicles?.vehicle_no || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">ルート</label>
                    <p className="text-sm text-gray-900">{selectedRecord.routes?.route_name || '-'}</p>
                  </div>
                </div>
              </div>

              {/* サマリー */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">サマリー</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <p className="text-sm font-medium text-blue-900">配送開始時間</p>
                    <p className="text-2xl font-bold text-blue-900">{calculateSummary(selectedRecord).startTime}</p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4">
                    <p className="text-sm font-medium text-purple-900">配送終了時間</p>
                    <p className="text-2xl font-bold text-purple-900">{calculateSummary(selectedRecord).endTime}</p>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-4">
                    <p className="text-sm font-medium text-yellow-900">所要時間</p>
                    <p className="text-2xl font-bold text-yellow-900">{calculateSummary(selectedRecord).duration}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <p className="text-sm font-medium text-green-900">配送件数</p>
                    <p className="text-2xl font-bold text-green-900">{calculateSummary(selectedRecord).deliveryCount}件</p>
                  </div>
                </div>
              </div>

              {/* 配送詳細 */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">配送ルート詳細</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          順序
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          配送先
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          住所
                        </th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          到着時間
                        </th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          出発時間
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedRecord.delivery_details && [...selectedRecord.delivery_details]
                        .sort((a, b) => (a.destinations?.display_order || 0) - (b.destinations?.display_order || 0))
                        .map((detail) => (
                          <tr key={detail.id}>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                              {detail.destinations?.display_order || '-'}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                              {detail.destinations?.name || '-'}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-500">
                              {detail.destinations?.address || '-'}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-center font-mono">
                              {detail.arrival_time || '-'}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-center font-mono">
                              {detail.departure_time || '-'}
                            </td>
                          </tr>
                        ))
                      }
                    </tbody>
                  </table>
                  {(!selectedRecord.delivery_details || selectedRecord.delivery_details.length === 0) && (
                    <div className="text-center py-8">
                      <p className="text-gray-500">配送ルート詳細情報がありません</p>
                    </div>
                  )}
                </div>
              </div>

              {/* その他の情報 */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">その他の情報</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">開始オドメーター</label>
                    <p className="text-sm text-gray-900">{selectedRecord.start_odometer || '-'} km</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">終了オドメーター</label>
                    <p className="text-sm text-gray-900">{selectedRecord.end_odometer || '-'} km</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">ガソリンカード使用</label>
                    <p className="text-sm text-gray-900">{selectedRecord.gas_card_used ? '使用' : '未使用'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">走行距離</label>
                    <p className="text-sm text-gray-900">
                      {selectedRecord.start_odometer && selectedRecord.end_odometer
                        ? `${selectedRecord.end_odometer - selectedRecord.start_odometer} km`
                        : '-'
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  )
}