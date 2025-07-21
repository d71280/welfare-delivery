import { createClient } from '@/lib/supabase/client'
import type { TransportationRecordForm, TransportationDetailForm } from '@/types'

const supabase = createClient()

/**
 * 既存の送迎記録をチェック
 */
export async function checkExistingDeliveryRecord(
  transportationDate: string,
  driverId: string,
  vehicleId?: string
) {
  try {
    console.log('既存送迎記録チェック開始:', { transportationDate, driverId, vehicleId })
    
    let query = supabase
      .from('transportation_records')
      .select('*')
      .eq('transportation_date', transportationDate)
      .eq('driver_id', driverId)

    // 車両IDでの重複チェック
    if (vehicleId) {
      query = query.eq('vehicle_id', vehicleId)
    }

    const { data, error } = await query.maybeSingle()

    if (error) {
      console.error('既存送迎記録チェックエラー:', error)
      return { exists: false, record: null, error }
    }

    console.log('既存送迎記録チェック結果:', { exists: !!data, record: data })
    return { exists: !!data, record: data, error: null }
  } catch (error) {
    console.error('既存送迎記録チェックでエラー:', error)
    return { exists: false, record: null, error }
  }
}

/**
 * 送迎記録を削除
 */
export async function deleteDeliveryRecord(deliveryRecordId: string) {
  try {
    const { error } = await supabase
      .from('transportation_records')
      .delete()
      .eq('id', deliveryRecordId)

    if (error) {
      console.error('送迎記録削除エラー:', error)
      return { success: false, error }
    }

    console.log('送迎記録削除成功:', deliveryRecordId)
    return { success: true, error: null }
  } catch (error) {
    console.error('送迎記録削除でエラー:', error)
    return { success: false, error }
  }
}

/**
 * 車両の現在走行距離を取得
 */
export async function getVehicleCurrentOdometer(vehicleId: string): Promise<number | null> {
  try {
    const { data, error } = await supabase
      .from('vehicles')
      .select('current_odometer')
      .eq('id', vehicleId)
      .single()

    if (error) {
      console.error('車両走行距離の取得に失敗:', error)
      return null
    }

    return data?.current_odometer || 0
  } catch (error) {
    console.error('車両走行距離の取得でエラー:', error)
    return null
  }
}

/**
 * 送迎記録を作成（開始走行距離を自動設定）
 */
export async function createDeliveryRecord(formData: TransportationRecordForm) {
  try {
    console.log('送迎記録作成開始:', formData)
    
    // 重複チェック（往復送迎の場合も実行）
    const existingCheck = await checkExistingDeliveryRecord(
      formData.transportationDate,
      formData.driverId,
      formData.vehicleId // ルートIDの代わりに車両IDを使用
    )
    
    if (existingCheck.exists) {
      console.log('既存の送迎記録が見つかりました:', existingCheck.record)
      return { 
        data: null, 
        error: { 
          message: '同じ日付・ドライバー・車両の送迎記録が既に存在します',
          code: 'DUPLICATE_DELIVERY',
          existingRecord: existingCheck.record
        }
      }
    }
    
    // 車両の現在走行距離を取得して開始走行距離として設定
    const currentOdometer = await getVehicleCurrentOdometer(formData.vehicleId)
    console.log('取得した現在走行距離:', currentOdometer)
    
    const deliveryData: any = {
      transportation_date: formData.transportationDate,
      driver_id: formData.driverId,
      vehicle_id: formData.vehicleId,
      transportation_type: formData.transportationType || 'individual',
      start_odometer: currentOdometer, // 自動設定
      end_odometer: formData.endOdometer,
      passenger_count: formData.passengerCount || 1,
      weather_condition: formData.weatherCondition,
      special_notes: formData.specialNotes,
      management_code_id: formData.managementCodeId,
      status: 'pending'
    }

    // route_idは個別送迎では省略
    if (formData.routeId) {
      deliveryData.route_id = formData.routeId
    }

    console.log('挿入する送迎データ:', deliveryData)

    const { data, error } = await supabase
      .from('transportation_records')
      .insert([deliveryData])
      .select('*')
      .single()

    if (error) {
      console.error('Supabaseエラー:', error)
      throw error
    }
    
    console.log('送迎記録作成成功:', data)
    
    // 往復送迎の場合、選択された利用者の詳細記録を作成
    if (formData.selectedUsers && formData.selectedUsers.length > 0) {
      console.log('利用者詳細記録を作成中:', formData.selectedUsers)
      console.log('選択された住所:', formData.selectedAddresses)
      
      for (const userId of formData.selectedUsers) {
        // 選択された住所情報を取得
        let pickupAddress = null
        if (formData.selectedAddresses && formData.selectedAddresses[userId]) {
          const addressId = formData.selectedAddresses[userId]
          try {
            const { data: addressData } = await supabase
              .from('user_addresses')
              .select('address_name, address')
              .eq('id', addressId)
              .single()
            
            if (addressData) {
              pickupAddress = `${addressData.address_name}: ${addressData.address}`
            }
          } catch (addressError) {
            console.error('住所情報取得エラー:', addressError)
          }
        }
        
        const detailData = {
          transportation_record_id: data.id,
          user_id: userId,
          pickup_time: null,
          arrival_time: null,
          departure_time: null,
          drop_off_time: null,
          pickup_address: pickupAddress,
          health_condition: null,
          behavior_notes: null,
          assistance_required: null,
          remarks: null
        }
        
        console.log('利用者詳細データ:', detailData)
        
        const { error: detailError } = await supabase
          .from('transportation_details')
          .insert([detailData])
        
        if (detailError) {
          console.error('利用者詳細記録作成エラー:', detailError)
          // エラーがあっても継続（部分的成功）
        }
      }
    }
    
    return { data, error: null }
  } catch (error) {
    console.error('送迎記録の作成に失敗:', error)
    const errorMessage = error instanceof Error 
      ? error.message 
      : typeof error === 'string' 
        ? error 
        : JSON.stringify(error, null, 2)
    return { data: null, error: errorMessage }
  }
}

/**
 * 送迎記録を完了し、車両の現在走行距離を更新
 */
export async function completeDeliveryRecord(
  deliveryRecordId: string, 
  endOdometer: number,
  vehicleId: string
) {
  try {
    // トランザクション的に両方を更新
    const { data: deliveryData, error: deliveryError } = await supabase
      .from('transportation_records')
      .update({
        end_odometer: endOdometer,
        status: 'completed'
      })
      .eq('id', deliveryRecordId)
      .select('*')
      .single()

    if (deliveryError) throw deliveryError

    // 車両の現在走行距離を更新
    const { error: vehicleError } = await supabase
      .from('vehicles')
      .update({
        current_odometer: endOdometer
      })
      .eq('id', vehicleId)

    if (vehicleError) throw vehicleError

    return { data: deliveryData, error: null }
  } catch (error) {
    console.error('送迎記録の完了処理に失敗:', error)
    return { data: null, error }
  }
}

/**
 * 送迎記録の走行距離を更新
 */
export async function updateDeliveryOdometer(
  deliveryRecordId: string,
  startOdometer?: number,
  endOdometer?: number
) {
  try {
    const updateData: { start_odometer?: number; end_odometer?: number } = {}
    if (startOdometer !== undefined) updateData.start_odometer = startOdometer
    if (endOdometer !== undefined) updateData.end_odometer = endOdometer

    const { data, error } = await supabase
      .from('transportation_records')
      .update(updateData)
      .eq('id', deliveryRecordId)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('走行距離の更新に失敗:', error)
    return { data: null, error }
  }
}

/**
 * 送迎詳細を作成
 */
export async function createDeliveryDetails(
  deliveryRecordId: string,
  details: TransportationDetailForm[]
) {
  try {
    const detailsData = details.map(detail => ({
      transportation_record_id: deliveryRecordId,
      user_id: detail.userId,
      destination_id: detail.destinationId,
      pickup_time: detail.pickupTime,
      arrival_time: detail.arrivalTime,
      departure_time: detail.departureTime,
      drop_off_time: detail.dropOffTime,
      health_condition: detail.healthCondition,
      behavior_notes: detail.behaviorNotes,
      assistance_required: detail.assistanceRequired,
      remarks: detail.remarks
    }))

    const { data, error } = await supabase
      .from('transportation_details')
      .insert(detailsData)
      .select()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('送迎詳細の作成に失敗:', error)
    return { data: null, error }
  }
}

/**
 * 車両の現在走行距離を手動更新
 */
export async function updateVehicleOdometer(
  vehicleId: string,
  currentOdometer: number,
  lastOilChangeOdometer?: number
) {
  try {
    const updateData: { current_odometer: number; last_oil_change_odometer?: number } = { current_odometer: currentOdometer }
    if (lastOilChangeOdometer !== undefined) {
      updateData.last_oil_change_odometer = lastOilChangeOdometer
    }

    const { data, error } = await supabase
      .from('vehicles')
      .update(updateData)
      .eq('id', vehicleId)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('車両走行距離の更新に失敗:', error)
    return { data: null, error }
  }
}

/**
 * 送迎記録に時間を記録
 */
export async function updateDeliveryTime(
  deliveryRecordId: string,
  timeType: 'start' | 'end',
  time: string,
  additionalData?: {
    status?: 'pending' | 'in_progress' | 'completed' | 'cancelled'
    odometer?: number
    specialNotes?: string
  }
) {
  try {
    const updateData: any = {}
    
    if (timeType === 'start') {
      updateData.start_time = time
      updateData.status = additionalData?.status || 'in_progress'
      if (additionalData?.odometer !== undefined) {
        updateData.start_odometer = additionalData.odometer
      }
    } else {
      updateData.end_time = time
      updateData.status = additionalData?.status || 'completed'
      if (additionalData?.odometer !== undefined) {
        updateData.end_odometer = additionalData.odometer
      }
    }
    
    if (additionalData?.specialNotes) {
      updateData.special_notes = additionalData.specialNotes
    }

    const { data, error } = await supabase
      .from('transportation_records')
      .update(updateData)
      .eq('id', deliveryRecordId)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('送迎時間の更新に失敗:', error)
    return { data: null, error }
  }
} 