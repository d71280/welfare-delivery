'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface DriverSession {
  driverId: string
  driverName: string
  vehicleId: string
  vehicleNo: string
  loginTime: string
  startTime: string
  endTime: string | null
  selectedRoute: string
  routeName: string
  deliveryRecordId?: string
}

interface DeliveryDestination {
  id: string
  order: number
  customerName: string
  address: string
  phoneNumber: string
  deliveryType: string
  packageCount: number
  specialInstructions: string
  estimatedTime: string
  status: string
  arrivalTime?: string
  departureTime?: string
}

/* interface RouteDestination {
  id: string
  order: number
  customerName: string
  address: string
  phoneNumber: string
  deliveryType: string
  packageCount: number
  specialInstructions: string
  estimatedTime: string
  actualStartTime: string
  actualEndTime: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
} */

interface RouteInfo {
  id: string
  route_name: string
  start_location: string
  end_location: string
  estimated_time: string
  distance: string
}

export default function RouteDetailsPage() {
  const [session, setSession] = useState<DriverSession | null>(null)
  const [route, setRoute] = useState<RouteInfo | null>(null)
  const [destinations, setDestinations] = useState<DeliveryDestination[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState('')
  const [deliveryRecordId, setDeliveryRecordId] = useState<string | null>(null)
  const [arrivalTimes, setArrivalTimes] = useState<{[key: string]: string}>({})
  const [departureTimes, setDepartureTimes] = useState<{[key: string]: string}>({})
  const [startMileage, setStartMileage] = useState('')
  const [endMileage, setEndMileage] = useState('')
  const [lastOilChangeMileage, setLastOilChangeMileage] = useState<number | null>(null)
  const [newOilChangeMileage, setNewOilChangeMileage] = useState('')
  const [oilChangePerformed, setOilChangePerformed] = useState(false)
  const [deliveryEndTime, setDeliveryEndTime] = useState('')
  
  const router = useRouter()
  const params = useParams()
  const supabase = createClient()
  const routeId = params.routeId as string

  // lastOilChangeMileageの変更を監視
  useEffect(() => {
    console.log('🎯 オイル交換状態変更:', lastOilChangeMileage)
  }, [lastOilChangeMileage])

  useEffect(() => {
    // セッション情報を取得
    const sessionData = localStorage.getItem('driverSession')
    if (!sessionData) {
      router.push('/login')
      return
    }

    const parsedSession = JSON.parse(sessionData) as DriverSession
    setSession(parsedSession)
    
    // 配送記録IDを取得または作成
    if (parsedSession.deliveryRecordId) {
      setDeliveryRecordId(parsedSession.deliveryRecordId)
    } else {
      // セッションに配送記録IDがない場合は、今日の配送記録を検索
      checkExistingDeliveryRecord(parsedSession)
    }

    // 車両のオイル交換情報を取得（セッション取得後すぐに実行）
    console.log('🔍 セッション情報確認:', {
      vehicleId: parsedSession.vehicleId,
      vehicleNo: parsedSession.vehicleNo,
      driverId: parsedSession.driverId
    })
    
    if (parsedSession.vehicleId) {
      console.log('🚀 車両オイル交換データ取得開始')
      // Supabaseクライアントの接続テスト
      supabase.from('vehicles').select('count').then(result => {
        console.log('🔌 Supabase接続テスト:', result)
      })
      
      fetchVehicleOilChangeData(parsedSession.vehicleId)
    } else {
      console.log('❌ 車両IDが見つかりません')
    }

    // 現在時刻を更新
    const updateTime = () => {
      const now = new Date()
      setCurrentTime(now.toLocaleTimeString('ja-JP', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }))
    }
    
    updateTime()
    const interval = setInterval(updateTime, 1000)

    // ルート情報と配送先情報を取得
    fetchRouteData()

    return () => clearInterval(interval)
  }, [router, routeId])

  const checkExistingDeliveryRecord = async (session: DriverSession) => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const { data: existingRecord } = await supabase
        .from('delivery_records')
        .select('id')
        .eq('driver_id', session.driverId)
        .eq('vehicle_id', session.vehicleId)
        .eq('route_id', routeId)
        .eq('delivery_date', today)
        .single()

      if (existingRecord) {
        setDeliveryRecordId(existingRecord.id)
        // セッションを更新
        const updatedSession = { ...session, deliveryRecordId: existingRecord.id }
        localStorage.setItem('driverSession', JSON.stringify(updatedSession))
      }
    } catch (error) {
      console.error('既存配送記録取得エラー:', error)
    }
  }

  const fetchVehicleOilChangeData = async (vehicleId: string) => {
    try {
      console.log('🚗 車両オイル交換データ取得開始 - ID:', vehicleId)
      
      const { data: vehicleData, error } = await supabase
        .from('vehicles')
        .select('id, vehicle_no, last_oil_change_odometer, current_odometer')
        .eq('id', vehicleId)
        .single()

      console.log('📊 Supabaseクエリ結果:', { data: vehicleData, error })

      if (error) {
        console.error('❌ 車両データ取得エラー:', error)
        return
      }

      if (vehicleData && vehicleData.last_oil_change_odometer !== null) {
        const oilChangeMileage = vehicleData.last_oil_change_odometer
        console.log('✅ オイル交換記録取得:', oilChangeMileage)
        setLastOilChangeMileage(oilChangeMileage)
        console.log('🔄 状態更新完了:', oilChangeMileage)
      } else {
        console.log('⚠️ オイル交換記録なし')
        setLastOilChangeMileage(null)
      }
    } catch (error) {
      console.error('💥 車両オイル交換データ取得エラー:', error)
    }
  }



  const fetchRouteData = async () => {
    try {
      setIsLoading(true)
      
      // ルート情報を取得
      const { data: routeData, error: routeError } = await supabase
        .from('routes')
        .select('*')
        .eq('id', routeId)
        .single()

      if (routeError) throw routeError
      setRoute(routeData)

      // 配送記録を作成または取得
      await createOrGetDeliveryRecord()

      // 車両のオイル交換情報は useEffect で取得済み

      // 実際の配送先データを取得
      const { data: destinationsData, error: destError } = await supabase
        .from('destinations')
        .select('*')
        .eq('route_id', routeId)
        .eq('is_active', true)
        .order('display_order')

      if (destError) {
        console.error('配送先取得エラー:', destError)
        // エラー時はデモデータを使用
        setDestinations(getDemoDestinations())
      } else if (destinationsData && destinationsData.length > 0) {
        // 実データを配送先形式に変換
        const formattedDestinations: DeliveryDestination[] = destinationsData.map((dest, index) => ({
          id: dest.id,
          order: dest.display_order,
          customerName: dest.name,
          address: dest.address || '',
          phoneNumber: '', // 配送先テーブルに電話番号がない場合のデフォルト
          deliveryType: '通常配送',
          packageCount: 1,
          specialInstructions: '',
          estimatedTime: `${9 + Math.floor(index * 0.75)}:${(index * 45) % 60 < 10 ? '0' : ''}${(index * 45) % 60}`,
          status: 'pending'
        }))
        setDestinations(formattedDestinations)
      } else {
        // データがない場合はデモデータを使用
        setDestinations(getDemoDestinations())
      }
    } catch (err) {
      console.error('データ取得エラー:', err)
      setDestinations(getDemoDestinations())
    } finally {
      setIsLoading(false)
    }
  }

  const getDemoDestinations = (): DeliveryDestination[] => [
    {
      id: '1',
      order: 1,
      customerName: '株式会社ABC商事',
      address: '東京都渋谷区渋谷1-2-3 ABCビル5F',
      phoneNumber: '03-1234-5678',
      deliveryType: '通常配送',
      packageCount: 3,
      specialInstructions: '受付にて要サイン',
      estimatedTime: '09:30',
      status: 'pending'
    },
    {
      id: '2',
      order: 2,
      customerName: 'DEF株式会社',
      address: '東京都渋谷区道玄坂2-4-5 DEFタワー12F',
      phoneNumber: '03-2345-6789',
      deliveryType: '冷蔵配送',
      packageCount: 1,
      specialInstructions: '冷蔵品注意・時間厳守',
      estimatedTime: '10:15',
      status: 'pending'
    },
    {
      id: '3',
      order: 3,
      customerName: 'GHI商店',
      address: '東京都渋谷区神南1-6-7',
      phoneNumber: '03-3456-7890',
      deliveryType: '通常配送',
      packageCount: 2,
      specialInstructions: '裏口配送希望',
      estimatedTime: '11:00',
      status: 'pending'
    },
    {
      id: '4',
      order: 4,
      customerName: 'JKL医院',
      address: '東京都渋谷区宇田川町8-9-10',
      phoneNumber: '03-4567-8901',
      deliveryType: '医療用品',
      packageCount: 1,
      specialInstructions: '医療品・取扱注意・院長直接受取',
      estimatedTime: '11:45',
      status: 'pending'
    },
    {
      id: '5',
      order: 5,
      customerName: 'MNO食品株式会社',
      address: '東京都渋谷区桜丘町11-12-13 MNOビル3F',
      phoneNumber: '03-5678-9012',
      deliveryType: '食品配送',
      packageCount: 5,
      specialInstructions: '要冷蔵・搬入口指定あり',
      estimatedTime: '12:30',
      status: 'pending'
    },
    {
      id: '6',
      order: 6,
      customerName: 'PQR個人宅',
      address: '東京都渋谷区恵比寿14-15-16 エビスマンション201号',
      phoneNumber: '090-1234-5678',
      deliveryType: '宅配',
      packageCount: 1,
      specialInstructions: '不在時は宅配ボックス利用可',
      estimatedTime: '13:15',
      status: 'pending'
    }
  ]

  const createOrGetDeliveryRecord = async () => {
    if (!session) {
      console.error('セッションが見つかりません')
      return
    }

    try {
      const today = new Date().toISOString().split('T')[0]
      console.log('配送記録を作成または取得中:', {
        today,
        driverId: session.driverId,
        vehicleId: session.vehicleId,
        routeId
      })
      
      // 今日の配送記録があるかチェック
      const { data: existingRecords, error: fetchError } = await supabase
        .from('delivery_records')
        .select('id, start_odometer, end_odometer, status')
        .eq('driver_id', session.driverId)
        .eq('vehicle_id', session.vehicleId)
        .eq('route_id', routeId)
        .eq('delivery_date', today)
        
      const existingRecord = existingRecords?.[0]

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('既存配送記録取得エラー:', fetchError)
      }

      if (existingRecord) {
        console.log('既存の配送記録を使用:', existingRecord)
        setDeliveryRecordId(existingRecord.id)
        setStartMileage(existingRecord.start_odometer?.toString() || '')
        setEndMileage(existingRecord.end_odometer?.toString() || '')
        return
      }

      // 車両の現在の走行距離を取得（車両管理画面と同じロジック）
      const { data: lastRecords, error: lastRecordError } = await supabase
        .from('delivery_records')
        .select('end_odometer')
        .eq('vehicle_id', session.vehicleId)
        .not('end_odometer', 'is', null)
        .order('delivery_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1)
        
      const lastRecord = lastRecords?.[0]

      if (lastRecordError && lastRecordError.code !== 'PGRST116') {
        console.error('車両走行距離取得エラー:', lastRecordError)
      }

      const currentMileage = lastRecord?.end_odometer || 0
      console.log('=== 走行距離データ取得 ===')
      console.log('車両ID:', session.vehicleId)
      console.log('車両番号:', session.vehicleNo)
      console.log('取得した配送記録:', lastRecords)
      console.log('車両の現在の走行距離:', currentMileage)
      console.log('==========================')
      setStartMileage(currentMileage.toString())

      // 車両のオイル交換履歴を取得
      const { data: vehicleRecords, error: vehicleError } = await supabase
        .from('vehicles')
        .select('last_oil_change_odometer')
        .eq('id', session.vehicleId)
        
      const vehicleData = vehicleRecords?.[0]

      if (vehicleError) {
        console.error('車両データ取得エラー:', vehicleError)
      }

      if (vehicleData) {
        console.log('=== オイル交換履歴データ ===')
        console.log('車両データ:', vehicleData)
        console.log('前回オイル交換走行距離:', vehicleData.last_oil_change_odometer)
        console.log('==========================')
        setLastOilChangeMileage(vehicleData.last_oil_change_odometer)
      }

      // 新しい配送記録を作成
      const insertData = {
        delivery_date: today,
        driver_id: session.driverId,
        vehicle_id: session.vehicleId,
        route_id: routeId,
        start_odometer: currentMileage,
        end_odometer: 0,
        gas_card_used: false,
        status: 'in_progress',
        start_time: session.startTime || new Date().toLocaleTimeString('ja-JP', { hour12: false, hour: '2-digit', minute: '2-digit' })
      }
      
      console.log('新しい配送記録を作成:', insertData)
      
      const { data: newRecord, error: insertError } = await supabase
        .from('delivery_records')
        .insert(insertData)
        .select('id')
        .single()

      if (insertError) {
        console.error('配送記録作成エラー:', insertError)
        
        // 409エラー（重複）の場合は、既存の記録を再取得
        if (insertError.code === '23505' || insertError.message?.includes('duplicate')) {
          console.log('重複エラー発生、既存の記録を再取得します')
          const { data: existingRecords } = await supabase
            .from('delivery_records')
            .select('id')
            .eq('driver_id', session.driverId)
            .eq('vehicle_id', session.vehicleId)
            .eq('route_id', routeId)
            .eq('delivery_date', today)
            .limit(1)
          
          if (existingRecords && existingRecords.length > 0) {
            console.log('既存の記録を使用:', existingRecords[0])
            setDeliveryRecordId(existingRecords[0].id)
            return
          } else {
            console.log('既存の記録が見つからない、新しい記録を作成')
          }
        }
        
        return
      }

      if (newRecord) {
        console.log('新しい配送記録が作成されました:', newRecord)
        setDeliveryRecordId(newRecord.id)
      }
    } catch (error) {
      console.error('配送記録処理エラー:', error)
    }
  }

  const handleArrival = async (destinationId: string) => {
    const now = new Date()
    const currentTime = now.toLocaleTimeString('ja-JP', { hour12: false, hour: '2-digit', minute: '2-digit' })
    
    console.log('到着処理開始:', { destinationId, currentTime, deliveryRecordId })
    
    // 到着時間を設定（手入力可能）
    setArrivalTimes(prev => ({
      ...prev,
      [destinationId]: currentTime
    }))
    
    // 配送詳細の到着時間を保存
    await saveArrivalTime(destinationId, currentTime)
    
    // ローカル状態を更新（到着状態に変更）
    setDestinations(prev => 
      prev.map(dest => {
        if (dest.id === destinationId) {
          return { ...dest, status: 'in_progress', arrivalTime: currentTime }
        }
        return dest
      })
    )
  }

  const handleDeparture = async (destinationId: string) => {
    const now = new Date()
    const currentTime = now.toLocaleTimeString('ja-JP', { hour12: false, hour: '2-digit', minute: '2-digit' })
    
    // 出発時間を設定（手入力可能）
    setDepartureTimes(prev => ({
      ...prev,
      [destinationId]: currentTime
    }))
    
    // 配送詳細の出発時間を保存
    await saveDepartureTime(destinationId, currentTime)
    
    // ローカル状態を更新（完了状態に変更）
    setDestinations(prev => 
      prev.map(dest => {
        if (dest.id === destinationId) {
          return { ...dest, status: 'completed', departureTime: currentTime }
        }
        return dest
      })
    )
  }

  const handleDestinationToggle = async (destinationId: string, newStatus: 'completed' | 'failed' | 'pending') => {
    const currentTime = new Date().toLocaleTimeString('ja-JP', { hour12: false, hour: '2-digit', minute: '2-digit' })
    
    // ローカル状態を更新
    setDestinations(prev => 
      prev.map(dest => {
        if (dest.id === destinationId) {
          const updated = { ...dest, status: newStatus }
          if (newStatus === 'completed' || newStatus === 'failed') {
            if (!updated.arrivalTime) {
              updated.arrivalTime = currentTime
            }
            updated.departureTime = currentTime
          }
          return updated
        }
        return dest
      })
    )

    // データベースに保存
    await saveDeliveryDetail(destinationId, newStatus, currentTime)
  }

  const saveArrivalTime = async (destinationId: string, arrivalTime: string) => {
    if (!deliveryRecordId) {
      console.error('配送記録IDが見つかりません')
      return
    }

    try {
      console.log('到着時間保存開始:', { deliveryRecordId, destinationId, arrivalTime })
      
      // 既存の配送詳細があるかチェック
      const { data: existingDetails } = await supabase
        .from('delivery_details')
        .select('id')
        .eq('delivery_record_id', deliveryRecordId)
        .eq('destination_id', destinationId)

      const existingDetail = existingDetails?.[0]

      if (existingDetail) {
        // 更新
        const { error } = await supabase
          .from('delivery_details')
          .update({
            arrival_time: arrivalTime,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingDetail.id)
          
        if (error) {
          console.error('到着時間更新エラー:', error)
        } else {
          console.log('到着時間更新成功:', existingDetail.id)
        }
      } else {
        // 新規作成
        const { data, error } = await supabase
          .from('delivery_details')
          .insert({
            delivery_record_id: deliveryRecordId,
            destination_id: destinationId,
            arrival_time: arrivalTime,
            has_invoice: false
          })
          .select()
          
        if (error) {
          console.error('到着時間作成エラー:', error)
        } else {
          console.log('到着時間作成成功:', data)
        }
      }
    } catch (error) {
      console.error('到着時間保存エラー:', error)
    }
  }

  const saveDepartureTime = async (destinationId: string, departureTime: string) => {
    if (!deliveryRecordId) {
      console.error('配送記録IDが見つかりません')
      return
    }

    try {
      console.log('出発時間保存開始:', { deliveryRecordId, destinationId, departureTime })
      
      // 既存の配送詳細があるかチェック
      const { data: existingDetails } = await supabase
        .from('delivery_details')
        .select('id')
        .eq('delivery_record_id', deliveryRecordId)
        .eq('destination_id', destinationId)

      const existingDetail = existingDetails?.[0]

      if (existingDetail) {
        // 更新
        const { error } = await supabase
          .from('delivery_details')
          .update({
            departure_time: departureTime,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingDetail.id)
          
        if (error) {
          console.error('出発時間更新エラー:', error)
        } else {
          console.log('出発時間更新成功:', existingDetail.id)
        }
      } else {
        // 新規作成（到着時間がまだ記録されていない場合）
        const { data, error } = await supabase
          .from('delivery_details')
          .insert({
            delivery_record_id: deliveryRecordId,
            destination_id: destinationId,
            departure_time: departureTime,
            has_invoice: false
          })
          .select()
          
        if (error) {
          console.error('出発時間作成エラー:', error)
        } else {
          console.log('出発時間作成成功:', data)
        }
      }
    } catch (error) {
      console.error('出発時間保存エラー:', error)
    }
  }

  const saveMileage = async (isStart: boolean, mileage: string) => {
    if (!deliveryRecordId) {
      console.error('配送記録IDが見つかりません')
      return
    }

    try {
      const updateData = isStart 
        ? { start_odometer: parseFloat(mileage) || 0 }
        : { end_odometer: parseFloat(mileage) || 0 }

      await supabase
        .from('delivery_records')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', deliveryRecordId)
    } catch (error) {
      console.error('走行距離保存エラー:', error)
    }
  }



  const handleOilChangeSubmit = async () => {
    if (!newOilChangeMileage) {
      alert('オイル交換時の走行距離を入力してください')
      return
    }

    const mileage = parseFloat(newOilChangeMileage)
    if (isNaN(mileage) || mileage <= 0) {
      alert('有効な走行距離を入力してください')
      return
    }

    if (lastOilChangeMileage && mileage <= lastOilChangeMileage) {
      alert('前回のオイル交換よりも大きい走行距離を入力してください')
      return
    }

    try {
      if (!session?.vehicleId) {
        alert('車両情報が見つかりません')
        return
      }

      // 車両の last_oil_change_odometer を更新
      const { error } = await supabase
        .from('vehicles')
        .update({
          last_oil_change_odometer: mileage,
          updated_at: new Date().toISOString()
        })
        .eq('id', session.vehicleId)

      if (error) {
        console.error('オイル交換記録更新エラー:', error)
        alert('オイル交換記録の保存に失敗しました')
        return
      }

      // 状態を更新
      setLastOilChangeMileage(mileage)
      setOilChangePerformed(true)
      setNewOilChangeMileage('')
      
      console.log('オイル交換記録を保存しました:', mileage)
    } catch (error) {
      console.error('オイル交換記録処理エラー:', error)
      alert('オイル交換記録の保存中にエラーが発生しました')
    }
  }

  const getNextOilChangeKm = () => {
    if (!lastOilChangeMileage) return null
    return lastOilChangeMileage + 5000
  }

  const getOilChangeStatus = () => {
    if (!lastOilChangeMileage || !startMileage) return null
    
    const nextOilChange = getNextOilChangeKm()
    if (!nextOilChange) return null
    
    const currentMileage = parseFloat(startMileage)
    const remaining = nextOilChange - currentMileage
    
    if (remaining <= 0) {
      return { status: 'overdue', message: `オイル交換が ${Math.abs(remaining)}km 遅れています`, color: 'text-red-600' }
    } else if (remaining <= 500) {
      return { status: 'due_soon', message: `オイル交換まで ${remaining}km`, color: 'text-yellow-600' }
    } else {
      return { status: 'ok', message: `オイル交換まで ${remaining}km`, color: 'text-green-600' }
    }
  }

  const saveDeliveryDetail = async (destinationId: string, status: string, currentTime: string) => {
    if (!deliveryRecordId) {
      console.error('配送記録IDが見つかりません')
      return
    }

    try {
      // 既存の配送詳細があるかチェック
      const { data: existingDetail } = await supabase
        .from('delivery_details')
        .select('id, arrival_time')
        .eq('delivery_record_id', deliveryRecordId)
        .eq('destination_id', destinationId)
        .single()

      if (existingDetail) {
        // 更新
        const updateData: {
          departure_time: string
          updated_at: string
          arrival_time?: string
        } = {
          departure_time: currentTime,
          updated_at: new Date().toISOString()
        }

        // 到着時間がまだ設定されていない場合は設定
        if (!existingDetail.arrival_time) {
          updateData.arrival_time = currentTime
        }

        const { error: updateError } = await supabase
          .from('delivery_details')
          .update(updateData)
          .eq('id', existingDetail.id)

        if (updateError) {
          console.error('配送詳細更新エラー:', updateError)
        }
      } else {
        // 新規作成
        const { error: insertError } = await supabase
          .from('delivery_details')
          .insert({
            delivery_record_id: deliveryRecordId,
            destination_id: destinationId,
            arrival_time: currentTime,
            departure_time: currentTime,
            has_invoice: status === 'completed',
            remarks: status === 'failed' ? '配送失敗' : null
          })

        if (insertError) {
          console.error('配送詳細作成エラー:', insertError)
        }
      }
    } catch (error) {
      console.error('配送詳細保存エラー:', error)
    }
  }

  const handleBack = () => {
    router.push('/login')
  }

  const handleCompleteDelivery = async () => {
    console.log('=== 配送完了処理開始 ===')
    console.log('セッション情報:', session)
    console.log('終了走行距離:', endMileage)
    console.log('配送終了時刻:', deliveryEndTime)
    
    if (!session) {
      alert('セッション情報が見つかりません。再度ログインしてください。')
      router.push('/login')
      return
    }

    if (!endMileage) {
      alert('終了走行距離を入力してください')
      return
    }

    // 走行距離のバリデーション
    const endOdometerValue = parseInt(endMileage)
    if (isNaN(endOdometerValue) || endOdometerValue < 0) {
      alert('有効な走行距離を入力してください')
      return
    }

    const startOdometerValue = parseInt(startMileage) || 0
    if (endOdometerValue < startOdometerValue) {
      alert('終了走行距離は開始走行距離より大きい値を入力してください')
      return
    }

    try {
      // 配送記録を直接作成・更新
      const today = new Date().toISOString().split('T')[0]
      const currentTime = new Date().toLocaleTimeString('ja-JP', { hour12: false, hour: '2-digit', minute: '2-digit' })
      
      const deliveryRecordData = {
        delivery_date: today,
        driver_id: session.driverId,
        vehicle_id: session.vehicleId,
        route_id: routeId,
        start_odometer: startOdometerValue,
        end_odometer: endOdometerValue,
        start_time: session.startTime || currentTime,
        end_time: deliveryEndTime || currentTime,
        status: 'completed',
        gas_card_used: false
      }
      
      console.log('配送記録データ:', deliveryRecordData)

      // 既存の配送記録があるかチェック
      const { data: existingRecords } = await supabase
        .from('delivery_records')
        .select('id')
        .eq('driver_id', session.driverId)
        .eq('vehicle_id', session.vehicleId)
        .eq('route_id', routeId)
        .eq('delivery_date', today)

      let finalRecordId = null

      if (existingRecords && existingRecords.length > 0) {
        // 既存の記録を更新
        console.log('既存の配送記録を更新:', existingRecords[0].id)
        
        const { data: updatedRecord, error: updateError } = await supabase
          .from('delivery_records')
          .update(deliveryRecordData)
          .eq('id', existingRecords[0].id)
          .select('*')
          .single()

        if (updateError) {
          console.error('配送記録更新エラー:', updateError)
          throw updateError
        }
        
        finalRecordId = existingRecords[0].id
        console.log('配送記録更新成功:', updatedRecord)
      } else {
        // 新しい記録を作成
        console.log('新しい配送記録を作成')
        
        const { data: newRecord, error: insertError } = await supabase
          .from('delivery_records')
          .insert(deliveryRecordData)
          .select('*')
          .single()

        if (insertError) {
          console.error('配送記録作成エラー:', insertError)
          throw insertError
        }
        
        finalRecordId = newRecord[0].id
        console.log('配送記録作成成功:', newRecord)
      }

      // 配送詳細を保存
      if (finalRecordId) {
        await saveAllDeliveryDetails(finalRecordId)
      }

      // 車両の現在走行距離を更新
      try {
        console.log('車両走行距離更新開始:', { vehicleId: session.vehicleId, endOdometer: endOdometerValue })
        
        const { error: vehicleUpdateError } = await supabase
          .from('vehicles')
          .update({
            current_odometer: endOdometerValue,
            updated_at: new Date().toISOString()
          })
          .eq('id', session.vehicleId)

        if (vehicleUpdateError) {
          console.error('車両走行距離更新エラー:', vehicleUpdateError)
        } else {
          console.log('車両走行距離更新成功')
        }
      } catch (error) {
        console.error('車両走行距離更新処理エラー:', error)
      }

      alert('配送が完了しました。データが保存されました。')
      
      // ページ遷移
      setTimeout(() => {
        router.push('/driver')
      }, 1000)
      
    } catch (error) {
      console.error('配送完了処理エラー:', error)
      alert(`配送完了処理でエラーが発生しました: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  // 全ての配送詳細を保存する関数
  const saveAllDeliveryDetails = async (recordId: string) => {
    console.log('=== 配送詳細保存開始 ===')
    console.log('配送記録ID:', recordId)
    console.log('到着時間:', arrivalTimes)
    console.log('出発時間:', departureTimes)
    console.log('配送先一覧:', destinations)

    const currentTime = new Date().toLocaleTimeString('ja-JP', { hour12: false, hour: '2-digit', minute: '2-digit' })

    for (const destination of destinations) {
      if (destination.status === 'completed' || arrivalTimes[destination.id] || departureTimes[destination.id]) {
        const detailData = {
          delivery_record_id: recordId,
          destination_id: destination.id,
          arrival_time: arrivalTimes[destination.id] || null,
          departure_time: departureTimes[destination.id] || null,
          has_invoice: destination.status === 'completed',
          remarks: destination.status === 'failed' ? '配送失敗' : `配送開始:${session?.startTime || currentTime}, 配送終了:${deliveryEndTime || currentTime}`
        }

        console.log('配送詳細データ:', detailData)

        try {
          // 既存の配送詳細があるかチェック
          const { data: existingDetails } = await supabase
            .from('delivery_details')
            .select('id')
            .eq('delivery_record_id', recordId)
            .eq('destination_id', destination.id)

          if (existingDetails && existingDetails.length > 0) {
            // 更新
            const { error: updateError } = await supabase
              .from('delivery_details')
              .update(detailData)
              .eq('id', existingDetails[0].id)

            if (updateError) {
              console.error('配送詳細更新エラー:', updateError)
            } else {
              console.log('配送詳細更新成功:', existingDetails[0].id)
            }
          } else {
            // 新規作成
            const { error: insertError } = await supabase
              .from('delivery_details')
              .insert(detailData)

            if (insertError) {
              console.error('配送詳細作成エラー:', insertError)
            } else {
              console.log('配送詳細作成成功:', destination.id)
            }
          }
        } catch (error) {
          console.error('配送詳細保存エラー:', error)
        }
      }
    }

    console.log('=== 配送詳細保存完了 ===')
  }

  const isAllDataComplete = () => {
    // 走行距離が入力されていれば完了可能
    const endMileageComplete = endMileage && parseFloat(endMileage) > 0
    return endMileageComplete
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 border-green-300 text-green-800'
      case 'failed':
        return 'bg-red-100 border-red-300 text-red-800'
      case 'in_progress':
        return 'bg-blue-100 border-blue-300 text-blue-800'
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return '完了'
      case 'failed':
        return '失敗'
      case 'in_progress':
        return '到着済み'
      case 'pending':
        return '配送中'
      default:
        return '未配送'
    }
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

  if (!session || !route) {
    return null
  }

  const completedCount = destinations.filter(d => d.status === 'completed').length

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={handleBack}
              className="text-blue-600 text-sm font-medium flex items-center"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              戻る
            </button>
            <div className="text-center flex-1">
              <h1 className="text-lg font-bold text-gray-900">
                {route.route_name}
              </h1>
              <p className="text-sm text-gray-600">
                {session.driverName} / {session.vehicleNo}
              </p>
            </div>
            <div className="text-sm font-mono text-blue-600 font-bold">
              {currentTime}
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 max-w-4xl mx-auto">

        {/* 配送先一覧 */}
        <div className="space-y-3">
          {destinations.map((destination) => (
            <div
              key={destination.id}
              className={`bg-white rounded-lg shadow border-l-4 ${
                destination.status === 'completed' 
                  ? 'border-green-500' 
                  : destination.status === 'failed'
                  ? 'border-red-500'
                  : destination.status === 'in_progress'
                  ? 'border-blue-500'
                  : 'border-gray-300'
              }`}
            >
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center">
                    <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">
                      {destination.order}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">
                        {destination.customerName}
                      </h3>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(destination.status)}`}>
                    {getStatusText(destination.status)}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-start">
                    <svg className="w-4 h-4 text-gray-400 mt-1 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-sm text-gray-700">{destination.address}</span>
                  </div>


                  {destination.specialInstructions && (
                    <div className="flex items-start">
                      <svg className="w-4 h-4 text-yellow-500 mt-1 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L4.316 15.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <span className="text-sm text-yellow-700 font-medium">
                        {destination.specialInstructions}
                      </span>
                    </div>
                  )}
                </div>

                {/* 時間入力フィールド */}
                {(destination.status === 'in_progress' || destination.status === 'completed') && (
                  <div className="bg-gray-50 rounded-lg p-3 mb-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">到着時間</label>
                        <div className="flex gap-2">
                          <input
                            type="time"
                            value={arrivalTimes[destination.id] || destination.arrivalTime || ''}
                            onChange={(e) => {
                              setArrivalTimes(prev => ({
                                ...prev,
                                [destination.id]: e.target.value
                              }))
                              saveArrivalTime(destination.id, e.target.value)
                            }}
                            className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm font-mono focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          />
                          <button
                            onClick={() => {
                              const now = new Date()
                              const currentTime = now.toLocaleTimeString('ja-JP', { hour12: false, hour: '2-digit', minute: '2-digit' })
                              setArrivalTimes(prev => ({
                                ...prev,
                                [destination.id]: currentTime
                              }))
                              saveArrivalTime(destination.id, currentTime)
                            }}
                            className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition-colors"
                          >
                            現在
                          </button>
                        </div>
                      </div>
                      {destination.status === 'completed' && (
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">出発時間</label>
                          <div className="flex gap-2">
                            <input
                              type="time"
                              value={departureTimes[destination.id] || destination.departureTime || ''}
                              onChange={(e) => {
                                setDepartureTimes(prev => ({
                                  ...prev,
                                  [destination.id]: e.target.value
                                }))
                                saveDepartureTime(destination.id, e.target.value)
                              }}
                              className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm font-mono focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            />
                            <button
                              onClick={() => {
                                const now = new Date()
                                const currentTime = now.toLocaleTimeString('ja-JP', { hour12: false, hour: '2-digit', minute: '2-digit' })
                                setDepartureTimes(prev => ({
                                  ...prev,
                                  [destination.id]: currentTime
                                }))
                                saveDepartureTime(destination.id, currentTime)
                              }}
                              className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition-colors"
                            >
                              現在
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* アクションボタン */}
                {destination.status === 'pending' && (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleArrival(destination.id)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
                    >
                      到着
                    </button>
                  </div>
                )}

                {destination.status === 'in_progress' && (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleDeparture(destination.id)}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
                    >
                      配送完了
                    </button>
                  </div>
                )}

                {destination.status === 'completed' && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center text-green-800">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="font-medium">配送完了</span>
                      <span className="ml-auto text-sm">{currentTime}</span>
                    </div>
                  </div>
                )}

                {destination.status === 'failed' && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-center text-red-800">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span className="font-medium">配送失敗</span>
                      <button
                        onClick={() => handleDestinationToggle(destination.id, 'pending')}
                        className="ml-auto text-sm bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
                      >
                        再配送
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* 配送終了時刻入力 */}
        <div className="bg-white rounded-lg shadow p-4 mt-4">
          <h3 className="text-lg font-bold text-gray-900 mb-4">配送終了時刻</h3>
          <div className="max-w-md">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              配送終了時刻
            </label>
            <div className="flex gap-2">
              <input
                type="time"
                value={deliveryEndTime}
                onChange={(e) => setDeliveryEndTime(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                onClick={() => {
                  const now = new Date()
                  const currentTime = now.toLocaleTimeString('ja-JP', { hour12: false, hour: '2-digit', minute: '2-digit' })
                  setDeliveryEndTime(currentTime)
                }}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                現在
              </button>
            </div>
          </div>
        </div>

        {/* 走行距離入力 */}
        <div className="bg-white rounded-lg shadow p-4 mt-4">
          <h3 className="text-lg font-bold text-gray-900 mb-4">走行距離</h3>
          <div className="max-w-md">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              終了走行距離 (km) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.1"
              value={endMileage}
              onChange={(e) => {
                setEndMileage(e.target.value)
                saveMileage(false, e.target.value)
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder=""
              required
            />
          </div>

        </div>

        {/* オイル交換管理 */}
        <div className="bg-white rounded-lg shadow p-4 mt-4">
          <h3 className="text-lg font-bold text-gray-900 mb-4">オイル交換管理</h3>
          
          {/* オイル交換状況表示 */}
          <div className="mb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">前回オイル交換</div>
                <div className="text-lg font-bold text-gray-900">
                  {lastOilChangeMileage ? `${lastOilChangeMileage.toLocaleString()} km` : '記録なし'}
                </div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">次回オイル交換予定</div>
                <div className="text-lg font-bold text-gray-900">
                  {getNextOilChangeKm() ? `${getNextOilChangeKm()?.toLocaleString()} km` : '記録なし'}
                </div>
              </div>
            </div>
            
            {/* オイル交換状態 */}
            {getOilChangeStatus() && (
              <div className="mt-3 p-3 bg-white border-l-4 border-blue-500 rounded-lg">
                <div className={`text-sm font-medium ${getOilChangeStatus()?.color}`}>
                  {getOilChangeStatus()?.message}
                </div>
              </div>
            )}
          </div>

          {/* オイル交換記録入力 */}
          <div className="border-t pt-4">
            <h4 className="text-md font-semibold text-gray-900 mb-3">オイル交換を実施した場合</h4>
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  オイル交換時の走行距離 (km)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={newOilChangeMileage}
                  onChange={(e) => setNewOilChangeMileage(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder=""
                  disabled={oilChangePerformed}
                />
              </div>
              <button
                onClick={handleOilChangeSubmit}
                disabled={oilChangePerformed || !newOilChangeMileage}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                記録
              </button>
            </div>
            
            {oilChangePerformed && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center text-green-800">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="font-medium">オイル交換を記録しました</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 完了ボタン */}
        <div className="mt-6">
          <button
            onClick={handleCompleteDelivery}
            disabled={!isAllDataComplete()}
            className={`w-full py-4 px-6 rounded-lg text-lg font-medium transition-colors ${
              isAllDataComplete()
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isAllDataComplete() 
              ? '配送終了 - データを保存して終了' 
              : '終了走行距離を入力してください'
            }
          </button>
          {!isAllDataComplete() && (
            <div className="mt-3 text-sm text-gray-600">
              <p>終了するには終了走行距離の入力が必要です</p>
              {completedCount < destinations.length && (
                <p className="mt-2 text-amber-600">
                  ※ 未完了の配送先が {destinations.length - completedCount} 件あります
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}