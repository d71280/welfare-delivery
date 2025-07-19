'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Vehicle } from '@/types'

interface VehicleFormData {
  vehicle_no: string
  vehicle_name: string
  vehicle_type: string
  capacity: string
  fuel_type: string
  wheelchair_accessible: boolean
  current_odometer: number
  last_oil_change_odometer: number
  is_active: boolean
}

export default function VehiclesManagementPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null)
  const [formData, setFormData] = useState<VehicleFormData>({
    vehicle_no: '',
    vehicle_name: '',
    vehicle_type: '',
    capacity: '8',
    fuel_type: 'ガソリン',
    wheelchair_accessible: false,
    current_odometer: 0,
    last_oil_change_odometer: 0,
    is_active: true
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // 管理者セッション確認
    const sessionData = localStorage.getItem('adminSession')
    if (!sessionData) {
      router.push('/admin/login')
      return
    }
    
    fetchVehicles()
  }, [router])

  const fetchVehicles = async () => {
    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('車両取得エラー:', error)
        return
      }

      setVehicles(data || [])
    } catch (error) {
      console.error('車両取得エラー:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.vehicle_no.trim()) {
      newErrors.vehicle_no = '車両番号は必須です'
    }
    
    if (!formData.vehicle_name.trim()) {
      newErrors.vehicle_name = '車両名は必須です'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    try {
      if (editingVehicle) {
        // 更新
        const { error } = await supabase
          .from('vehicles')
          .update({
            vehicle_no: formData.vehicle_no,
            vehicle_name: formData.vehicle_name,
            vehicle_type: formData.vehicle_type,
            capacity: formData.capacity,
            fuel_type: formData.fuel_type,
            wheelchair_accessible: formData.wheelchair_accessible,
            current_odometer: formData.current_odometer,
            last_oil_change_odometer: formData.last_oil_change_odometer,
            is_active: formData.is_active,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingVehicle.id)

        if (error) throw error
        alert('車両情報を更新しました')
      } else {
        // 新規作成
        const { error } = await supabase
          .from('vehicles')
          .insert([{
            vehicle_no: formData.vehicle_no,
            vehicle_name: formData.vehicle_name,
            vehicle_type: formData.vehicle_type,
            capacity: formData.capacity,
            fuel_type: formData.fuel_type,
            wheelchair_accessible: formData.wheelchair_accessible,
            current_odometer: formData.current_odometer,
            last_oil_change_odometer: formData.last_oil_change_odometer,
            is_active: formData.is_active
          }])

        if (error) throw error
        alert('新しい車両を登録しました')
      }

      resetForm()
      await fetchVehicles()
    } catch (error) {
      console.error('保存エラー:', error)
      alert('保存に失敗しました: ' + (error instanceof Error ? error.message : String(error)))
    }
  }

  const handleEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle)
    setFormData({
      vehicle_no: vehicle.vehicle_no,
      vehicle_name: vehicle.vehicle_name || '',
      vehicle_type: vehicle.vehicle_type || '',
      capacity: vehicle.capacity || '8',
      fuel_type: vehicle.fuel_type || 'ガソリン',
      wheelchair_accessible: vehicle.wheelchair_accessible,
      current_odometer: vehicle.current_odometer || 0,
      last_oil_change_odometer: vehicle.last_oil_change_odometer || 0,
      is_active: vehicle.is_active
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('この車両を削除してもよろしいですか？')) return

    try {
      const { error } = await supabase
        .from('vehicles')
        .delete()
        .eq('id', id)

      if (error) throw error
      alert('車両を削除しました')
      await fetchVehicles()
    } catch (error) {
      console.error('削除エラー:', error)
      alert('削除に失敗しました')
    }
  }

  const resetForm = () => {
    setFormData({
      vehicle_no: '',
      vehicle_name: '',
      vehicle_type: '',
      capacity: '8',
      fuel_type: 'ガソリン',
      wheelchair_accessible: false,
      current_odometer: 0,
      last_oil_change_odometer: 0,
      is_active: true
    })
    setEditingVehicle(null)
    setShowForm(false)
    setErrors({})
  }

  const getFuelTypeIcon = (fuelType: string | null) => {
    switch (fuelType) {
      case 'ガソリン': return '⛽'
      case 'ディーゼル': return '🛢️'
      case 'ハイブリッド': return '🔋'
      default: return '🚗'
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-200 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">車両情報を読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-200">
      {/* 統一ヘッダー */}
      <div className="welfare-header">
        <div className="welfare-header-content">
          <div className="welfare-header-title">
            <div className="welfare-header-icon">🚐</div>
            <div className="welfare-header-text">
              <h1>車両管理</h1>
              <p>送迎車両の登録・編集・削除</p>
            </div>
          </div>
          <div className="welfare-nav-buttons">
            <a href="/admin/dashboard" className="welfare-button welfare-button-outline">
              🏠 ダッシュボード
            </a>
            <button 
              onClick={() => setShowForm(true)}
              className="welfare-button welfare-button-primary"
            >
              ➕ 新規登録
            </button>
          </div>
        </div>
      </div>

      <div className="welfare-content">
        {/* 車両登録・編集フォーム */}
        {showForm && (
          <div className="welfare-section fade-in">
            <h2 className="welfare-section-title">
              {editingVehicle ? '✏️ 車両情報の編集' : '🚐 新規車両登録'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="welfare-filter-grid">
                <div className="welfare-filter-item">
                  <label>🔢 車両番号 <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={formData.vehicle_no}
                    onChange={(e) => setFormData({ ...formData, vehicle_no: e.target.value })}
                    className="welfare-input"
                    placeholder="例: V001"
                    required
                  />
                  {errors.vehicle_no && (
                    <p className="text-red-500 text-sm mt-1">{errors.vehicle_no}</p>
                  )}
                </div>

                <div className="welfare-filter-item">
                  <label>🚐 車両名 <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={formData.vehicle_name}
                    onChange={(e) => setFormData({ ...formData, vehicle_name: e.target.value })}
                    className="welfare-input"
                    placeholder="例: ハイエース1号車"
                    required
                  />
                  {errors.vehicle_name && (
                    <p className="text-red-500 text-sm mt-1">{errors.vehicle_name}</p>
                  )}
                </div>

                <div className="welfare-filter-item">
                  <label>🚗 車両タイプ</label>
                  <select
                    value={formData.vehicle_type}
                    onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
                    className="welfare-select"
                  >
                    <option value="">選択してください</option>
                    <option value="ハイエース">ハイエース</option>
                    <option value="アルファード">アルファード</option>
                    <option value="セレナ">セレナ</option>
                    <option value="その他">その他</option>
                  </select>
                </div>

                <div className="welfare-filter-item">
                  <label>👥 乗車定員</label>
                  <select
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                    className="welfare-select"
                  >
                    <option value="6">6名</option>
                    <option value="7">7名</option>
                    <option value="8">8名</option>
                    <option value="9">9名</option>
                    <option value="10">10名</option>
                  </select>
                </div>

                <div className="welfare-filter-item">
                  <label>⛽ 燃料タイプ</label>
                  <select
                    value={formData.fuel_type}
                    onChange={(e) => setFormData({ ...formData, fuel_type: e.target.value })}
                    className="welfare-select"
                  >
                    <option value="ガソリン">ガソリン</option>
                    <option value="ディーゼル">ディーゼル</option>
                    <option value="ハイブリッド">ハイブリッド</option>
                  </select>
                </div>

                <div className="welfare-filter-item">
                  <label>📊 現在走行距離 (km)</label>
                  <input
                    type="number"
                    value={formData.current_odometer}
                    onChange={(e) => setFormData({ ...formData, current_odometer: parseInt(e.target.value) || 0 })}
                    className="welfare-input"
                    placeholder="0"
                    min="0"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="wheelchair_accessible"
                    checked={formData.wheelchair_accessible}
                    onChange={(e) => setFormData({ ...formData, wheelchair_accessible: e.target.checked })}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="wheelchair_accessible" className="text-lg font-medium text-gray-900">
                    ♿ 車椅子対応車両
                  </label>
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                  />
                  <label htmlFor="is_active" className="text-lg font-medium text-gray-900">
                    ✅ 使用可能
                  </label>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="button" 
                  onClick={resetForm}
                  className="welfare-button welfare-button-outline flex-1"
                >
                  ❌ キャンセル
                </button>
                <button 
                  type="submit"
                  className="welfare-button welfare-button-primary flex-1"
                >
                  {editingVehicle ? '✏️ 更新' : '➕ 登録'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 車両一覧 */}
        <div className="welfare-section">
          <h2 className="welfare-section-title">
            🚐 車両一覧 ({vehicles.length}台)
          </h2>

          {vehicles.length === 0 ? (
            <div className="welfare-empty-state">
              <div className="welfare-empty-icon">🚐</div>
              <h3 className="welfare-empty-title">車両が登録されていません</h3>
              <p className="welfare-empty-description">「新規登録」ボタンから車両を登録してください</p>
              <button 
                onClick={() => setShowForm(true)}
                className="welfare-button welfare-button-primary"
              >
                🚐 最初の車両を登録
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="welfare-table">
                <thead>
                  <tr>
                    <th>車両番号</th>
                    <th>車両名</th>
                    <th>タイプ</th>
                    <th>定員</th>
                    <th>燃料</th>
                    <th>車椅子対応</th>
                    <th>走行距離</th>
                    <th>ステータス</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicles.map((vehicle) => (
                    <tr key={vehicle.id}>
                      <td>
                        <span className="welfare-badge bg-blue-100 text-blue-800">
                          {vehicle.vehicle_no}
                        </span>
                      </td>
                      <td className="font-medium">{vehicle.vehicle_name}</td>
                      <td>
                        <span className="flex items-center gap-1">
                          {getFuelTypeIcon(vehicle.fuel_type)}
                          {vehicle.vehicle_type}
                        </span>
                      </td>
                      <td className="text-center">{vehicle.capacity}名</td>
                      <td>
                        <span className="flex items-center gap-1">
                          {getFuelTypeIcon(vehicle.fuel_type)}
                          {vehicle.fuel_type}
                        </span>
                      </td>
                      <td className="text-center">
                        {vehicle.wheelchair_accessible ? (
                          <span className="wheelchair-badge">♿ 対応</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="text-center">
                        {vehicle.current_odometer ? `${vehicle.current_odometer.toLocaleString()}km` : '-'}
                      </td>
                      <td>
                        {vehicle.is_active ? (
                          <span className="status-safe">使用可能</span>
                        ) : (
                          <span className="status-danger">使用停止</span>
                        )}
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleEdit(vehicle)}
                            className="welfare-button welfare-button-outline text-sm px-3 py-1"
                          >
                            ✏️
                          </button>
                          <button 
                            onClick={() => handleDelete(vehicle.id)}
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
    </div>
  )
}