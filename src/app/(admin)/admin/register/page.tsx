'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function AdminRegisterPage() {
  const [formData, setFormData] = useState({
    // 管理者情報
    adminUsername: '',
    adminPassword: '',
    adminPasswordConfirm: '',
    // 事業者情報
    organizationName: '',
    organizationAddress: '',
    organizationPhone: '',
    organizationEmail: '',
    representativeName: '',
    licenseNumber: '',
    businessType: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const router = useRouter()
  const supabase = createClient()

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const validateForm = () => {
    if (!formData.adminUsername || !formData.adminPassword || !formData.organizationName || !formData.organizationEmail) {
      setError('必須項目を入力してください')
      return false
    }

    // メールアドレス形式チェック
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.organizationEmail)) {
      setError('正しいメールアドレスを入力してください')
      return false
    }

    if (formData.adminPassword.length < 6) {
      setError('パスワードは6文字以上で入力してください')
      return false
    }

    if (formData.adminPassword !== formData.adminPasswordConfirm) {
      setError('パスワードが一致しません')
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setIsLoading(true)
    setError('')

    try {
      // 1. 事業者を作成
      const { data: organization, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: formData.organizationName,
          address: formData.organizationAddress,
          phone: formData.organizationPhone,
          email: formData.organizationEmail,
          representative_name: formData.representativeName,
          license_number: formData.licenseNumber,
          business_type: formData.businessType
        })
        .select()
        .single()

      if (orgError) throw orgError

      // 2. 管理者を作成
      const { error: adminError } = await supabase
        .from('admins')
        .insert({
          username: formData.adminUsername,
          password: formData.adminPassword,
          email: formData.organizationEmail,
          organization_id: organization.id
        })
        .select()
        .single()

      if (adminError) throw adminError

      // 3. 基本管理コードを作成
      const { data: managementCode, error: codeError } = await supabase
        .rpc('generate_management_code')

      if (codeError) throw codeError

      const { error: insertCodeError } = await supabase
        .from('management_codes')
        .insert({
          organization_id: organization.id,
          code: managementCode,
          name: '基本管理コード'
        })

      if (insertCodeError) throw insertCodeError

      setSuccess('新規登録が完了しました。ログインページに移動します。')
      setTimeout(() => {
        router.push('/admin/login')
      }, 2000)

    } catch (err) {
      console.error('登録エラー:', err)
      setError(err instanceof Error ? err.message : '登録に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">管理者新規登録</h1>
          <p className="text-gray-600">福祉送迎システムの新規事業者登録</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 管理者情報セクション */}
          <div className="bg-blue-50 p-6 rounded-lg">
            <h2 className="text-xl font-bold text-gray-900 mb-4">管理者アカウント情報</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  管理者ユーザー名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="adminUsername"
                  value={formData.adminUsername}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="管理者ユーザー名"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  パスワード <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  name="adminPassword"
                  value={formData.adminPassword}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="6文字以上"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  パスワード確認 <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  name="adminPasswordConfirm"
                  value={formData.adminPasswordConfirm}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="パスワードを再入力"
                  required
                />
              </div>
            </div>
          </div>

          {/* 事業者情報セクション */}
          <div className="bg-green-50 p-6 rounded-lg">
            <h2 className="text-xl font-bold text-gray-900 mb-4">事業者情報</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  事業者名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="organizationName"
                  value={formData.organizationName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="例：株式会社〇〇福祉サービス"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  住所
                </label>
                <input
                  type="text"
                  name="organizationAddress"
                  value={formData.organizationAddress}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="事業所の住所"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  電話番号
                </label>
                <input
                  type="tel"
                  name="organizationPhone"
                  value={formData.organizationPhone}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="03-1234-5678"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  メールアドレス <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="organizationEmail"
                  value={formData.organizationEmail}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="info@example.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  代表者名
                </label>
                <input
                  type="text"
                  name="representativeName"
                  value={formData.representativeName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="代表者の氏名"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  事業の種類
                </label>
                <select
                  name="businessType"
                  value={formData.businessType}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  name="licenseNumber"
                  value={formData.licenseNumber}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="許可・指定番号"
                />
              </div>
            </div>
          </div>

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

          {/* ボタン */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '登録中...' : '新規登録'}
            </button>
            <Link
              href="/admin/login"
              className="flex-1 text-center bg-gray-100 text-gray-700 py-3 px-6 rounded-lg font-medium hover:bg-gray-200"
            >
              ログインに戻る
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}