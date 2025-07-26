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
  const [returnToOfficeTime, setReturnToOfficeTime] = useState<string>('')
  
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

    // デバッグ用：allCompletedの状態変化を監視
    const debugInterval = setInterval(() => {
      console.log('デバッグ - 定期チェック:', {
        allCompleted,
        deliveriesLength: deliveries.length,
        endOdometerFinal: endOdometers['final'],
        deliveriesDetail: deliveries.map(d => ({
          user: d.user?.name,
          arrival: d.detail?.arrival_time,
          departure: d.detail?.departure_time,
          hasDetail: !!d.detail
        }))
      })
    }, 3000)

    return () => clearInterval(debugInterval)
  }, [router, allCompleted, deliveries, endOdometers])

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
      
      // 全ての送迎が完了しているかチェック（複数利用者対応）
      const completed = deliveryItems.every(item => {
        // 複数利用者の場合は、到着・出発時間の両方が記録されているかチェック
        if (item.detail) {
          const hasArrival = item.detail.arrival_time && item.detail.arrival_time.trim() !== ''
          const hasDeparture = item.detail.departure_time && item.detail.departure_time.trim() !== ''
          console.log(`初期完了チェック - 利用者 ${item.user?.name || item.user?.id}: 到着時刻=${item.detail.arrival_time}, 出発時刻=${item.detail.departure_time}, 完了=${hasArrival && hasDeparture}`)
          return hasArrival && hasDeparture
        }
        return item.record.status === 'completed'
      })
      console.log('初期全完了判定:', completed, 'deliveryItems:', deliveryItems.length)
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
      // 送迎記録の終了時走行距離と帰着時刻を更新
      const recordIds = deliveries.map(d => d.record.id)
      if (recordIds.length > 0) {
        await supabase
          .from('transportation_records')
          .update({
            end_odometer: finalOdometer,
            end_time: returnToOfficeTime || null,
            status: 'completed',
            updated_at: new Date().toISOString()
          })
          .in('id', recordIds)
      }

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 pb-safe">
      {/* モバイルヘッダー */}
      <div className="mobile-header">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <span className="text-2xl">🚐</span>
            </div>
            <div>
              <h1>送迎管理</h1>
              {session && (
                <div className="subtitle">{session.driverName} / {session.vehicleNo}</div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-white/90 text-sm font-mono bg-white/20 px-2 py-1 rounded">
              {currentTime}
            </div>
            <button
              onClick={handleLogout}
              className="btn-modern btn-outline text-sm bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              🚪
            </button>
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="container-mobile py-6">
        <div className="max-w-md mx-auto">
          {/* 今日の日付カード */}
          <div className="modern-card mb-6 fade-in">
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-white text-2xl">📅</span>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">今日の送迎一覧</h2>
              <p className="text-gray-600 text-sm">
                {new Date().toLocaleDateString('ja-JP', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric',
                  weekday: 'long' 
                })}
              </p>
            </div>
          </div>

          {deliveries.length === 0 ? (
            /* 空状態 */
            <div className="modern-card text-center p-8">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-gray-400 text-3xl">📋</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">送迎予定がありません</h3>
              <p className="text-gray-600 text-sm">
                本日の送迎はすべて完了しているか、まだ送迎が登録されていません。
              </p>
            </div>
          ) : (
            /* 送迎リスト */
            <div className="space-y-4">
              {deliveries.map((delivery, index) => (
                <div
                  key={delivery.record.id}
                  className="modern-card slide-up"
                  style={{animationDelay: `${index * 0.1}s`}}
                >
                  <div className="modern-card-header">
                    <div className="flex items-center gap-3">
                      <div className="user-avatar" style={{width: '3rem', height: '3rem', fontSize: '1.25rem', marginBottom: 0}}>
                        {delivery.user ? delivery.user.name.charAt(0) : '?'}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900">
                          {delivery.user ? delivery.user.name : '利用者不明'}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {delivery.user ? delivery.user.user_no : ''}
                        </p>
                        {delivery.user?.wheelchair_user && (
                          <span className="status-badge status-info text-xs mt-1">♿ 車椅子</span>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="status-badge status-success">
                          #{index + 1}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="modern-card-body">
                    {/* 到着・出発時刻 */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="text-xs font-medium text-gray-700 block mb-2">🚪 到着時刻</label>
                        {delivery.detail?.arrival_time ? (
                          <div className="flex items-center gap-2">
                            {editingTimes[`${delivery.record.id}-${delivery.user?.id}`]?.arrival !== undefined ? (
                              <div className="flex items-center gap-2 w-full">
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
                                  className="form-input text-sm py-2"
                                />
                                <button
                                  onClick={() => handleTimeEdit(delivery.record.id, 'arrival', editingTimes[`${delivery.record.id}-${delivery.user?.id}`]?.arrival || '', delivery.user?.id)}
                                  className="btn-modern btn-primary text-xs px-2 py-1"
                                >
                                  保存
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between w-full">
                                <span className="font-mono text-lg font-bold text-green-600">
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
                                  className="btn-modern btn-outline text-xs px-2 py-1"
                                >
                                  修正
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <button
                            onClick={() => handleArrivalTime(delivery.record.id, delivery.user?.id)}
                            className="btn-modern btn-primary w-full text-sm"
                          >
                            🚪 到着記録
                          </button>
                        )}
                      </div>

                      <div>
                        <label className="text-xs font-medium text-gray-700 block mb-2">🚗 出発時刻</label>
                        {delivery.detail?.departure_time ? (
                          <div className="flex items-center gap-2">
                            {editingTimes[`${delivery.record.id}-${delivery.user?.id}`]?.departure !== undefined ? (
                              <div className="flex items-center gap-2 w-full">
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
                                  className="form-input text-sm py-2"
                                />
                                <button
                                  onClick={() => handleTimeEdit(delivery.record.id, 'departure', editingTimes[`${delivery.record.id}-${delivery.user?.id}`]?.departure || '', delivery.user?.id)}
                                  className="btn-modern btn-primary text-xs px-2 py-1"
                                >
                                  保存
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between w-full">
                                <span className="font-mono text-lg font-bold text-blue-600">
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
                                  className="btn-modern btn-outline text-xs px-2 py-1"
                                >
                                  修正
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <button
                            onClick={() => handleDepartureTime(delivery.record.id, delivery.user?.id)}
                            disabled={!delivery.detail?.arrival_time}
                            className="btn-modern btn-success w-full text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            🚗 出発記録
                          </button>
                        )}
                      </div>
                    </div>

                    {/* 住所情報 */}
                    <div className="bg-gray-50 p-3 rounded-lg mb-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-gray-600">📍</span>
                        <span className="text-sm font-medium text-gray-700">送迎先</span>
                      </div>
                      <p className="text-sm text-gray-600">
                        {delivery.user && session?.selectedAddresses && session.selectedAddresses[delivery.user.id]
                          ? userAddressNames[session.selectedAddresses[delivery.user.id]] || '住所情報なし'
                          : delivery.user?.address || '住所情報なし'
                        }
                      </p>
                    </div>

                    {/* 安全確認フォーム */}
                    {showSafetyForm[delivery.record.id] && (
                      <div className="border-t border-gray-200 pt-4 mt-4">
                        <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                          <span className="text-blue-600">🛡️</span>
                          安全確認
                        </h4>
                        
                        {/* 安全確認項目をコンパクトに */}
                        <div className="space-y-3 text-sm">
                          <div>
                            <label className="block font-medium text-gray-700 mb-1">乗車時の安全確認</label>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => setSafetyData(prev => ({
                                  ...prev,
                                  [delivery.record.id]: {
                                    ...prev[delivery.record.id],
                                    boarding: 'no_problem'
                                  }
                                }))}
                                className={`btn-modern text-xs px-3 py-1 ${
                                  safetyData[delivery.record.id]?.boarding === 'no_problem' ? 'btn-success' : 'btn-outline'
                                }`}
                              >
                                ✅ 問題なし
                              </button>
                              <button
                                type="button"
                                onClick={() => setSafetyData(prev => ({
                                  ...prev,
                                  [delivery.record.id]: {
                                    ...prev[delivery.record.id],
                                    boarding: 'problem'
                                  }
                                }))}
                                className={`btn-modern text-xs px-3 py-1 ${
                                  safetyData[delivery.record.id]?.boarding === 'problem' ? 'btn-warning' : 'btn-outline'
                                }`}
                              >
                                ⚠️ 問題あり
                              </button>
                            </div>
                          </div>

                          <div>
                            <label className="block font-medium text-gray-700 mb-1">降車時の安全確認</label>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => setSafetyData(prev => ({
                                  ...prev,
                                  [delivery.record.id]: {
                                    ...prev[delivery.record.id],
                                    alighting: 'no_problem'
                                  }
                                }))}
                                className={`btn-modern text-xs px-3 py-1 ${
                                  safetyData[delivery.record.id]?.alighting === 'no_problem' ? 'btn-success' : 'btn-outline'
                                }`}
                              >
                                ✅ 問題なし
                              </button>
                              <button
                                type="button"
                                onClick={() => setSafetyData(prev => ({
                                  ...prev,
                                  [delivery.record.id]: {
                                    ...prev[delivery.record.id],
                                    alighting: 'problem'
                                  }
                                }))}
                                className={`btn-modern text-xs px-3 py-1 ${
                                  safetyData[delivery.record.id]?.alighting === 'problem' ? 'btn-warning' : 'btn-outline'
                                }`}
                              >
                                ⚠️ 問題あり
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2 mt-4">
                          <button
                            onClick={() => handleSaveSafetyData(delivery.record.id)}
                            className="btn-modern btn-primary flex-1 text-sm"
                          >
                            安全確認保存
                          </button>
                          <button
                            onClick={() => setShowSafetyForm(prev => ({
                              ...prev,
                              [delivery.record.id]: false
                            }))}
                            className="btn-modern btn-outline text-sm px-4"
                          >
                            閉じる
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="modern-card-footer">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowSafetyForm(prev => ({
                          ...prev,
                          [delivery.record.id]: !prev[delivery.record.id]
                        }))}
                        className="btn-modern btn-outline flex-1 text-sm"
                      >
                        🛡️ 安全確認
                      </button>
                      {delivery.detail?.arrival_time && delivery.detail?.departure_time && (
                        <div className="flex items-center text-green-600 text-sm font-medium">
                          ✅ 完了
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 送迎完了セクション */}
          {deliveries.length > 0 && allCompleted && (
            <div className="modern-card mt-6 slide-up">
              <div className="modern-card-header">
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-green-600 text-2xl">🎉</span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">送迎完了お疲れさまでした！</h3>
                  <p className="text-sm text-gray-600 mt-1">最終確認をして送迎を終了してください</p>
                </div>
              </div>

              <div className="modern-card-body space-y-4">
                {/* 終了時走行距離 */}
                <div>
                  <label className="block font-medium text-gray-700 mb-2">📏 終了時走行距離 (km)</label>
                  <input
                    type="number"
                    value={endOdometers['final'] || ''}
                    onChange={(e) => setEndOdometers(prev => ({
                      ...prev,
                      final: parseInt(e.target.value) || 0
                    }))}
                    className="form-input"
                    placeholder="走行距離を入力"
                  />
                </div>

                {/* 事業所帰着時刻 */}
                <div>
                  <label className="block font-medium text-gray-700 mb-2">🏢 事業所帰着時刻</label>
                  <div className="time-picker">
                    <input
                      type="time"
                      value={returnToOfficeTime}
                      onChange={(e) => setReturnToOfficeTime(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setReturnToOfficeTime(new Date().toTimeString().slice(0, 5))}
                      className="btn-modern btn-outline text-sm px-3 py-1"
                    >
                      現在時刻
                    </button>
                  </div>
                </div>
              </div>

              <div className="modern-card-footer">
                <button
                  onClick={handleCompleteAllDeliveries}
                  disabled={!endOdometers['final'] || !returnToOfficeTime}
                  className="btn-modern btn-success btn-lg w-full disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  🏁 本日の送迎を終了する
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* フローティングアクションボタン - 新しい送迎 */}
      {deliveries.length === 0 && (
        <button
          onClick={() => router.push('/login')}
          className="fab"
          title="新しい送迎を開始"
        >
          ➕
        </button>
      )}
    </div>
  )
}