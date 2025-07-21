import { createClient } from '@/lib/supabase/client'

export async function updateTransportationRecordsSchema() {
  const supabase = createClient()
  
  try {
    // 往復送迎用のフィールドを追加
    await supabase.rpc('exec_sql', {
      sql: `
        -- 往復送迎用のフィールドを追加
        ALTER TABLE transportation_records 
        ADD COLUMN IF NOT EXISTS trip_type TEXT DEFAULT 'one_way' CHECK (trip_type IN ('one_way', 'round_trip'));

        ALTER TABLE transportation_records 
        ADD COLUMN IF NOT EXISTS outbound_start_time TIME;

        ALTER TABLE transportation_records 
        ADD COLUMN IF NOT EXISTS outbound_end_time TIME;

        ALTER TABLE transportation_records 
        ADD COLUMN IF NOT EXISTS return_start_time TIME;

        ALTER TABLE transportation_records 
        ADD COLUMN IF NOT EXISTS return_end_time TIME;

        ALTER TABLE transportation_records 
        ADD COLUMN IF NOT EXISTS outbound_passenger_count INTEGER DEFAULT 0;

        ALTER TABLE transportation_records 
        ADD COLUMN IF NOT EXISTS return_passenger_count INTEGER DEFAULT 0;
      `
    })

    console.log('Schema updated successfully')
    return { success: true }
  } catch (error) {
    console.error('Schema update failed:', error)
    return { success: false, error }
  }
}

export async function consolidateDuplicateRecords() {
  const supabase = createClient()
  
  try {
    // 同じ日付・ドライバー・車両の重複記録を検索
    const { data: duplicates } = await supabase
      .from('transportation_records')
      .select(`
        transportation_date,
        driver_id,
        vehicle_id,
        id,
        created_at,
        passenger_count,
        drivers(name),
        vehicles(vehicle_no)
      `)
      .order('transportation_date', { ascending: false })
      .order('created_at', { ascending: true })

    if (!duplicates) return { success: false, error: 'Failed to fetch records' }

    // 重複グループを特定
    const groups = new Map()
    duplicates.forEach(record => {
      const key = `${record.transportation_date}-${record.driver_id}-${record.vehicle_id}`
      if (!groups.has(key)) {
        groups.set(key, [])
      }
      groups.get(key).push(record)
    })

    // 重複があるグループのみ処理
    const duplicateGroups = Array.from(groups.values()).filter(group => group.length > 1)
    
    for (const group of duplicateGroups) {
      // 最初のレコードをメインレコードとして使用
      const mainRecord = group[0]
      const duplicateRecords = group.slice(1)
      
      // メインレコードを往復記録として更新
      const totalPassengers = group.reduce((sum, record) => sum + (record.passenger_count || 0), 0)
      
      await supabase
        .from('transportation_records')
        .update({
          trip_type: 'round_trip',
          passenger_count: totalPassengers
        })
        .eq('id', mainRecord.id)

      // 重複レコードの詳細をメインレコードに移動
      for (const duplicateRecord of duplicateRecords) {
        await supabase
          .from('transportation_details')
          .update({ transportation_record_id: mainRecord.id })
          .eq('transportation_record_id', duplicateRecord.id)
      }

      // 重複レコードを削除
      for (const duplicateRecord of duplicateRecords) {
        await supabase
          .from('transportation_records')
          .delete()
          .eq('id', duplicateRecord.id)
      }
    }

    return { 
      success: true, 
      message: `統合完了: ${duplicateGroups.length}グループの重複記録を統合しました`,
      consolidatedGroups: duplicateGroups.length
    }
  } catch (error) {
    console.error('Record consolidation failed:', error)
    return { success: false, error }
  }
}