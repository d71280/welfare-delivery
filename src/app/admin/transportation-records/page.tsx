'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { TransportationRecord, Driver, Vehicle, Route } from '@/types'

interface TransportationRecordWithDetails extends TransportationRecord {
  drivers?: { name: string }
  vehicles?: { vehicle_no: string, vehicle_name: string }
  routes?: { route_name: string }
  transportation_details?: Array<{
    id: string
    transportation_record_id: string
    user_id: string | null
    destination_id: string
    pickup_time: string | null
    arrival_time: string | null
    departure_time: string | null
    drop_off_time: string | null
    health_condition: string | null
    behavior_notes: string | null
    assistance_required: string | null
    remarks: string | null
    destinations?: {
      id: string
      name: string
      address: string | null
      destination_type: string
      display_order: number
    }
    users?: {
      id: string
      name: string
      user_no: string
      wheelchair_user: boolean
    }
  }>
}

export default function TransportationRecordsPage() {
  const [records, setRecords] = useState<TransportationRecordWithDetails[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedRecord, setSelectedRecord] = useState<TransportationRecordWithDetails | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [filterDriver, setFilterDriver] = useState<string>('all')
  const [filterVehicle, setFilterVehicle] = useState<string>('all')
  const [filterRoute, setFilterRoute] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [routes, setRoutes] = useState<Route[]>([])
  
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
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
  }

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
      
      const { data, error } = await supabase
        .from('transportation_records')
        .select(`
          *,
          drivers(name),
          vehicles(vehicle_no, vehicle_name),
          routes(route_name),
          transportation_details(
            id,
            user_id,
            pickup_time,
            arrival_time,
            departure_time,
            drop_off_time,
            health_condition,
            behavior_notes,
            assistance_required,
            remarks,
            destinations(
              id,
              name,
              address,
              destination_type,
              display_order
            ),
            users(
              id,
              name,
              user_no,
              wheelchair_user
            )
          )
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('送迎記録取得エラー:', error)
        return
      }

      setRecords(data || [])
    } catch (error) {
      console.error('送迎記録取得エラー:', error)
      setRecords([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleCSVExport = () => {
    const headers = [
      '送迎日',
      'ドライバー名',
      '車両番号',
      '車両名',
      'ルート名',
      '送迎タイプ',
      '乗車人数',
      '開始走行距離',
      '終了走行距離',
      '走行距離',
      '天候',
      '特記事項'
    ]

    const csvData = filteredRecords.map(record => {
      return [
        new Date((record as any).transportation_date).toLocaleDateString('ja-JP'),
        record.drivers?.name || '-',
        record.vehicles?.vehicle_no || '-',
        record.vehicles?.vehicle_name || '-',
        record.routes?.route_name || '-',
        getTransportationTypeLabel((record as any).transportation_type),
        (record as any).passenger_count || '-',
        (record as any).start_odometer || '-',
        (record as any).end_odometer || '-',
        (record as any).start_odometer && (record as any).end_odometer 
          ? (record as any).end_odometer - (record as any).start_odometer 
          : '-',
        (record as any).weather_condition || '-',
        (record as any).special_notes || '-'
      ]
    })

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n')

    const bom = '\uFEFF'
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' })
    
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    
    const date = new Date().toISOString().split('T')[0]
    link.setAttribute('download', `送迎記録_${date}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleDelete = async (recordId: string) => {
    if (!confirm('この送迎記録を削除してもよろしいですか？')) {
      return
    }

    try {
      const { error: detailsError } = await supabase
        .from('transportation_details')
        .delete()
        .eq('transportation_record_id', recordId)

      if (detailsError) {
        console.error('送迎詳細削除エラー:', detailsError)
        alert('送迎詳細の削除に失敗しました')
        return
      }

      const { error } = await supabase
        .from('transportation_records')
        .delete()
        .eq('id', recordId)

      if (error) {
        console.error('削除エラー:', error)
        alert('送迎記録の削除に失敗しました')
        return
      }

      alert('送迎記録を削除しました')
      fetchRecords()
    } catch (error) {
      console.error('削除エラー:', error)
      alert('削除処理中にエラーが発生しました')
    }
  }

  const handleViewDetails = (record: TransportationRecordWithDetails) => {
    setSelectedRecord(record)
    setShowDetails(true)
  }

  const getTransportationTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      regular: '通所支援',
      medical: '医療送迎',
      emergency: '緊急送迎',
      outing: '外出支援'
    }
    return types[type] || type
  }

  const getDestinationTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      home: '自宅',
      facility: '施設',
      medical: '医療機関',
      other: 'その他'
    }
    return types[type] || type
  }

  const filteredRecords = records.filter(record => {
    const matchesDriver = filterDriver === 'all' || (record as any).driver_id === filterDriver
    const matchesVehicle = filterVehicle === 'all' || (record as any).vehicle_id === filterVehicle
    const matchesRoute = filterRoute === 'all' || (record as any).route_id === filterRoute
    const matchesType = filterType === 'all' || (record as any).transportation_type === filterType
    
    let matchesDateRange = true
    if (filterDateFrom || filterDateTo) {
      const recordDate = (record as any).transportation_date
      if (filterDateFrom && recordDate < filterDateFrom) {
        matchesDateRange = false
      }
      if (filterDateTo && recordDate > filterDateTo) {
        matchesDateRange = false
      }
    }
    
    return matchesDriver && matchesVehicle && matchesRoute && matchesType && matchesDateRange
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-200 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">送迎記録を読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-200">
        {/* 統一ヘッダー */}
        <div className="welfare-header">
          <div className="welfare-header-content">
            <div className="welfare-header-title">
              <div className="welfare-header-icon">📊</div>
              <div className="welfare-header-text">
                <h1>送迎記録</h1>
                <p>送迎記録の一覧と詳細確認</p>
              </div>
            </div>
            <div className="welfare-nav-buttons">
              <button
                onClick={handleCSVExport}
                className="welfare-button welfare-button-secondary"
              >
                📈 CSV出力
              </button>
              <a href="/admin/dashboard" className="welfare-button welfare-button-outline">
                🏠 ダッシュボード
              </a>
            </div>
          </div>
        </div>

        <div className="welfare-content">
          {/* フィルター */}
          <div className="welfare-section">
            <h2 className="welfare-section-title">
              🔍 フィルター検索
            </h2>
            
            <div className="mb-6 flex gap-4">
              <button
                onClick={handleTodayFilter}
                className="welfare-button welfare-button-primary"
              >
                📅 本日
              </button>
              <button
                onClick={fetchRecords}
                className="welfare-button welfare-button-secondary"
              >
                🔄 更新
              </button>
            </div>
            
            <div className="welfare-filter-container">
              <div className="welfare-filter-grid">
                <div className="welfare-filter-item">
                  <label>🚗 ドライバー名</label>
                  <select
                    value={filterDriver}
                    onChange={(e) => setFilterDriver(e.target.value)}
                    className="welfare-select"
                  >
                    <option value="all">すべて</option>
                    {drivers.map((driver) => (
                      <option key={driver.id} value={driver.id}>
                        {driver.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="welfare-filter-item">
                  <label>🚐 車両</label>
                  <select
                    value={filterVehicle}
                    onChange={(e) => setFilterVehicle(e.target.value)}
                    className="welfare-select"
                  >
                    <option value="all">すべて</option>
                    {vehicles.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.vehicle_no}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="welfare-filter-item">
                  <label>🛣️ ルート名</label>
                  <select
                    value={filterRoute}
                    onChange={(e) => setFilterRoute(e.target.value)}
                    className="welfare-select"
                  >
                    <option value="all">すべて</option>
                    {routes.map((route) => (
                      <option key={route.id} value={route.id}>
                        {route.route_name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="welfare-filter-item">
                  <label>👥 送迎タイプ</label>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="welfare-select"
                  >
                    <option value="all">すべて</option>
                    <option value="regular">通所支援</option>
                    <option value="medical">医療送迎</option>
                    <option value="emergency">緊急送迎</option>
                    <option value="outing">外出支援</option>
                  </select>
                </div>
                
                <div className="welfare-filter-item">
                  <label>📅 送迎日（開始）</label>
                  <input
                    type="date"
                    value={filterDateFrom}
                    onChange={(e) => setFilterDateFrom(e.target.value)}
                    className="welfare-input"
                  />
                </div>
                
                <div className="welfare-filter-item">
                  <label>📅 送迎日（終了）</label>
                  <input
                    type="date"
                    value={filterDateTo}
                    onChange={(e) => setFilterDateTo(e.target.value)}
                    className="welfare-input"
                  />
                </div>
                
                <div className="welfare-filter-item flex items-end">
                  <button
                    onClick={() => {
                      setFilterDriver('all')
                      setFilterVehicle('all')
                      setFilterRoute('all')
                      setFilterType('all')
                      setFilterDateFrom('')
                      setFilterDateTo('')
                    }}
                    className="welfare-button welfare-button-outline w-full"
                  >
                    🗑️ クリア
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 送迎記録一覧 */}
          <div className="welfare-section">
            <h2 className="welfare-section-title">
              📊 送迎記録一覧 ({filteredRecords.length}件)
            </h2>
            
            {filteredRecords.length === 0 ? (
              <div className="welfare-empty-state">
                <div className="welfare-empty-icon">📊</div>
                <h3 className="welfare-empty-title">送迎記録がありません</h3>
                <p className="welfare-empty-description">フィルター条件を変更して再度検索してください</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="welfare-table">
                  <thead>
                    <tr>
                      <th>日付</th>
                      <th>ドライバー / 車両 / ルート</th>
                      <th>送迎タイプ</th>
                      <th>乗車人数</th>
                      <th>走行距離</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.map((record) => (
                      <tr key={(record as any).id}>
                        <td className="text-center">
                          <span className="welfare-badge bg-blue-100 text-blue-800">
                            📅 {new Date((record as any).transportation_date).toLocaleDateString('ja-JP')}
                          </span>
                        </td>
                        <td>
                          <div className="space-y-1">
                            <div className="font-medium text-gray-900">🚗 {record.drivers?.name || '-'}</div>
                            <div className="text-sm text-gray-500">🚐 {record.vehicles?.vehicle_no || '-'} / 🛣️ {record.routes?.route_name || '-'}</div>
                          </div>
                        </td>
                        <td className="text-center">
                          {(record as any).transportation_type === 'regular' && (
                            <span className="welfare-badge bg-green-100 text-green-800">🏠 通所支援</span>
                          )}
                          {(record as any).transportation_type === 'medical' && (
                            <span className="medical-badge">🏥 医療送迎</span>
                          )}
                          {(record as any).transportation_type === 'emergency' && (
                            <span className="welfare-badge bg-red-100 text-red-800">🚨 緊急送迎</span>
                          )}
                          {(record as any).transportation_type === 'outing' && (
                            <span className="assistance-badge">🌅 外出支援</span>
                          )}
                        </td>
                        <td className="text-center">
                          <span className="welfare-badge bg-purple-100 text-purple-800">
                            👥 {(record as any).passenger_count || 0}人
                          </span>
                        </td>
                        <td className="text-center">
                          {(record as any).start_odometer && (record as any).end_odometer ? (
                            <span className="welfare-badge bg-yellow-100 text-yellow-800">
                              🚗 {(record as any).end_odometer - (record as any).start_odometer}km
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleViewDetails(record)}
                              className="welfare-button welfare-button-outline text-sm px-3 py-1"
                            >
                              🔍
                            </button>
                            <button
                              onClick={() => handleDelete((record as any).id)}
                              className="welfare-button welfare-button-danger text-sm px-3 py-1"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* 詳細モーダル */}
        {showDetails && selectedRecord && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-6xl w-full mx-4 max-h-screen overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">送迎記録詳細</h2>
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
                      <label className="block text-sm font-medium text-gray-700">送迎日</label>
                      <p className="text-sm text-gray-900">{new Date((selectedRecord as any).transportation_date).toLocaleDateString('ja-JP')}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">ドライバー</label>
                      <p className="text-sm text-gray-900">{selectedRecord.drivers?.name || '-'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">車両</label>
                      <p className="text-sm text-gray-900">{selectedRecord.vehicles?.vehicle_no || '-'} ({selectedRecord.vehicles?.vehicle_name || '-'})</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">ルート</label>
                      <p className="text-sm text-gray-900">{selectedRecord.routes?.route_name || '-'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">送迎タイプ</label>
                      <p className="text-sm text-gray-900">{getTransportationTypeLabel((selectedRecord as any).transportation_type)}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">乗車人数</label>
                      <p className="text-sm text-gray-900">{(selectedRecord as any).passenger_count || 0}人</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">天候</label>
                      <p className="text-sm text-gray-900">{(selectedRecord as any).weather_condition || '-'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">走行距離</label>
                      <p className="text-sm text-gray-900">
                        {(selectedRecord as any).start_odometer && (selectedRecord as any).end_odometer
                          ? `${(selectedRecord as any).end_odometer - (selectedRecord as any).start_odometer}km`
                          : '-'
                        }
                      </p>
                    </div>
                  </div>
                  {(selectedRecord as any).special_notes && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700">特記事項</label>
                      <p className="text-sm text-gray-900 bg-yellow-50 p-3 rounded">{(selectedRecord as any).special_notes}</p>
                    </div>
                  )}
                </div>

                {/* 送迎詳細 */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">送迎詳細</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            利用者
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            送迎先
                          </th>
                          <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            お迎え時刻
                          </th>
                          <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            到着時刻
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            体調・特記事項
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {selectedRecord.transportation_details && [...selectedRecord.transportation_details]
                          .sort((a, b) => (a.destinations?.display_order || 0) - (b.destinations?.display_order || 0))
                          .map((detail) => (
                            <tr key={detail.id}>
                              <td className="px-4 py-2 text-sm">
                                {detail.users ? (
                                  <div>
                                    <div className="font-medium text-gray-900">{detail.users.name}</div>
                                    <div className="text-xs text-gray-500">
                                      {detail.users.user_no}
                                      {detail.users.wheelchair_user && ' (車椅子)'}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-gray-500">-</span>
                                )}
                              </td>
                              <td className="px-4 py-2 text-sm">
                                <div className="font-medium text-gray-900">{detail.destinations?.name || '-'}</div>
                                <div className="text-xs text-gray-500">
                                  {getDestinationTypeLabel(detail.destinations?.destination_type || '')}
                                </div>
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-center font-mono">
                                {detail.pickup_time || '-'}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-center font-mono">
                                {detail.arrival_time || '-'}
                              </td>
                              <td className="px-4 py-2 text-sm">
                                <div className="space-y-1">
                                  {detail.health_condition && (
                                    <div><span className="font-medium">体調:</span> {detail.health_condition}</div>
                                  )}
                                  {detail.behavior_notes && (
                                    <div><span className="font-medium">行動:</span> {detail.behavior_notes}</div>
                                  )}
                                  {detail.assistance_required && (
                                    <div><span className="font-medium">介助:</span> {detail.assistance_required}</div>
                                  )}
                                  {detail.remarks && (
                                    <div><span className="font-medium">備考:</span> {detail.remarks}</div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        }
                      </tbody>
                    </table>
                    {(!selectedRecord.transportation_details || selectedRecord.transportation_details.length === 0) && (
                      <div className="text-center py-8">
                        <p className="text-gray-500">送迎詳細情報がありません</p>
                      </div>
                    )}
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