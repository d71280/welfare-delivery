'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Organization {
  id: string
  name: string
  address: string
  phone: string
  email: string
  representative_name: string
  license_number: string
  business_type: string
}

interface ManagementCode {
  id: string
  code: string
  name: string
  is_active: boolean
  created_at: string
}

export default function SettingsPage() {
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [managementCodes, setManagementCodes] = useState<ManagementCode[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [newCodeName, setNewCodeName] = useState('')
  const [isCreatingCode, setIsCreatingCode] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      // 管理者の組織情報を取得
      const adminSession = localStorage.getItem('adminSession')
      if (!adminSession) {
        router.push('/admin/login')
        return
      }

      const { adminId } = JSON.parse(adminSession)

      // 管理者情報から組織IDを取得
      const { data: admin, error: adminError } = await supabase
        .from('admins')
        .select('organization_id')
        .eq('id', adminId)
        .single()

      if (adminError) throw adminError

      // 組織情報を取得
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', admin.organization_id)
        .single()

      if (orgError) throw orgError
      setOrganization(orgData)

      // 管理コード一覧を取得
      const { data: codes, error: codesError } = await supabase
        .from('management_codes')
        .select('*')
        .eq('organization_id', admin.organization_id)
        .order('created_at', { ascending: false })

      if (codesError) throw codesError
      setManagementCodes(codes || [])

    } catch (err) {
      console.error('データ取得エラー:', err)
      const errorMessage = err instanceof Error ? err.message : 'データの取得に失敗しました'
      setError(`データの取得に失敗しました: ${errorMessage}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!organization) return

    setSaving(true)
    setError('')

    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          name: organization.name,
          address: organization.address,
          phone: organization.phone,
          email: organization.email,
          representative_name: organization.representative_name,
          license_number: organization.license_number,
          business_type: organization.business_type,
          updated_at: new Date().toISOString()
        })
        .eq('id', organization.id)

      if (error) throw error

      setSuccess('組織情報を更新しました')
      setIsEditing(false)
      setTimeout(() => setSuccess(''), 3000)

    } catch (err) {
      console.error('保存エラー:', err)
      setError('保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  const handleCreateCode = async () => {
    if (!newCodeName.trim() || !organization) return

    setIsCreatingCode(true)
    setError('')

    try {
      // 新しい管理コードを生成
      const { data: newCode, error: codeError } = await supabase
        .rpc('generate_management_code')

      if (codeError) throw codeError

      // 管理コードを保存
      const { data, error } = await supabase
        .from('management_codes')
        .insert({
          organization_id: organization.id,
          code: newCode,
          name: newCodeName.trim()
        })
        .select()
        .single()

      if (error) throw error

      setManagementCodes(prev => [data, ...prev])
      setNewCodeName('')
      setSuccess('新しい管理コードを作成しました')
      setTimeout(() => setSuccess(''), 3000)

    } catch (err) {
      console.error('管理コード作成エラー:', err)
      setError('管理コードの作成に失敗しました')
    } finally {
      setIsCreatingCode(false)
    }
  }

  const toggleCodeActive = async (codeId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('management_codes')
        .update({ is_active: !isActive, updated_at: new Date().toISOString() })
        .eq('id', codeId)

      if (error) throw error

      setManagementCodes(prev => 
        prev.map(code => 
          code.id === codeId ? { ...code, is_active: !isActive } : code
        )
      )

      setSuccess('管理コードの状態を更新しました')
      setTimeout(() => setSuccess(''), 3000)

    } catch (err) {
      console.error('状態更新エラー:', err)
      setError('状態の更新に失敗しました')
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-200">
      {/* 統一ヘッダー */}
      <div className="welfare-header">
        <div className="welfare-header-content">
          <div className="welfare-header-title">
            <div className="welfare-header-icon">⚙️</div>
            <div className="welfare-header-text">
              <h1>事業者設定</h1>
              <p>組織情報と管理コードの設定</p>
            </div>
          </div>
          <div className="welfare-nav-buttons">
            <a href="/admin/dashboard" className="welfare-button welfare-button-outline">
              🏠 ダッシュボード
            </a>
            <button
              onClick={() => {
                // CSV出力機能（組織情報と管理コードの出力）
                const orgData = organization ? [{
                  組織名: organization.name,
                  代表者名: organization.representative_name || '',
                  住所: organization.address || '',
                  電話番号: organization.phone || '',
                  メールアドレス: organization.email || '',
                  事業種別: organization.business_type || '',
                  許可番号: organization.license_number || ''
                }] : []
                
                const csvContent = 'data:text/csv;charset=utf-8,\ufeff' + 
                  '組織名,代表者名,住所,電話番号,メールアドレス,事業種別,許可番号\n' +
                  orgData.map(row => Object.values(row).map(field => `"${field}"`).join(',')).join('\n')
                
                const link = document.createElement('a')
                link.setAttribute('href', csvContent)
                link.setAttribute('download', `組織情報_${new Date().toISOString().split('T')[0]}.csv`)
                link.click()
              }}
              className="welfare-button welfare-button-secondary"
            >
              📈 CSV出力
            </button>
          </div>
        </div>
      </div>

      <div className="welfare-content"
>
        {/* エラー・成功メッセージ */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            {success}
          </div>
        )}

        {/* 事業者情報 */}
        <div className="welfare-section">
          <div className="flex items-center justify-between mb-6">
            <h2 className="welfare-section-title">⚙️ 事業者情報</h2>
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                編集
              </button>
            ) : (
              <div className="space-x-2">
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {isSaving ? '保存中...' : '保存'}
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false)
                    fetchData() // 編集をキャンセルして元のデータを復元
                  }}
                  className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
                >
                  キャンセル
                </button>
              </div>
            )}
          </div>

          {organization && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  事業者名
                </label>
                <input
                  type="text"
                  value={organization.name}
                  onChange={(e) => setOrganization({...organization, name: e.target.value})}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  代表者名
                </label>
                <input
                  type="text"
                  value={organization.representative_name || ''}
                  onChange={(e) => setOrganization({...organization, representative_name: e.target.value})}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  住所
                </label>
                <input
                  type="text"
                  value={organization.address || ''}
                  onChange={(e) => setOrganization({...organization, address: e.target.value})}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  電話番号
                </label>
                <input
                  type="tel"
                  value={organization.phone || ''}
                  onChange={(e) => setOrganization({...organization, phone: e.target.value})}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  メールアドレス
                </label>
                <input
                  type="email"
                  value={organization.email || ''}
                  onChange={(e) => setOrganization({...organization, email: e.target.value})}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  事業の種類
                </label>
                <select
                  value={organization.business_type || ''}
                  onChange={(e) => setOrganization({...organization, business_type: e.target.value})}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                >
                  <option value="">選択してください</option>
                  <option value="disability_support">障害福祉サービス</option>
                  <option value="elderly_care">介護保険サービス</option>
                  <option value="child_support">児童福祉サービス</option>
                  <option value="medical_transport">医療送迎サービス</option>
                  <option value="other">その他</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  許可・指定番号
                </label>
                <input
                  type="text"
                  value={organization.license_number || ''}
                  onChange={(e) => setOrganization({...organization, license_number: e.target.value})}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                />
              </div>
            </div>
          )}
        </div>

        {/* 管理コード管理 */}
        <div className="welfare-section">
          <h2 className="welfare-section-title">🔑 管理コード管理</h2>
          
          {/* 新しい管理コード作成 */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="text-lg font-medium text-gray-900 mb-3">新しい管理コードを作成</h3>
            <div className="flex gap-4">
              <input
                type="text"
                value={newCodeName}
                onChange={(e) => setNewCodeName(e.target.value)}
                placeholder="管理コード名を入力（例：東京営業所、A班など）"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                onClick={handleCreateCode}
                disabled={!newCodeName.trim() || isCreatingCode}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isCreatingCode ? '作成中...' : '作成'}
              </button>
            </div>
          </div>

          {/* 管理コード一覧 */}
          <div className="space-y-4">
            {managementCodes.map((code) => (
              <div key={code.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center space-x-4">
                    <span className="text-2xl font-mono font-bold text-blue-600">
                      {code.code}
                    </span>
                    <div>
                      <h4 className="font-medium text-gray-900">{code.name}</h4>
                      <p className="text-sm text-gray-500">
                        作成日: {new Date(code.created_at).toLocaleDateString('ja-JP')}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    code.is_active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {code.is_active ? '有効' : '無効'}
                  </span>
                  <button
                    onClick={() => toggleCodeActive(code.id, code.is_active)}
                    className={`px-3 py-1 text-sm rounded ${
                      code.is_active
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {code.is_active ? '無効化' : '有効化'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {managementCodes.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              管理コードがまだ作成されていません
            </div>
          )}
        </div>
      </div>
    </div>
  )
}