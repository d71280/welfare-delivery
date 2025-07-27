'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TransportationRecord, Driver, Vehicle, Route } from '@/types'

interface DeliveryRecordWithRelations extends TransportationRecord {
  driver?: Driver
  vehicle?: Vehicle
  route?: Route
}

export default function DeliveryRecordsPage() {
  const [records, setRecords] = useState<DeliveryRecordWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [dateFilter, setDateFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [driverFilter, setDriverFilter] = useState('')
  const [managementCodeIds, setManagementCodeIds] = useState<string[]>([])

  const supabase = createClient()

  useEffect(() => {
    // 管理者セッションから管理コードIDを取得
    const fetchManagementCodes = async () => {
      const sessionData = localStorage.getItem('adminSession')
      if (!sessionData) return
      
      const session = JSON.parse(sessionData)
      
      // 組織に紐づく管理コードを取得
      const { data: codes, error } = await supabase
        .from('management_codes')
        .select('id')
        .eq('organization_id', session.organizationId)
        .eq('is_active', true)
      
      if (error) {
        console.error('管理コード取得エラー:', error)
        return
      }
      
      if (codes && codes.length > 0) {
        setManagementCodeIds(codes.map(code => code.id))
      }
    }
    
    fetchManagementCodes()
  }, [])

  useEffect(() => {
    if (managementCodeIds.length > 0) {
      fetchRecords()
    }
  }, [dateFilter, statusFilter, driverFilter, managementCodeIds])

  const fetchRecords = async () => {
    try {
      let query = supabase
        .from('transportation_records')
        .select(`
          *,
          driver:drivers!transportation_records_driver_id_fkey(id, name, employee_no),
          vehicle:vehicles!transportation_records_vehicle_id_fkey(id, vehicle_no, vehicle_name),
          route:routes!transportation_records_route_id_fkey(id, route_name, route_code)
        `)
        .in('management_code_id', managementCodeIds)
        .order('transportation_date', { ascending: false })
        .order('created_at', { ascending: false })

      if (dateFilter) {
        query = query.eq('transportation_date', dateFilter)
      }
      if (statusFilter) {
        query = query.eq('status', statusFilter)
      }
      if (driverFilter) {
        query = query.eq('driver_id', driverFilter)
      }

      const { data, error } = await query

      if (error) throw error
      setRecords(data || [])
    } catch (error) {
      console.error('送迎記録の取得に失敗しました:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusMap = {
      pending: { label: '準備中', class: 'bg-yellow-100 text-yellow-800' },
      in_progress: { label: '実行中', class: 'bg-blue-100 text-blue-800' },
      completed: { label: '完了', class: 'bg-green-100 text-green-800' },
      cancelled: { label: 'キャンセル', class: 'bg-red-100 text-red-800' }
    }
    const statusInfo = statusMap[status as keyof typeof statusMap] || { label: status, class: 'bg-gray-100 text-gray-800' }
    
    return (
      <span className={`px-2 py-1 rounded-full text-sm font-medium ${statusInfo.class}`}>
        {statusInfo.label}
      </span>
    )
  }

  const getTransportationTypeLabel = (type: string) => {
    const typeMap = {
      regular: '通常送迎',
      medical: '医療送迎',
      emergency: '緊急送迎',
      outing: '外出支援'
    }
    return typeMap[type as keyof typeof typeMap] || type
  }

  const formatTime = (timeString: string | null) => {
    if (!timeString) return '-'
    return timeString.slice(0, 5) // HH:MM 形式に変換
  }

  const exportToCSV = () => {
    const headers = [
      '送迎日',
      '送迎タイプ',
      'ドライバー',
      '車両',
      'ルート',
      '開始時刻',
      '終了時刻',
      '開始走行距離',
      '終了走行距離',
      '乗車人数',
      '天候',
      'ステータス',
      '特記事項'
    ]
    
    const csvContent = [
      headers.join(','),
      ...records.map(record => [
        record.transportation_date,
        getTransportationTypeLabel(record.transportation_type),
        record.driver?.name || '',
        record.vehicle?.vehicle_name || record.vehicle?.vehicle_no || '',
        record.route?.route_name || '',
        formatTime(record.start_time),
        formatTime(record.end_time),
        record.start_odometer || '',
        record.end_odometer || '',
        record.passenger_count || 0,
        record.weather_condition || '',
        record.status,
        record.special_notes || ''
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `送迎記録_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  if (loading) {
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-200">
      {/* ヘッダー */}
      <div className="bg-white shadow-lg border-b-4 border-blue-500">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white text-2xl">📋</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">送迎記録管理</h1>
                <p className="text-gray-600">送迎の実績記録を確認・管理します</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <a 
                href="/admin/dashboard"
                className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg flex items-center gap-2"
              >
                🏠 ダッシュボード
              </a>
              <a 
                href="/admin/transportation-records"
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center gap-2"
              >
                ➕ 新規記録
              </a>
              <button 
                onClick={exportToCSV}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg flex items-center gap-2"
              >
                📊 CSV出力
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* フィルター */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            🔍 記録フィルター
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                送迎日
              </label>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ステータス
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">すべて</option>
                <option value="pending">準備中</option>
                <option value="in_progress">実行中</option>
                <option value="completed">完了</option>
                <option value="cancelled">キャンセル</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setDateFilter('')
                  setStatusFilter('')
                  setDriverFilter('')
                }}
                className="w-full bg-gray-400 hover:bg-gray-500 text-white px-4 py-3 rounded-lg"
              >
                フィルタークリア
              </button>
            </div>
          </div>
        </div>

        {/* 記録一覧 */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              📋 送迎記録一覧 ({records.length}件)
            </h2>
          </div>

          {records.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl text-gray-400">📋</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">送迎記録がありません</h3>
              <p className="text-gray-600">条件に一致する送迎記録が見つかりませんでした</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">送迎日</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">タイプ</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">ドライバー</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">車両</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">ルート</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">時間</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">走行距離</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">乗車人数</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">ステータス</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {records.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 text-sm text-gray-900">
                        {record.transportation_date}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900">
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                          {getTransportationTypeLabel(record.transportation_type)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900">
                        <div>
                          <div className="font-medium">{record.driver?.name}</div>
                          <div className="text-xs text-gray-500">{record.driver?.employee_no}</div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900">
                        <div>
                          <div className="font-medium">{record.vehicle?.vehicle_name || record.vehicle?.vehicle_no}</div>
                          <div className="text-xs text-gray-500">{record.vehicle?.vehicle_no}</div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900">
                        <div>
                          <div className="font-medium">{record.route?.route_name}</div>
                          <div className="text-xs text-gray-500">{record.route?.route_code}</div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900">
                        <div>
                          <div>開始: {formatTime(record.start_time)}</div>
                          <div>終了: {formatTime(record.end_time)}</div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900">
                        <div>
                          <div>開始: {record.start_odometer ? `${record.start_odometer}km` : '-'}</div>
                          <div>終了: {record.end_odometer ? `${record.end_odometer}km` : '-'}</div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900 text-center">
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                          {record.passenger_count}名
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm">
                        {getStatusBadge(record.status)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}