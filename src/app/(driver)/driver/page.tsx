'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { TransportationRecord, User } from '@/types'
import Link from 'next/link'

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
  startOdometer?: number
  managementCodeId?: string
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
      const addressIds = Object.values(selectedAddresses).filter(id => id && id !== '')
      if (addressIds.length === 0) {
        console.log('住所IDが空のためスキップ')
        return
      }

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
      const today = new Date().toISOString().split('T')[0]
      
      // セッションから管理コードIDを取得
      const sessionData = localStorage.getItem('driverSession')
      if (!sessionData) {
        console.error('ドライバーセッションが見つかりません')
        return
      }
      
      const driverSession = JSON.parse(sessionData) as DriverSession
      const managementCodeId = driverSession.managementCodeId
      
      if (!managementCodeId) {
        console.error('管理コードIDが設定されていません')
        return
      }
      
      console.log('送迎記録取得条件:', {
        driver_id: driverId,
        transportation_date: today,
        management_code_id: managementCodeId
      })
      
      // セッションから現在の送迎記録IDを取得
      const deliveryRecordIds = driverSession.deliveryRecordIds || []
      console.log('セッションの送迎記録IDs:', deliveryRecordIds)
      
      if (deliveryRecordIds.length === 0) {
        console.log('セッションに送迎記録IDがありません')
        setDeliveries([])
        setIsLoading(false)
        return
      }
      
      // 管理コードIDが一致するかを確認するためのクエリ
      let query = supabase
        .from('transportation_records')
        .select('*')
        .in('id', deliveryRecordIds)
        .order('created_at', { ascending: true })
      
      // 管理コードIDがある場合のみフィルタリング
      if (managementCodeId) {
        query = query.eq('management_code_id', managementCodeId)
      }
      
      const { data: records, error } = await query

      console.log('取得した送迎記録:', records)
      console.log('取得エラー:', error)
      
      if (error) throw error

      // 各送迎記録に対応する利用者詳細情報を取得
      const deliveryItems: DeliveryItem[] = []
      
      // セッション情報を再利用
      const currentSession = driverSession
      
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
              
              // 詳細記録がない場合は作成
              if (!detail) {
                console.log('詳細記録が見つからないため作成します:', userId)
                const detailData = {
                  transportation_record_id: record.id,
                  user_id: userId,
                  pickup_address_id: currentSession.selectedAddresses?.[userId] || null,
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
                  .insert(detailData)
                  .select()
                  .single()
                  
                if (!createError && newDetail) {
                  detail = newDetail
                  console.log('詳細記録を作成しました:', newDetail)
                } else {
                  console.error('詳細記録の作成に失敗:', createError)
                }
              }
              
              // デバッグ: 詳細記録の内容を確認
              if (detail) {
                console.log('既存の詳細記録:', {
                  detailId: detail.id,
                  userId: detail.user_id,
                  arrival_time: detail.arrival_time,
                  departure_time: detail.departure_time,
                  pickup_address_id: detail.pickup_address_id
                })
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
      // 送迎記録がない場合はallCompletedをfalseにする
      setAllCompleted(deliveryItems.length > 0 && completed)
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
        const { data: existingDetail, error: detailFetchError } = await supabase
          .from('transportation_details')
          .select('id')
          .eq('transportation_record_id', recordId)
          .eq('user_id', userId)
          .single()
        
        if (!existingDetail || detailFetchError) {
          console.error('対応する詳細記録が見つかりません:', { 
            recordId, 
            userId, 
            error: detailFetchError,
            message: '詳細記録の取得に失敗しました'
          })
          
          // 詳細記録が存在しない場合は作成を試みる
          console.log('詳細記録を新規作成します（到着時間記録時）')
          const { data: newDetail, error: createError } = await supabase
            .from('transportation_details')
            .insert({
              transportation_record_id: recordId,
              user_id: userId,
              arrival_time: currentTimeStr + ':00',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select()
            .single()
            
          if (createError) {
            console.error('詳細記録の作成に失敗:', createError)
            alert('詳細記録の作成に失敗しました')
            return
          }
          
          console.log('詳細記録を作成しました:', newDetail)
          
          // 状態を更新
          setDeliveries(prev => 
            prev.map(item => 
              item.record.id === recordId && item.user?.id === userId
                ? { 
                    ...item, 
                    detail: newDetail
                  }
                : item
            )
          )
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
        const { data: existingDetail, error: detailFetchError } = await supabase
          .from('transportation_details')
          .select('id')
          .eq('transportation_record_id', recordId)
          .eq('user_id', userId)
          .single()
        
        if (!existingDetail || detailFetchError) {
          console.error('対応する詳細記録が見つかりません:', { 
            recordId, 
            userId, 
            error: detailFetchError,
            message: '詳細記録の取得に失敗しました'
          })
          
          // 詳細記録が存在しない場合は作成を試みる
          console.log('詳細記録を新規作成します（出発時間記録時）')
          const { data: newDetail, error: createError } = await supabase
            .from('transportation_details')
            .insert({
              transportation_record_id: recordId,
              user_id: userId,
              departure_time: currentTimeStr + ':00',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select()
            .single()
            
          if (createError) {
            console.error('詳細記録の作成に失敗:', createError)
            alert('詳細記録の作成に失敗しました')
            return
          }
          
          console.log('詳細記録を作成しました:', newDetail)
          
          // 状態を更新
          setDeliveries(prev => 
            prev.map(item => 
              item.record.id === recordId && item.user?.id === userId
                ? { 
                    ...item, 
                    detail: newDetail
                  }
                : item
            )
          )
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
        // 送迎完了ページに遷移
        router.push(`/transportation-complete?recordId=${recordId}`)
        // 完了ページ遷移後にセッションをクリア
        setTimeout(() => {
          localStorage.removeItem('driverSession')
        }, 1000)
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
      <div className="driver-mobile-layout driver-desktop-layout">
        <div className="max-w-md mx-auto lg:max-w-4xl">
          {/* 今日の日付カード */}
          <div className="modern-card mb-4 fade-in">
            <div className="text-center p-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-white text-lg">📅</span>
              </div>
              <h2 className="text-lg font-bold text-gray-900 mb-1">今日の送迎一覧</h2>
              <p className="text-gray-600 text-xs">
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
              <p className="text-gray-600 text-sm mb-4">
                本日の送迎はすべて完了しているか、まだ送迎が登録されていません。
              </p>
              
              {/* デバッグ情報 */}
              <div className="bg-gray-50 p-4 rounded-lg text-left text-xs">
                <p className="font-bold mb-2">デバッグ情報:</p>
                <p>セッション: {session ? 'あり' : 'なし'}</p>
                {session && (
                  <>
                    <p>ドライバー: {session.driverName}</p>
                    <p>車両: {session.vehicleNo}</p>
                    <p>選択利用者数: {session.selectedUsers?.length || 0}</p>
                    <p>送迎記録ID数: {session.deliveryRecordIds?.length || 0}</p>
                    <p>送迎記録IDs: {JSON.stringify(session.deliveryRecordIds)}</p>
                  </>
                )}
              </div>
            </div>
          ) : (
            /* 送迎リスト */
            <div className="space-y-3 lg:driver-card-grid">
              {deliveries.map((delivery, index) => (
                <div
                  key={delivery.record.id}
                  className="modern-card slide-up"
                  style={{animationDelay: `${index * 0.1}s`}}
                >
                  <div className="modern-card-header">
                    <div className="flex items-center gap-3">
                      <div className="user-avatar" style={{width: '2.5rem', height: '2.5rem', fontSize: '1rem', marginBottom: 0}}>
                        {delivery.user ? delivery.user.name.charAt(0) : '?'}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900 text-sm">
                          {delivery.user ? delivery.user.name : '利用者不明'}
                        </h3>
                        <p className="text-xs text-gray-600">
                          {delivery.user ? delivery.user.user_no : ''}
                        </p>
                        {delivery.user?.wheelchair_user && (
                          <span className="status-badge status-info text-xs mt-1">♿</span>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="status-badge status-success text-xs">
                          #{index + 1}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="modern-card-body">
                    {/* 到着・出発時刻 */}
                    <div className="space-y-3 mb-3">
                      <div>
                        <label className="text-xs font-medium text-gray-700 block mb-1">🚪 到着時刻</label>
                        {delivery.detail?.arrival_time ? (
                          <div className="space-y-2">
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
                                  className="form-input text-sm py-2 flex-1"
                                />
                                <button
                                  onClick={() => handleTimeEdit(delivery.record.id, 'arrival', editingTimes[`${delivery.record.id}-${delivery.user?.id}`]?.arrival || '', delivery.user?.id)}
                                  className="btn-modern btn-primary text-xs px-3 py-2"
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
                                  className="btn-modern btn-outline text-xs px-3 py-1"
                                >
                                  修正
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <button
                            onClick={() => handleArrivalTime(delivery.record.id, delivery.user?.id)}
                            className="btn-modern btn-primary w-full text-sm py-2"
                          >
                            🚪 到着記録
                          </button>
                        )}
                      </div>

                      <div>
                        <label className="text-xs font-medium text-gray-700 block mb-1">🚗 出発時刻</label>
                        {delivery.detail?.departure_time ? (
                          <div className="space-y-2">
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
                                  className="form-input text-sm py-2 flex-1"
                                />
                                <button
                                  onClick={() => handleTimeEdit(delivery.record.id, 'departure', editingTimes[`${delivery.record.id}-${delivery.user?.id}`]?.departure || '', delivery.user?.id)}
                                  className="btn-modern btn-primary text-xs px-3 py-2"
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
                                  className="btn-modern btn-outline text-xs px-3 py-1"
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
                            className="btn-modern btn-success w-full text-sm py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            🚗 出発記録
                          </button>
                        )}
                      </div>
                    </div>

                    {/* 住所情報 */}
                    <div className="bg-gray-50 p-2 rounded-lg mb-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-gray-600 text-xs">🏠</span>
                        <span className="text-xs font-medium text-gray-700">送迎先住所</span>
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed">
                        {delivery.user && session?.selectedAddresses && session.selectedAddresses[delivery.user.id]
                          ? userAddressNames[session.selectedAddresses[delivery.user.id]] || '住所情報なし'
                          : delivery.user?.address || '住所情報なし'
                        }
                      </p>
                    </div>

                  </div>

                  <div className="modern-card-footer">
                    {delivery.detail?.arrival_time && delivery.detail?.departure_time && (
                      <div className="text-center text-green-600 text-sm font-medium">
                        ✅ 完了
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 全送迎完了カード */}
          {allCompleted && session && deliveries.length > 0 && (
            <div className="modern-card mb-4 fade-in bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <div className="p-4">
                <div className="text-center mb-3">
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-white">✅</span>
                  </div>
                  <h3 className="text-base font-bold text-gray-900 mb-1">全送迎完了</h3>
                  <p className="text-xs text-gray-600">お疲れ様でした！記録を完了してください</p>
                </div>

                {/* 終了時走行距離入力 */}
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-700 block mb-1">📏 終了時走行距離（km）</label>
                    <div className="relative">
                      <input
                        type="number"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={endOdometers['final'] || ''}
                        onChange={(e) => setEndOdometers(prev => ({
                          ...prev,
                          final: parseInt(e.target.value) || 0
                        }))}
                        className="form-input text-center text-lg font-mono pr-12"
                        placeholder=""
                        min={session.startOdometer || 0}
                      />
                      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">km</span>
                    </div>
                    {session.startOdometer && (
                      <p className="text-xs text-gray-500 mt-1">開始時: {session.startOdometer} km</p>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-700 block mb-1">🕐 終了時刻</label>
                    <div className="flex gap-2">
                      <input
                        type="time"
                        value={returnToOfficeTime}
                        onChange={(e) => setReturnToOfficeTime(e.target.value)}
                        className="form-input flex-1 text-center text-lg"
                      />
                      <button
                        type="button"
                        onClick={() => setReturnToOfficeTime(new Date().toTimeString().slice(0, 5))}
                        className="btn-modern btn-outline text-xs px-3 py-2 whitespace-nowrap"
                      >
                        現在時刻
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={handleCompleteAllDeliveries}
                    disabled={!endOdometers['final'] || !returnToOfficeTime}
                    className="btn-modern btn-success w-full py-3 text-base font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    🏁 すべての送迎を完了する
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 新しい送迎を開始するボタン */}
          <div className="fixed bottom-6 right-6">
            <Link
              href="/login"
              className="fab bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-xl hover:shadow-2xl"
            >
              <span className="text-xl">➕</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}