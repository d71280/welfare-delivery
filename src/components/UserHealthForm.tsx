'use client'

import { useState } from 'react'

interface HealthCondition {
  condition: string
  severity: 'mild' | 'moderate' | 'severe'
  notes: string
  medication?: string
  lastUpdated: string
}

interface AssistanceRequirement {
  type: 'mobility' | 'medical' | 'communication' | 'behavioral' | 'dietary'
  description: string
  equipment?: string[]
  specialInstructions: string
  emergencyProcedure?: string
}

interface UserHealthData {
  userId: string
  bloodType?: string
  allergies: string[]
  medications: {
    name: string
    dosage: string
    frequency: string
    instructions: string
  }[]
  healthConditions: HealthCondition[]
  assistanceRequirements: AssistanceRequirement[]
  emergencyContact: {
    name: string
    relationship: string
    phone: string
    alternatePhone?: string
  }
  medicalHistory: string
  lastHealthCheck: string
  transportationNotes: string
}

interface UserHealthFormProps {
  userId: string
  initialData?: Partial<UserHealthData>
  onSave: (data: UserHealthData) => void
  onCancel: () => void
}

export default function UserHealthForm({ userId, initialData, onSave, onCancel }: UserHealthFormProps) {
  const [healthData, setHealthData] = useState<UserHealthData>({
    userId,
    bloodType: initialData?.bloodType || '',
    allergies: initialData?.allergies || [],
    medications: initialData?.medications || [],
    healthConditions: initialData?.healthConditions || [],
    assistanceRequirements: initialData?.assistanceRequirements || [],
    emergencyContact: initialData?.emergencyContact || {
      name: '',
      relationship: '',
      phone: '',
      alternatePhone: ''
    },
    medicalHistory: initialData?.medicalHistory || '',
    lastHealthCheck: initialData?.lastHealthCheck || '',
    transportationNotes: initialData?.transportationNotes || ''
  })

  const [newAllergy, setNewAllergy] = useState('')
  const [newMedication, setNewMedication] = useState({
    name: '',
    dosage: '',
    frequency: '',
    instructions: ''
  })
  const [newCondition, setNewCondition] = useState({
    condition: '',
    severity: 'mild' as const,
    notes: '',
    medication: ''
  })
  const [newAssistance, setNewAssistance] = useState({
    type: 'mobility' as const,
    description: '',
    equipment: [] as string[],
    specialInstructions: '',
    emergencyProcedure: ''
  })

  const addAllergy = () => {
    if (newAllergy.trim()) {
      setHealthData(prev => ({
        ...prev,
        allergies: [...prev.allergies, newAllergy.trim()]
      }))
      setNewAllergy('')
    }
  }

  const removeAllergy = (index: number) => {
    setHealthData(prev => ({
      ...prev,
      allergies: prev.allergies.filter((_, i) => i !== index)
    }))
  }

  const addMedication = () => {
    if (newMedication.name.trim()) {
      setHealthData(prev => ({
        ...prev,
        medications: [...prev.medications, newMedication]
      }))
      setNewMedication({ name: '', dosage: '', frequency: '', instructions: '' })
    }
  }

  const removeMedication = (index: number) => {
    setHealthData(prev => ({
      ...prev,
      medications: prev.medications.filter((_, i) => i !== index)
    }))
  }

  const addCondition = () => {
    if (newCondition.condition.trim()) {
      setHealthData(prev => ({
        ...prev,
        healthConditions: [...prev.healthConditions, {
          ...newCondition,
          lastUpdated: new Date().toISOString()
        }]
      }))
      setNewCondition({ condition: '', severity: 'mild', notes: '', medication: '' })
    }
  }

  const removeCondition = (index: number) => {
    setHealthData(prev => ({
      ...prev,
      healthConditions: prev.healthConditions.filter((_, i) => i !== index)
    }))
  }

  const addAssistance = () => {
    if (newAssistance.description.trim()) {
      setHealthData(prev => ({
        ...prev,
        assistanceRequirements: [...prev.assistanceRequirements, newAssistance]
      }))
      setNewAssistance({
        type: 'mobility',
        description: '',
        equipment: [],
        specialInstructions: '',
        emergencyProcedure: ''
      })
    }
  }

  const removeAssistance = (index: number) => {
    setHealthData(prev => ({
      ...prev,
      assistanceRequirements: prev.assistanceRequirements.filter((_, i) => i !== index)
    }))
  }

  const handleSave = () => {
    onSave(healthData)
  }

  const getSeverityColor = (severity: string) => {
    const colorMap = {
      mild: 'bg-yellow-100 text-yellow-800',
      moderate: 'bg-orange-100 text-orange-800',
      severe: 'bg-red-100 text-red-800'
    }
    return colorMap[severity as keyof typeof colorMap] || 'bg-gray-100 text-gray-800'
  }

  const getAssistanceTypeLabel = (type: string) => {
    const typeMap = {
      mobility: '🦽 移動支援',
      medical: '💊 医療的ケア',
      communication: '🗣️ コミュニケーション',
      behavioral: '🧠 行動支援',
      dietary: '🍽️ 食事支援'
    }
    return typeMap[type as keyof typeof typeMap] || type
  }

  return (
    <div className="welfare-card max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
          🏥 健康状態・介助情報の詳細管理
        </h2>
        <p className="text-gray-600">安全な送迎のため、詳細な健康情報を管理します</p>
      </div>

      <div className="space-y-8">
        {/* 基本医療情報 */}
        <div className="bg-blue-50 p-4 rounded-xl border-l-4 border-blue-500">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            🩺 基本医療情報
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-lg font-bold text-gray-900 mb-2">
                🩸 血液型
              </label>
              <select
                value={healthData.bloodType}
                onChange={(e) => setHealthData(prev => ({ ...prev, bloodType: e.target.value }))}
                className="welfare-select"
              >
                <option value="">選択してください</option>
                <option value="A">A型</option>
                <option value="B">B型</option>
                <option value="O">O型</option>
                <option value="AB">AB型</option>
                <option value="unknown">不明</option>
              </select>
            </div>
            
            <div>
              <label className="block text-lg font-bold text-gray-900 mb-2">
                📅 最終健康診断日
              </label>
              <input
                type="date"
                value={healthData.lastHealthCheck}
                onChange={(e) => setHealthData(prev => ({ ...prev, lastHealthCheck: e.target.value }))}
                className="welfare-input"
              />
            </div>
          </div>
        </div>

        {/* アレルギー情報 */}
        <div className="bg-red-50 p-4 rounded-xl border-l-4 border-red-500">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            ⚠️ アレルギー情報
          </h3>
          
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newAllergy}
              onChange={(e) => setNewAllergy(e.target.value)}
              placeholder="アレルギー物質を入力"
              className="flex-1 welfare-input"
            />
            <button
              onClick={addAllergy}
              className="welfare-button welfare-button-secondary"
            >
              ➕ 追加
            </button>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {healthData.allergies.map((allergy, index) => (
              <span
                key={index}
                className="welfare-badge bg-red-100 text-red-800 flex items-center gap-2"
              >
                ⚠️ {allergy}
                <button
                  onClick={() => removeAllergy(index)}
                  className="text-red-600 hover:text-red-800"
                >
                  ❌
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* 服薬情報 */}
        <div className="bg-green-50 p-4 rounded-xl border-l-4 border-green-500">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            💊 服薬情報
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <input
              type="text"
              value={newMedication.name}
              onChange={(e) => setNewMedication(prev => ({ ...prev, name: e.target.value }))}
              placeholder="薬品名"
              className="welfare-input"
            />
            <input
              type="text"
              value={newMedication.dosage}
              onChange={(e) => setNewMedication(prev => ({ ...prev, dosage: e.target.value }))}
              placeholder="用量"
              className="welfare-input"
            />
            <input
              type="text"
              value={newMedication.frequency}
              onChange={(e) => setNewMedication(prev => ({ ...prev, frequency: e.target.value }))}
              placeholder="服用頻度"
              className="welfare-input"
            />
            <button
              onClick={addMedication}
              className="welfare-button welfare-button-secondary"
            >
              ➕ 追加
            </button>
          </div>
          
          <div className="space-y-3">
            {healthData.medications.map((med, index) => (
              <div key={index} className="bg-white p-3 rounded-lg border">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-bold text-green-800">💊 {med.name}</div>
                    <div className="text-sm text-green-600">
                      用量: {med.dosage} | 頻度: {med.frequency}
                    </div>
                    {med.instructions && (
                      <div className="text-sm text-gray-600 mt-1">
                        📝 {med.instructions}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => removeMedication(index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 健康状態 */}
        <div className="bg-purple-50 p-4 rounded-xl border-l-4 border-purple-500">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            🏥 現在の健康状態
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <input
              type="text"
              value={newCondition.condition}
              onChange={(e) => setNewCondition(prev => ({ ...prev, condition: e.target.value }))}
              placeholder="症状・疾患名"
              className="welfare-input"
            />
            <select
              value={newCondition.severity}
              onChange={(e) => setNewCondition(prev => ({ ...prev, severity: e.target.value as any }))}
              className="welfare-select"
            >
              <option value="mild">軽度</option>
              <option value="moderate">中度</option>
              <option value="severe">重度</option>
            </select>
            <button
              onClick={addCondition}
              className="welfare-button welfare-button-secondary"
            >
              ➕ 追加
            </button>
          </div>
          
          <div className="space-y-3">
            {healthData.healthConditions.map((condition, index) => (
              <div key={index} className="bg-white p-3 rounded-lg border">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-purple-800">🏥 {condition.condition}</span>
                      <span className={`welfare-badge ${getSeverityColor(condition.severity)}`}>
                        {condition.severity === 'mild' ? '軽度' : condition.severity === 'moderate' ? '中度' : '重度'}
                      </span>
                    </div>
                    {condition.notes && (
                      <div className="text-sm text-gray-600">
                        📝 {condition.notes}
                      </div>
                    )}
                    {condition.medication && (
                      <div className="text-sm text-purple-600">
                        💊 関連薬: {condition.medication}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => removeCondition(index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 送迎時の特記事項 */}
        <div className="bg-orange-50 p-4 rounded-xl border-l-4 border-orange-500">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            🚐 送迎時の注意事項
          </h3>
          
          <textarea
            value={healthData.transportationNotes}
            onChange={(e) => setHealthData(prev => ({ ...prev, transportationNotes: e.target.value }))}
            className="welfare-input"
            rows={4}
            placeholder="送迎時に特に注意すべき点、配慮事項、緊急時の対応方法など"
          />
        </div>

        {/* 保存・キャンセルボタン */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6">
          <button
            onClick={onCancel}
            className="welfare-button welfare-button-outline"
          >
            ❌ キャンセル
          </button>
          <button
            onClick={handleSave}
            className="welfare-button welfare-button-primary"
          >
            💾 保存する
          </button>
        </div>
        
        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-blue-600 text-xl">🔒</span>
            <span className="font-bold text-blue-800">医療情報の取り扱いについて</span>
          </div>
          <p className="text-blue-700 text-sm">
            この医療情報は、安全な送迎サービス提供のためのみに使用され、医療法および個人情報保護法に基づき厳重に管理されます。
          </p>
        </div>
      </div>
    </div>
  )
}