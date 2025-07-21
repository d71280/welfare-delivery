'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { TransportationRecord, Driver, Vehicle } from '@/types'

interface TransportationRecordWithDetails extends TransportationRecord {
  drivers?: { name: string }
  vehicles?: { vehicle_no: string, vehicle_name: string }
  users?: Array<{
    id: string
    name: string
    user_no: string
    wheelchair_user: boolean
  }>
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

interface GroupedTransportationRecord {
  date: string
  driver_name: string
  vehicle_info: string
  transportation_type: string
  total_users: number
  records: TransportationRecordWithDetails[]
  status: string
  start_time: string | null
  end_time: string | null
}

export default function TransportationRecordsPage() {
  const [records, setRecords] = useState<TransportationRecordWithDetails[]>([])
  const [groupedRecords, setGroupedRecords] = useState<GroupedTransportationRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedGroup, setSelectedGroup] = useState<GroupedTransportationRecord | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [filterDriver, setFilterDriver] = useState<string>('all')
  const [filterVehicle, setFilterVehicle] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [selectedRecords, setSelectedRecords] = useState<string[]>([])
  const [selectAll, setSelectAll] = useState(false)
  const [editingSafety, setEditingSafety] = useState<string | null>(null)
  const [safetyFormData, setSafetyFormData] = useState({
    safety_check_boarding: '',
    safety_check_boarding_details: '',
    safety_check_alighting: '',
    safety_check_alighting_details: '',
    wheelchair_security_status: '',
    wheelchair_security_details: '',
    companion_present: false,
    companion_name: '',
    companion_relationship: ''
  })
  
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
      const [driversRes, vehiclesRes] = await Promise.all([
        supabase.from('drivers').select('*').eq('is_active', true),
        supabase.from('vehicles').select('*').eq('is_active', true)
      ])

      if (driversRes.data) setDrivers(driversRes.data)
      if (vehiclesRes.data) setVehicles(vehiclesRes.data)
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
      
      // レコードをグループ化
      const grouped = groupRecordsByTransportation(data || [])
      setGroupedRecords(grouped)
    } catch (error) {
      console.error('送迎記録取得エラー:', error)
      setRecords([])
      setGroupedRecords([])
    } finally {
      setIsLoading(false)
    }
  }

  const groupRecordsByTransportation = (records: TransportationRecordWithDetails[]): GroupedTransportationRecord[] => {
    const groups = new Map<string, GroupedTransportationRecord>()

    records.forEach(record => {
      // グループキーを作成（日付 + ドライバー + 車両）
      const groupKey = `${record.transportation_date}_${record.driver_id}_${record.vehicle_id}`
      
      if (!groups.has(groupKey)) {
        // 新しいグループを作成
        groups.set(groupKey, {
          date: record.transportation_date,
          driver_name: record.drivers?.name || '不明',
          vehicle_info: `${record.vehicles?.vehicle_no} ${record.vehicles?.vehicle_name}`.trim() || '不明',
          transportation_type: record.transportation_type,
          total_users: 0,
          records: [],
          status: record.status,
          start_time: record.start_time,
          end_time: record.end_time
        })
      }

      const group = groups.get(groupKey)!
      group.records.push(record)
      group.total_users = group.records.length

      // ステータスの優先度（completed > in_progress > pending）
      if (record.status === 'completed' || 
          (record.status === 'in_progress' && group.status !== 'completed')) {
        group.status = record.status
      }
    })

    return Array.from(groups.values()).sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )
  }

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked)
    if (checked) {
      setSelectedRecords(filteredRecords.map(record => (record as any).id))
    } else {
      setSelectedRecords([])
    }
  }

  const handleRecordSelection = (recordId: string, checked: boolean) => {
    if (checked) {
      setSelectedRecords(prev => [...prev, recordId])
    } else {
      setSelectedRecords(prev => prev.filter(id => id !== recordId))
    }
  }

  const handlePDFExport = async () => {
    if (selectedRecords.length === 0) {
      alert('PDF出力する記録を選択してください')
      return
    }

    try {
      // Create PDF content
      const selectedData = filteredRecords.filter(record => 
        selectedRecords.includes((record as any).id)
      )

      // Generate PDF using browser's print function
      const printWindow = window.open('', '_blank')
      if (!printWindow) {
        alert('ポップアップがブロックされています。ブラウザの設定を確認してください。')
        return
      }

      const pdfContent = generatePDFContent(selectedData)
      
      printWindow.document.write(pdfContent)
      printWindow.document.close()
      printWindow.focus()
      printWindow.print()
      printWindow.close()
    } catch (error) {
      console.error('PDF出力エラー:', error)
      alert('PDF出力に失敗しました')
    }
  }

  const generatePDFContent = (records: TransportationRecordWithDetails[]) => {
    const today = new Date().toLocaleDateString('ja-JP')
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>送迎記録 - ${today}</title>
        <style>
          @media print {
            @page { margin: 20mm; }
            body { margin: 0; font-family: 'Meiryo', sans-serif; font-size: 12px; line-height: 1.4; }
          }
          body { font-family: 'Meiryo', sans-serif; font-size: 12px; line-height: 1.4; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 10px; }
          .record { margin-bottom: 40px; page-break-inside: avoid; border: 1px solid #ccc; padding: 15px; }
          .record-header { background: #f5f5f5; padding: 10px; margin: -15px -15px 15px -15px; font-weight: bold; border-bottom: 1px solid #ddd; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; }
          .info-item { margin-bottom: 8px; }
          .info-label { font-weight: bold; display: inline-block; width: 120px; }
          .details-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          .details-table th, .details-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          .details-table th { background: #f9f9f9; font-weight: bold; }
          .section { margin-bottom: 20px; }
          .section-title { font-weight: bold; font-size: 14px; margin-bottom: 10px; color: #333; border-left: 4px solid #007bff; padding-left: 8px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>送迎記録</h1>
          <p>出力日: ${today}</p>
        </div>
        
        ${records.map(record => {
          const startOdometer = (record as any).start_odometer || 0
          const endOdometer = (record as any).end_odometer || 0
          const travelDistance = endOdometer && startOdometer ? endOdometer - startOdometer : 0
          
          return `
            <div class="record">
              <div class="record-header">
                送迎記録 - ${new Date((record as any).transportation_date).toLocaleDateString('ja-JP')}
              </div>
              
              <div class="section">
                <div class="section-title">基本的な記録事項</div>
                <div class="info-grid">
                  <div>
                    <div class="info-item">
                      <span class="info-label">送迎実施日:</span>
                      ${new Date((record as any).transportation_date).toLocaleDateString('ja-JP')}
                    </div>
                    <div class="info-item">
                      <span class="info-label">出発時刻:</span>
                      ${(record as any).start_time || '-'}
                    </div>
                    <div class="info-item">
                      <span class="info-label">到着時刻:</span>
                      ${(record as any).end_time || '-'}
                    </div>
                    <div class="info-item">
                      <span class="info-label">送迎距離:</span>
                      ${travelDistance ? `${travelDistance}km` : '-'}
                    </div>
                    <div class="info-item">
                      <span class="info-label">開始時走行距離:</span>
                      ${startOdometer ? `${startOdometer}km` : '-'}
                    </div>
                    <div class="info-item">
                      <span class="info-label">終了走行距離:</span>
                      ${endOdometer ? `${endOdometer}km` : '-'}
                    </div>
                  </div>
                  <div>
                    <div class="info-item">
                      <span class="info-label">運転者氏名:</span>
                      ${record.drivers?.name || '-'}
                    </div>
                    <div class="info-item">
                      <span class="info-label">使用車両:</span>
                      ${record.vehicles?.vehicle_no || '-'} (${record.vehicles?.vehicle_name || '-'})
                    </div>
                    <div class="info-item">
                      <span class="info-label">送迎タイプ:</span>
                      ${getTransportationTypeLabel((record as any).transportation_type)}
                    </div>
                    <div class="info-item">
                      <span class="info-label">乗車人数:</span>
                      ${(record as any).passenger_count || 0}人
                    </div>
                    <div class="info-item">
                      <span class="info-label">天候:</span>
                      ${(record as any).weather_condition || '-'}
                    </div>
                  </div>
                </div>
              </div>

              ${record.transportation_details && record.transportation_details.length > 0 ? `
                <div class="section">
                  <div class="section-title">利用者詳細・安全管理に関する記録</div>
                  <table class="details-table">
                    <thead>
                      <tr>
                        <th>利用者氏名・番号</th>
                        <th>乗車地点・降車地点</th>
                        <th>お迎え時刻・到着時刻</th>
                        <th>健康状態・特記事項</th>
                        <th>車椅子使用</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${record.transportation_details.map(detail => `
                        <tr>
                          <td>
                            ${detail.users?.name || '-'}<br>
                            <small>${detail.users?.user_no || '-'}</small>
                          </td>
                          <td>${detail.destinations?.name || '-'}</td>
                          <td>
                            お迎え: ${detail.pickup_time || '-'}<br>
                            到着: ${detail.arrival_time || '-'}
                          </td>
                          <td>
                            ${detail.health_condition ? `体調: ${detail.health_condition}<br>` : ''}
                            ${detail.behavior_notes ? `行動: ${detail.behavior_notes}<br>` : ''}
                            ${detail.assistance_required ? `介助: ${detail.assistance_required}<br>` : ''}
                            ${detail.remarks ? `備考: ${detail.remarks}` : ''}
                          </td>
                          <td>${detail.users?.wheelchair_user ? '使用' : '-'}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
              ` : ''}

              <div class="section">
                <div class="section-title">安全管理記録</div>
                <div class="info-grid">
                  <div>
                    <div class="info-item">
                      <span class="info-label">乗車時安全確認:</span>
                      ${(record as any).safety_check_boarding === 'no_problem' ? '✅ 問題なし' : 
                        (record as any).safety_check_boarding === 'problem' ? '⚠️ 問題あり' : '-'}
                      ${(record as any).safety_check_boarding_details ? `<br><small>詳細: ${(record as any).safety_check_boarding_details}</small>` : ''}
                    </div>
                    <div class="info-item">
                      <span class="info-label">降車時安全確認:</span>
                      ${(record as any).safety_check_alighting === 'no_problem' ? '✅ 問題なし' : 
                        (record as any).safety_check_alighting === 'problem' ? '⚠️ 問題あり' : '-'}
                      ${(record as any).safety_check_alighting_details ? `<br><small>詳細: ${(record as any).safety_check_alighting_details}</small>` : ''}
                    </div>
                    <div class="info-item">
                      <span class="info-label">車椅子固定状況:</span>
                      ${(record as any).wheelchair_security_status === 'no_problem' ? '✅ 問題なし（適切に固定済み）' : 
                        (record as any).wheelchair_security_status === 'problem' ? '⚠️ 問題あり（固定不良等）' : '-'}
                      ${(record as any).wheelchair_security_details ? `<br><small>詳細: ${(record as any).wheelchair_security_details}</small>` : ''}
                    </div>
                  </div>
                  <div>
                    <div class="info-item">
                      <span class="info-label">同乗者の有無:</span>
                      ${(record as any).companion_present ? '👥 同乗者あり' : '👤 同乗者なし'}
                    </div>
                    ${(record as any).companion_present ? `
                      <div class="info-item">
                        <span class="info-label">同乗者氏名:</span>
                        ${(record as any).companion_name || '-'}
                      </div>
                      <div class="info-item">
                        <span class="info-label">続柄・関係:</span>
                        ${(record as any).companion_relationship || '-'}
                      </div>
                    ` : ''}
                  </div>
                </div>
              </div>

              <div class="section">
                <div class="section-title">事業所管理情報</div>
                <div class="info-grid">
                  <div>
                    <div class="info-item">
                      <span class="info-label">記録作成日:</span>
                      ${new Date((record as any).created_at).toLocaleDateString('ja-JP')}
                    </div>
                    <div class="info-item">
                      <span class="info-label">特記事項:</span>
                      ${(record as any).special_notes || '-'}
                    </div>
                  </div>
                  <div>
                    <div class="info-item" style="border-top: 1px solid #ccc; padding-top: 20px; margin-top: 20px;">
                      <span class="info-label">責任者確認印:</span>
                      <div style="width: 100px; height: 30px; border: 1px solid #ccc; display: inline-block; margin-left: 10px;"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          `
        }).join('')}
      </body>
      </html>
    `
  }

  const handleCSVExport = () => {
    const headers = [
      '送迎日',
      'ドライバー名',
      '車両番号',
      '車両名',
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
        '-',
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
    setSelectedRecords([record.id])
    setShowDetails(true)
  }

  const handleEditSafety = (record: TransportationRecordWithDetails) => {
    setEditingSafety((record as any).id)
    setSafetyFormData({
      safety_check_boarding: (record as any).safety_check_boarding || '',
      safety_check_boarding_details: (record as any).safety_check_boarding_details || '',
      safety_check_alighting: (record as any).safety_check_alighting || '',
      safety_check_alighting_details: (record as any).safety_check_alighting_details || '',
      wheelchair_security_status: (record as any).wheelchair_security_status || '',
      wheelchair_security_details: (record as any).wheelchair_security_details || '',
      companion_present: (record as any).companion_present || false,
      companion_name: (record as any).companion_name || '',
      companion_relationship: (record as any).companion_relationship || ''
    })
  }

  const handleSaveSafety = async () => {
    if (!editingSafety) return

    try {
      const updateData = {
        safety_check_boarding: safetyFormData.safety_check_boarding || null,
        safety_check_boarding_details: safetyFormData.safety_check_boarding === 'problem' ? safetyFormData.safety_check_boarding_details : null,
        safety_check_alighting: safetyFormData.safety_check_alighting || null,
        safety_check_alighting_details: safetyFormData.safety_check_alighting === 'problem' ? safetyFormData.safety_check_alighting_details : null,
        wheelchair_security_status: safetyFormData.wheelchair_security_status || null,
        wheelchair_security_details: safetyFormData.wheelchair_security_status === 'problem' ? safetyFormData.wheelchair_security_details : null,
        companion_present: safetyFormData.companion_present,
        companion_name: safetyFormData.companion_present ? safetyFormData.companion_name : null,
        companion_relationship: safetyFormData.companion_present ? safetyFormData.companion_relationship : null,
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('transportation_records')
        .update(updateData)
        .eq('id', editingSafety)

      if (error) throw error

      alert('安全管理データを保存しました')
      setEditingSafety(null)
      fetchRecords() // データを再取得
    } catch (err) {
      console.error('安全管理データ保存エラー:', err)
      alert('保存に失敗しました')
    }
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
    
    return matchesDriver && matchesVehicle && matchesType && matchesDateRange
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
              <a href="/admin/dashboard" className="welfare-button welfare-button-outline">
                🏠 ダッシュボード
              </a>
              <button
                onClick={handleCSVExport}
                className="welfare-button welfare-button-secondary"
              >
                📈 CSV出力
              </button>
              <button
                onClick={handlePDFExport}
                disabled={selectedRecords.length === 0}
                className="welfare-button welfare-button-primary disabled:opacity-50"
              >
                📄 PDF出力 ({selectedRecords.length})
              </button>
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
                      <th>
                        <input
                          type="checkbox"
                          checked={selectAll}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                          className="rounded"
                        />
                      </th>
                      <th>日付</th>
                      <th>ドライバー / 車両</th>
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
                          <input
                            type="checkbox"
                            checked={selectedRecords.includes((record as any).id)}
                            onChange={(e) => handleRecordSelection((record as any).id, e.target.checked)}
                            className="rounded"
                          />
                        </td>
                        <td className="text-center">
                          <span className="welfare-badge bg-blue-100 text-blue-800">
                            📅 {new Date((record as any).transportation_date).toLocaleDateString('ja-JP')}
                          </span>
                        </td>
                        <td>
                          <div className="space-y-1">
                            <div className="font-medium text-gray-900">🚗 {record.drivers?.name || '-'}</div>
                            <div className="text-sm text-gray-500">🚐 {record.vehicles?.vehicle_no || '-'}</div>
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
                              onClick={() => handleEditSafety(record)}
                              className="welfare-button welfare-button-secondary text-sm px-3 py-1"
                            >
                              🛡️
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

        {/* 安全管理編集モーダル */}
        {editingSafety && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-screen overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">🛡️ 安全管理記録</h2>
                <button
                  onClick={() => setEditingSafety(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleSaveSafety(); }} className="space-y-6">
                {/* 乗降時の安全確認 */}
                <div className="welfare-section">
                  <h3 className="welfare-section-title">🚪 乗降時の安全確認状況</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">乗車時の安全確認</label>
                        <div className="space-y-2">
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name="boarding"
                              value="no_problem"
                              checked={safetyFormData.safety_check_boarding === 'no_problem'}
                              onChange={(e) => setSafetyFormData({...safetyFormData, safety_check_boarding: e.target.value})}
                              className="mr-2"
                            />
                            ✅ 問題なし
                          </label>
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name="boarding"
                              value="problem"
                              checked={safetyFormData.safety_check_boarding === 'problem'}
                              onChange={(e) => setSafetyFormData({...safetyFormData, safety_check_boarding: e.target.value})}
                              className="mr-2"
                            />
                            ⚠️ 問題あり
                          </label>
                        </div>
                        {safetyFormData.safety_check_boarding === 'problem' && (
                          <textarea
                            value={safetyFormData.safety_check_boarding_details}
                            onChange={(e) => setSafetyFormData({...safetyFormData, safety_check_boarding_details: e.target.value})}
                            placeholder="問題の詳細を入力してください"
                            className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md"
                            rows={3}
                          />
                        )}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">降車時の安全確認</label>
                        <div className="space-y-2">
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name="alighting"
                              value="no_problem"
                              checked={safetyFormData.safety_check_alighting === 'no_problem'}
                              onChange={(e) => setSafetyFormData({...safetyFormData, safety_check_alighting: e.target.value})}
                              className="mr-2"
                            />
                            ✅ 問題なし
                          </label>
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name="alighting"
                              value="problem"
                              checked={safetyFormData.safety_check_alighting === 'problem'}
                              onChange={(e) => setSafetyFormData({...safetyFormData, safety_check_alighting: e.target.value})}
                              className="mr-2"
                            />
                            ⚠️ 問題あり
                          </label>
                        </div>
                        {safetyFormData.safety_check_alighting === 'problem' && (
                          <textarea
                            value={safetyFormData.safety_check_alighting_details}
                            onChange={(e) => setSafetyFormData({...safetyFormData, safety_check_alighting_details: e.target.value})}
                            placeholder="問題の詳細を入力してください"
                            className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md"
                            rows={3}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 車椅子等の固定状況 */}
                <div className="welfare-section">
                  <h3 className="welfare-section-title">♿ 車椅子等の福祉用具の固定状況</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">車椅子・福祉用具の固定状況</label>
                      <div className="space-y-2">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="wheelchair"
                            value="no_problem"
                            checked={safetyFormData.wheelchair_security_status === 'no_problem'}
                            onChange={(e) => setSafetyFormData({...safetyFormData, wheelchair_security_status: e.target.value})}
                            className="mr-2"
                          />
                          ✅ 問題なし（適切に固定済み）
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="wheelchair"
                            value="problem"
                            checked={safetyFormData.wheelchair_security_status === 'problem'}
                            onChange={(e) => setSafetyFormData({...safetyFormData, wheelchair_security_status: e.target.value})}
                            className="mr-2"
                          />
                          ⚠️ 問題あり（固定不良等）
                        </label>
                      </div>
                      {safetyFormData.wheelchair_security_status === 'problem' && (
                        <textarea
                          value={safetyFormData.wheelchair_security_details}
                          onChange={(e) => setSafetyFormData({...safetyFormData, wheelchair_security_details: e.target.value})}
                          placeholder="固定に関する問題の詳細を入力してください"
                          className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md"
                          rows={3}
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* 同乗者情報 */}
                <div className="welfare-section">
                  <h3 className="welfare-section-title">👥 同乗者（介助者等）の情報</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={safetyFormData.companion_present}
                          onChange={(e) => setSafetyFormData({...safetyFormData, companion_present: e.target.checked})}
                          className="mr-2"
                        />
                        同乗者がいる
                      </label>
                    </div>

                    {safetyFormData.companion_present && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">同乗者氏名</label>
                          <input
                            type="text"
                            value={safetyFormData.companion_name}
                            onChange={(e) => setSafetyFormData({...safetyFormData, companion_name: e.target.value})}
                            placeholder="例: 田中花子"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">続柄・関係</label>
                          <input
                            type="text"
                            value={safetyFormData.companion_relationship}
                            onChange={(e) => setSafetyFormData({...safetyFormData, companion_relationship: e.target.value})}
                            placeholder="例: 母親、介護ヘルパー"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-4 pt-6">
                  <button
                    type="button"
                    onClick={() => setEditingSafety(null)}
                    className="welfare-button welfare-button-outline flex-1"
                  >
                    ❌ キャンセル
                  </button>
                  <button
                    type="submit"
                    className="welfare-button welfare-button-primary flex-1"
                  >
                    💾 保存
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  )
}