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
  selectedAddresses?: {[userId: string]: string}
  deliveryRecordIds?: string[]
}

interface DeliveryItem {
  record: TransportationRecord
  user: User | null
  detail?: any // transportation_details record
}

export default function DriverPage() {
  const [session, setSession] = useState<DriverSession | null>(null)
  const [deliveries, setDeliveries] = useState<DeliveryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState('')
  const [editingTimes, setEditingTimes] = useState<{[key: string]: {arrival?: string, departure?: string}}>({})
  const [endOdometers, setEndOdometers] = useState<{[key: string]: number}>({})
  const [allCompleted, setAllCompleted] = useState(false)
  
  const [safetyData, setSafetyData] = useState<{[key: string]: {
    boarding: 'no_problem' | 'problem' | '',
    boardingDetails: string,
    alighting: 'no_problem' | 'problem' | '',
    alightingDetails: string,
    wheelchairSecurity: 'no_problem' | 'problem' | '',
    wheelchairDetails: string,
    companionPresent: boolean,
    companionName: string,
    companionRelationship: string
  }}>({})
  const [showSafetyForm, setShowSafetyForm] = useState<{[key: string]: boolean}>({})
  const [userAddressNames, setUserAddressNames] = useState<{[addressId: string]: string}>({})

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
    console.log('ドライバーセッション情報:', parsedSession)
    setSession(parsedSession)
    
    // 現在時刻を設定
    const now = new Date()
    setCurrentTime(now.toLocaleTimeString('ja-JP', { 
      hour: '2-digit', 
      minute: '2-digit' 
    }))

    // 今日の送迎記録を取得
    fetchTodayDeliveries(parsedSession.driverId)
    
    // 選択された住所の名前を取得
    if (parsedSession.selectedAddresses) {
      fetchAddressNames(parsedSession.selectedAddresses)
    }
  }, [router])

  const fetchAddressNames = async (selectedAddresses: {[userId: string]: string}) => {
    try {
      const addressIds = Object.values(selectedAddresses)
      if (addressIds.length === 0) return

      const { data: addresses } = await supabase
        .from('user_addresses')
        .select('id, address_name, address')
        .in('id', addressIds)

      if (addresses) {
        const addressNameMap: {[addressId: string]: string} = {}
        addresses.forEach(addr => {
          addressNameMap[addr.id] = `${addr.address_name}: ${addr.address}`
        })
        setUserAddressNames(addressNameMap)
      }
    } catch (error) {
      console.error('住所名取得エラー:', error)
    }
  }

  const fetchTodayDeliveries = async (driverId: string) => {
    try {
      const sessionData = localStorage.getItem('driverSession')
      const currentSession = sessionData ? JSON.parse(sessionData) as DriverSession : null
      
      // セッション情報から送迎記録IDを取得
      if (!currentSession?.deliveryRecordIds || currentSession.deliveryRecordIds.length === 0) {
        console.log('セッション情報に送迎記録IDが見つかりません')
        setDeliveries([])
        return
      }
      
      const { data: records, error } = await supabase
        .from('transportation_records')
        .select('*')
        .in('id', currentSession.deliveryRecordIds)
        .order('created_at', { ascending: true })

      if (error) throw error

      // 各送迎記録に対応する利用者詳細情報を取得
      const deliveryItems: DeliveryItem[] = []
      
      for (const record of records || []) {
        // transportation_detailsから利用者情報を取得
        const { data: details } = await supabase
          .from('transportation_details')
          .select(`
            *,
            users (*)
          `)
          .eq('transportation_record_id', record.id)
        
        // セッション情報から選択された利用者を取得
        console.log('セッション内の選択された利用者:', currentSession?.selectedUsers)
        console.log('取得した詳細記録:', details)
        
        if (currentSession?.selectedUsers && currentSession.selectedUsers.length > 0) {
          // 複数利用者送迎の場合、各利用者を個別のアイテムとして表示
          for (const userId of currentSession.selectedUsers) {
            try {
              const { data: userData } = await supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .single()
              
              // 対応する詳細記録を探す
              let detail = details?.find(d => d.user_id === userId)
              
              // 詳細記録が存在しない場合は作成（destination_idをスキップ）
              if (!detail) {
                console.log('詳細記録が見つからないため作成:', { recordId: record.id, userId })
                
                const detailData = {
                  transportation_record_id: record.id,
                  user_id: userId,
                  pickup_time: null,
                  arrival_time: null,
                  departure_time: null,
                  drop_off_time: null,
                  health_condition: null,
                  behavior_notes: null,
                  assistance_required: null,
                  remarks: null
                }
                
                const { data: newDetail, error: createError } = await supabase
                  .from('transportation_details')
                  .insert([detailData])
                  .select()
                  .single()
                
                if (createError) {
                  console.error('詳細記録作成エラー:', createError)
                } else {
                  detail = newDetail
                  console.log('詳細記録作成成功:', detail)
                }
              }
              
              console.log('作成したdeliveryItem:', { recordId: record.id, userId, userData: userData?.name, detail: detail?.id })
              deliveryItems.push({ 
                record, 
                user: userData,
                detail: detail
              })
            } catch (userErr) {
              console.error('利用者取得エラー:', userErr)
              deliveryItems.push({ record, user: null })
            }
          }
        } else {
          // セッション情報がない場合は詳細記録から取得
          if (details && details.length > 0) {
            for (const detail of details) {
              deliveryItems.push({ 
                record, 
                user: detail.users as User | null,
                detail: detail
              })
            }
          } else {
            // special_notesから取得（後方互換性）
            let user: User | null = null
            
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
        }
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

  const handleArrivalTime = async (recordId: string, userId?: string) => {
    const currentTimeStr = new Date().toTimeString().substring(0, 5)
    
    try {
      // 複数利用者送迎の場合は個別の詳細記録に時間を記録
      if (userId) {
        console.log('個別利用者の到着時間を記録:', { recordId, userId, time: currentTimeStr, timestamp: new Date().toISOString() })
        
        // まず、該当するtransportation_detailsレコードが存在するかチェック
        const { data: existingDetail } = await supabase
          .from('transportation_details')
          .select('id')
          .eq('transportation_record_id', recordId)
          .eq('user_id', userId)
          .single()
        
        if (!existingDetail) {
          console.error('対応する詳細記録が見つかりません:', { recordId, userId })
          alert('対応する詳細記録が見つかりません')
          return
        }
        
        const { error: detailError } = await supabase
          .from('transportation_details')
          .update({
            arrival_time: currentTimeStr + ':00',
            updated_at: new Date().toISOString()
          })
          .eq('transportation_record_id', recordId)
          .eq('user_id', userId)

        if (detailError) {
          console.error('詳細記録更新エラー:', detailError)
          throw detailError
        }

        console.log('個別利用者の到着時間記録成功:', { recordId, userId, time: currentTimeStr + ':00' })

        // 状態を更新（該当する利用者のみ）
        setDeliveries(prev => 
          prev.map(item => 
            item.record.id === recordId && item.user?.id === userId
              ? { 
                  ...item, 
                  detail: { 
                    ...item.detail, 
                    arrival_time: currentTimeStr + ':00' 
                  }
                }
              : item
          )
        )
      } else {
        // 従来の方法（単一利用者の場合）
        console.log('単一利用者の到着時間を記録:', { recordId, time: currentTimeStr })
        
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
      }
      
    } catch (err) {
      console.error('到着時刻記録エラー:', err)
      alert('到着時刻の記録に失敗しました: ' + (err instanceof Error ? err.message : String(err)))
    }
  }

  const handleDepartureTime = async (recordId: string, userId?: string) => {
    const currentTimeStr = new Date().toTimeString().substring(0, 5)
    
    try {
      // 複数利用者送迎の場合は個別の詳細記録に時間を記録
      if (userId) {
        console.log('個別利用者の出発時間を記録:', { recordId, userId, time: currentTimeStr })
        
        // まず、該当するtransportation_detailsレコードが存在するかチェック
        const { data: existingDetail } = await supabase
          .from('transportation_details')
          .select('id')
          .eq('transportation_record_id', recordId)
          .eq('user_id', userId)
          .single()
        
        if (!existingDetail) {
          console.error('対応する詳細記録が見つかりません:', { recordId, userId })
          alert('対応する詳細記録が見つかりません')
          return
        }
        
        const { error: detailError } = await supabase
          .from('transportation_details')
          .update({
            departure_time: currentTimeStr + ':00',
            updated_at: new Date().toISOString()
          })
          .eq('transportation_record_id', recordId)
          .eq('user_id', userId)

        if (detailError) {
          console.error('詳細記録更新エラー:', detailError)
          throw detailError
        }

        console.log('個別利用者の出発時間記録成功:', { recordId, userId, time: currentTimeStr + ':00' })

        // 状態を更新（該当する利用者のみ）
        setDeliveries(prev => 
          prev.map(item => 
            item.record.id === recordId && item.user?.id === userId
              ? { 
                  ...item, 
                  detail: { 
                    ...item.detail, 
                    departure_time: currentTimeStr + ':00' 
                  }
                }
              : item
          )
        )
      } else {
        // 従来の方法（単一利用者の場合）
        console.log('単一利用者の出発時間を記録:', { recordId, time: currentTimeStr })
        
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
      }
      
      // 全完了チェック
      const updatedDeliveries = deliveries.map(item => 
        item.record.id === recordId && (!userId || item.user?.id === userId)
          ? { ...item, record: { ...item.record, status: 'completed' }}
          : item
      )
      const completed = updatedDeliveries.every(item => {
        // 複数利用者の場合は、すべての利用者の出発時間が記録されているかチェック
        if (item.detail) {
          return item.detail.departure_time !== null && item.detail.departure_time !== undefined
        }
        return item.record.status === 'completed'
      })
      setAllCompleted(completed)
      
    } catch (err) {
      console.error('出発時刻記録エラー:', err)
      alert('出発時刻の記録に失敗しました: ' + (err instanceof Error ? err.message : String(err)))
    }
  }

  const handleTimeEdit = async (recordId: string, type: 'arrival' | 'departure', time: string, userId?: string) => {
    try {
      const updateData = type === 'arrival' 
        ? { arrival_time: time + ':00' }
        : { departure_time: time + ':00' }

      // 複数利用者送迎の場合は個別の詳細記録を更新
      if (userId) {
        const { error } = await supabase
          .from('transportation_details')
          .update({
            ...updateData,
            updated_at: new Date().toISOString()
          })
          .eq('transportation_record_id', recordId)
          .eq('user_id', userId)

        if (error) throw error
        
        // 状態を更新
        setDeliveries(prev => 
          prev.map(item => 
            item.record.id === recordId && item.user?.id === userId
              ? { 
                  ...item, 
                  detail: { 
                    ...item.detail, 
                    ...updateData 
                  }
                }
              : item
          )
        )
        
        // 編集状態をクリア
        setEditingTimes(prev => ({
          ...prev,
          [`${recordId}-${userId}`]: {
            ...prev[`${recordId}-${userId}`],
            [type]: undefined
          }
        }))
      } else {
        // 従来の方法（単一利用者の場合）
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
      }

      // 全完了チェック（時刻更新後）
      setTimeout(() => {
        setDeliveries(currentDeliveries => {
          console.log('完了チェック実行中:', currentDeliveries)
          const completed = currentDeliveries.every(item => {
            // 複数利用者の場合は、すべての利用者の出発時間が記録されているかチェック
            if (item.detail) {
              const hasArrival = item.detail.arrival_time && item.detail.arrival_time.trim() !== ''
              const hasDeparture = item.detail.departure_time && item.detail.departure_time.trim() !== ''
              console.log(`利用者 ${item.user?.name || item.user?.id}: 到着時刻=${item.detail.arrival_time}, 出発時刻=${item.detail.departure_time}, 完了=${hasArrival && hasDeparture}`)
              return hasArrival && hasDeparture
            }
            return item.record.status === 'completed'
          })
          console.log('全完了判定:', completed)
          setAllCompleted(completed)
          return currentDeliveries
        })
      }, 100)
      
    } catch (err) {
      console.error('時刻更新エラー:', err)
      alert('時刻の更新に失敗しました')
    }
  }

  const handleSaveSafetyData = async (recordId: string) => {
    const safety = safetyData[recordId]
    console.log('安全管理データ保存開始:', { recordId, safety, safetyData })
    
    if (!safety) {
      console.error('安全管理データが見つかりません:', recordId)
      alert('安全管理データが見つかりません')
      return
    }

    try {
      const updateData = {
        safety_check_boarding: safety.boarding || null,
        safety_check_boarding_details: safety.boarding === 'problem' ? safety.boardingDetails : null,
        safety_check_alighting: safety.alighting || null,
        safety_check_alighting_details: safety.alighting === 'problem' ? safety.alightingDetails : null,
        wheelchair_security_status: safety.wheelchairSecurity || null,
        wheelchair_security_details: safety.wheelchairSecurity === 'problem' ? safety.wheelchairDetails : null,
        companion_present: safety.companionPresent,
        companion_name: safety.companionPresent ? safety.companionName : null,
        companion_relationship: safety.companionPresent ? safety.companionRelationship : null,
        updated_at: new Date().toISOString()
      }

      console.log('データベース更新データ:', updateData)

      // transportation_recordsテーブルに直接安全管理データを保存
      const { data, error } = await supabase
        .from('transportation_records')
        .update(updateData)
        .eq('id', recordId)
        .select()
        
      if (error) throw error

      console.log('安全管理データ保存成功:', data)
      alert('安全管理データが保存されました')

      // フォームを閉じる
      setShowSafetyForm(prev => ({ ...prev, [recordId]: false }))
      
      // 状態を更新
      setDeliveries(prev => 
        prev.map(item => 
          item.record.id === recordId 
            ? { ...item, record: { ...item.record, ...updateData }}
            : item
        )
      )

    } catch (err) {
      console.error('安全管理データ保存エラー:', err)
      const errorMessage = err instanceof Error 
        ? err.message 
        : typeof err === 'object' && err !== null
          ? JSON.stringify(err, null, 2)
          : String(err)
      alert(`安全管理データの保存に失敗しました:\n${errorMessage}`)
    }
  }

  const initializeSafetyData = (recordId: string) => {
    if (!safetyData[recordId]) {
      setSafetyData(prev => ({
        ...prev,
        [recordId]: {
          boarding: '',
          boardingDetails: '',
          alighting: '',
          alightingDetails: '',
          wheelchairSecurity: '',
          wheelchairDetails: '',
          companionPresent: false,
          companionName: '',
          companionRelationship: ''
        }
      }))
    }
  }

  const handleToggleSafetyForm = (recordId: string) => {
    // 安全確認データを強制的に初期化
    setSafetyData(prev => ({
      ...prev,
      [recordId]: prev[recordId] || {
        boarding: '',
        boardingDetails: '',
        alighting: '',
        alightingDetails: '',
        wheelchairSecurity: '',
        wheelchairDetails: '',
        companionPresent: false,
        companionName: '',
        companionRelationship: ''
      }
    }))
    
    setShowSafetyForm(prev => ({
      ...prev,
      [recordId]: !prev[recordId]
    }))
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

      // 送迎完了ページにリダイレクト
      const firstDelivery = deliveries[0]
      const recordId = firstDelivery?.record?.id
      
      if (recordId) {
        console.log('送迎完了ページに遷移します。記録ID:', recordId)
        // セッション情報はクリアせずに完了ページで表示用に保持
        router.push(`/transportation-complete?recordId=${recordId}`)
      } else {
        console.log('記録IDが取得できないため、ログインページに戻ります')
        localStorage.removeItem('driverSession')
        router.push('/login')
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
                          {delivery.user ? delivery.user.user_no : ''}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(delivery.record.status)}
                  </div>

                  {/* 到着・出発時刻 */}
                  <div className="grid grid-cols-2 gap-6 mb-6">
                    <div>
                      <span className="text-sm font-medium text-gray-700 block mb-2">到着時刻:</span>
                      {/* 複数利用者送迎の場合は詳細記録の時間を表示 */}
                      {(delivery.detail || (session?.selectedUsers && session.selectedUsers.length > 0)) ? (
                        delivery.detail?.arrival_time ? (
                          <div className="flex items-center space-x-2">
                            {editingTimes[`${delivery.record.id}-${delivery.user?.id}`]?.arrival !== undefined ? (
                              <>
                                <input
                                  type="time"
                                  value={editingTimes[`${delivery.record.id}-${delivery.user?.id}`]?.arrival || delivery.detail.arrival_time?.substring(0, 5) || ''}
                                  onChange={(e) => setEditingTimes(prev => ({
                                    ...prev,
                                    [`${delivery.record.id}-${delivery.user?.id}`]: {
                                      ...prev[`${delivery.record.id}-${delivery.user?.id}`],
                                      arrival: e.target.value
                                    }
                                  }))}
                                  className="px-2 py-1 border rounded text-sm"
                                />
                                <button
                                  onClick={() => handleTimeEdit(delivery.record.id, 'arrival', editingTimes[`${delivery.record.id}-${delivery.user?.id}`]?.arrival || '', delivery.user?.id)}
                                  className="text-blue-600 text-sm"
                                >
                                  保存
                                </button>
                                <button
                                  onClick={() => setEditingTimes(prev => ({
                                    ...prev,
                                    [`${delivery.record.id}-${delivery.user?.id}`]: { ...prev[`${delivery.record.id}-${delivery.user?.id}`], arrival: undefined }
                                  }))}
                                  className="text-gray-600 text-sm"
                                >
                                  キャンセル
                                </button>
                              </>
                            ) : (
                              <>
                                <span className="font-mono text-lg font-bold text-blue-600">
                                  {delivery.detail.arrival_time?.substring(0, 5)}
                                </span>
                                <button
                                  onClick={() => setEditingTimes(prev => ({
                                    ...prev,
                                    [`${delivery.record.id}-${delivery.user?.id}`]: {
                                      ...prev[`${delivery.record.id}-${delivery.user?.id}`],
                                      arrival: delivery.detail.arrival_time?.substring(0, 5) || ''
                                    }
                                  }))}
                                  className="text-gray-500 text-sm underline"
                                >
                                  修正
                                </button>
                              </>
                            )}
                          </div>
                        ) : delivery.user?.id ? (
                          <button
                            onClick={() => {
                              console.log('到着記録ボタンクリック:', { recordId: delivery.record.id, userId: delivery.user?.id, userName: delivery.user?.name })
                              handleArrivalTime(delivery.record.id, delivery.user?.id)
                            }}
                            className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
                          >
                            到着記録
                          </button>
                        ) : (
                          <div className="text-red-500 text-sm">利用者IDエラー</div>
                        )
                      ) : (
                        /* 従来の単一利用者送迎の場合 */
                        delivery.record.arrival_time ? (
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
                        )
                      )}
                    </div>

                    <div>
                      <span className="text-sm font-medium text-gray-700 block mb-2">出発時刻:</span>
                      {/* 複数利用者送迎の場合は詳細記録の時間を表示 */}
                      {(delivery.detail || (session?.selectedUsers && session.selectedUsers.length > 0)) ? (
                        delivery.detail?.departure_time ? (
                          <div className="flex items-center space-x-2">
                            {editingTimes[`${delivery.record.id}-${delivery.user?.id}`]?.departure !== undefined ? (
                              <>
                                <input
                                  type="time"
                                  value={editingTimes[`${delivery.record.id}-${delivery.user?.id}`]?.departure || delivery.detail.departure_time?.substring(0, 5) || ''}
                                  onChange={(e) => setEditingTimes(prev => ({
                                    ...prev,
                                    [`${delivery.record.id}-${delivery.user?.id}`]: {
                                      ...prev[`${delivery.record.id}-${delivery.user?.id}`],
                                      departure: e.target.value
                                    }
                                  }))}
                                  className="px-2 py-1 border rounded text-sm"
                                />
                                <button
                                  onClick={() => handleTimeEdit(delivery.record.id, 'departure', editingTimes[`${delivery.record.id}-${delivery.user?.id}`]?.departure || '', delivery.user?.id)}
                                  className="text-blue-600 text-sm"
                                >
                                  保存
                                </button>
                                <button
                                  onClick={() => setEditingTimes(prev => ({
                                    ...prev,
                                    [`${delivery.record.id}-${delivery.user?.id}`]: { ...prev[`${delivery.record.id}-${delivery.user?.id}`], departure: undefined }
                                  }))}
                                  className="text-gray-600 text-sm"
                                >
                                  キャンセル
                                </button>
                              </>
                            ) : (
                              <>
                                <span className="font-mono text-lg font-bold text-green-600">
                                  {delivery.detail.departure_time?.substring(0, 5)}
                                </span>
                                <button
                                  onClick={() => setEditingTimes(prev => ({
                                    ...prev,
                                    [`${delivery.record.id}-${delivery.user?.id}`]: {
                                      ...prev[`${delivery.record.id}-${delivery.user?.id}`],
                                      departure: delivery.detail.departure_time?.substring(0, 5) || ''
                                    }
                                  }))}
                                  className="text-gray-500 text-sm underline"
                                >
                                  修正
                                </button>
                              </>
                            )}
                          </div>
                        ) : delivery.detail?.arrival_time ? (
                          delivery.user?.id ? (
                            <button
                              onClick={() => handleDepartureTime(delivery.record.id, delivery.user?.id)}
                              className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700"
                            >
                              出発記録
                            </button>
                          ) : (
                            <div className="text-red-500 text-sm">利用者IDエラー</div>
                          )
                        ) : (
                          <span className="text-gray-500 text-sm">到着記録後に入力可能</span>
                        )
                      ) : (
                        /* 従来の単一利用者送迎の場合 */
                        delivery.record.departure_time ? (
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
                        )
                      )}
                    </div>
                  </div>

                  {/* 利用者情報 */}
                  {delivery.user && (
                    <div className="border-t pt-4">
                      <div className="grid grid-cols-1 gap-2">
                        <div>
                          <span className="text-sm text-gray-600">住所:</span>
                          <p className="text-sm">
                            {session?.selectedAddresses && delivery.user?.id && session.selectedAddresses[delivery.user.id] 
                              ? userAddressNames[session.selectedAddresses[delivery.user.id]] || '選択された住所'
                              : delivery.user?.address || '住所不明'}
                          </p>
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
                {allCompleted ? '本日の送迎を終了する' : `送迎完了待ち (${deliveries.filter(d => {
                  // 複数利用者の場合は、到着・出発時間の両方が記録されているかチェック
                  if (d.detail) {
                    const hasArrival = d.detail.arrival_time && d.detail.arrival_time.trim() !== ''
                    const hasDeparture = d.detail.departure_time && d.detail.departure_time.trim() !== ''
                    return hasArrival && hasDeparture
                  }
                  return d.record.status === 'completed'
                }).length}/${deliveries.length})`}
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