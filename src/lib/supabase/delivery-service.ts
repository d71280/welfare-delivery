import { createClient } from '@/lib/supabase/client'
import type { DeliveryRecordForm, DeliveryDetailForm } from '@/types'

const supabase = createClient()

/**
 * 既存の配送記録をチェック
 */
export async function checkExistingDeliveryRecord(
  deliveryDate: string,
  driverId: string,
  routeId: string
) {
  try {
    console.log('既存配送記録チェック開始:', { deliveryDate, driverId, routeId })
    
    const { data, error } = await supabase
      .from('delivery_records')
      .select('*')
      .eq('delivery_date', deliveryDate)
      .eq('driver_id', driverId)
      .eq('route_id', routeId)
      .maybeSingle() // single()ではなくmaybeSingle()を使用

    if (error) {
      console.error('既存配送記録チェックエラー:', error)
      return { exists: false, record: null, error }
    }

    console.log('既存配送記録チェック結果:', { exists: !!data, record: data })
    return { exists: !!data, record: data, error: null }
  } catch (error) {
    console.error('既存配送記録チェックでエラー:', error)
    return { exists: false, record: null, error }
  }
}

/**
 * 配送記録を削除
 */
export async function deleteDeliveryRecord(deliveryRecordId: string) {
  try {
    const { error } = await supabase
      .from('delivery_records')
      .delete()
      .eq('id', deliveryRecordId)

    if (error) {
      console.error('配送記録削除エラー:', error)
      return { success: false, error }
    }

    console.log('配送記録削除成功:', deliveryRecordId)
    return { success: true, error: null }
  } catch (error) {
    console.error('配送記録削除でエラー:', error)
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
 * 配送記録を作成（開始走行距離を自動設定）
 */
export async function createDeliveryRecord(formData: DeliveryRecordForm) {
  try {
    console.log('配送記録作成開始:', formData)
    
    // 既存の配送記録をチェック
    const existingCheck = await checkExistingDeliveryRecord(
      formData.deliveryDate,
      formData.driverId,
      formData.routeId
    )
    
    if (existingCheck.exists) {
      console.log('既存の配送記録が見つかりました:', existingCheck.record)
      return { 
        data: null, 
        error: { 
          message: '同じ日付・ドライバー・ルートの配送記録が既に存在します',
          code: 'DUPLICATE_DELIVERY',
          existingRecord: existingCheck.record
        }
      }
    }
    
    // 車両の現在走行距離を取得して開始走行距離として設定
    const currentOdometer = await getVehicleCurrentOdometer(formData.vehicleId)
    console.log('取得した現在走行距離:', currentOdometer)
    
    const deliveryData = {
      delivery_date: formData.deliveryDate,
      driver_id: formData.driverId,
      vehicle_id: formData.vehicleId,
      route_id: formData.routeId,
      start_odometer: currentOdometer, // 自動設定
      end_odometer: formData.endOdometer,
      gas_card_used: formData.gasCardUsed,
      status: 'pending'
    }

    console.log('挿入する配送データ:', deliveryData)

    const { data, error } = await supabase
      .from('delivery_records')
      .insert([deliveryData])
      .select('*')
      .single()

    if (error) {
      console.error('Supabaseエラー:', error)
      throw error
    }
    
    console.log('配送記録作成成功:', data)
    return { data, error: null }
  } catch (error) {
    console.error('配送記録の作成に失敗:', error)
    return { data: null, error }
  }
}

/**
 * 配送記録を完了し、車両の現在走行距離を更新
 */
export async function completeDeliveryRecord(
  deliveryRecordId: string, 
  endOdometer: number,
  vehicleId: string
) {
  try {
    // トランザクション的に両方を更新
    const { data: deliveryData, error: deliveryError } = await supabase
      .from('delivery_records')
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
    console.error('配送記録の完了処理に失敗:', error)
    return { data: null, error }
  }
}

/**
 * 配送記録の走行距離を更新
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
      .from('delivery_records')
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
 * 配送詳細を作成
 */
export async function createDeliveryDetails(
  deliveryRecordId: string,
  details: DeliveryDetailForm[]
) {
  try {
    const detailsData = details.map(detail => ({
      delivery_record_id: deliveryRecordId,
      destination_id: detail.destinationId,
      arrival_time: detail.arrivalTime,
      departure_time: detail.departureTime,
      has_invoice: detail.hasInvoice,
      remarks: detail.remarks,
      time_slot: detail.timeSlot
    }))

    const { data, error } = await supabase
      .from('delivery_details')
      .insert(detailsData)
      .select()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('配送詳細の作成に失敗:', error)
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