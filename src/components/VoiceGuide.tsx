'use client'

import { useState, useEffect } from 'react'

interface VoiceGuideProps {
  enabled?: boolean
  language?: 'ja-JP' | 'en-US'
  volume?: number
  className?: string
}

interface VoiceAlert {
  id: string
  type: 'info' | 'warning' | 'danger' | 'success'
  message: string
  priority: 'low' | 'medium' | 'high'
  autoSpeak?: boolean
  timestamp: string
}

export default function VoiceGuide({ 
  enabled = true, 
  language = 'ja-JP', 
  volume = 0.8,
  className = '' 
}: VoiceGuideProps) {
  const [isEnabled, setIsEnabled] = useState(enabled)
  const [currentVolume, setCurrentVolume] = useState(volume)
  const [alerts, setAlerts] = useState<VoiceAlert[]>([])
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [supportedVoices, setSupportedVoices] = useState<SpeechSynthesisVoice[]>([])
  const [selectedVoice, setSelectedVoice] = useState<string>('')

  // 音声合成の初期化
  useEffect(() => {
    if ('speechSynthesis' in window) {
      const loadVoices = () => {
        const voices = speechSynthesis.getVoices()
        const japaneseVoices = voices.filter(voice => voice.lang.startsWith('ja'))
        setSupportedVoices(japaneseVoices)
        
        // デフォルト音声を設定
        if (japaneseVoices.length > 0 && !selectedVoice) {
          setSelectedVoice(japaneseVoices[0].name)
        }
      }

      loadVoices()
      speechSynthesis.addEventListener('voiceschanged', loadVoices)

      return () => {
        speechSynthesis.removeEventListener('voiceschanged', loadVoices)
      }
    }
  }, [selectedVoice])

  // 音声読み上げ関数
  const speak = (text: string, priority: 'low' | 'medium' | 'high' = 'medium') => {
    if (!isEnabled || !('speechSynthesis' in window)) return

    // 緊急度に応じて既存の読み上げを中断
    if (priority === 'high') {
      speechSynthesis.cancel()
    }

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = language
    utterance.volume = currentVolume
    utterance.rate = priority === 'high' ? 1.2 : 1.0
    utterance.pitch = priority === 'high' ? 1.2 : 1.0

    // 選択された音声を使用
    const voice = supportedVoices.find(v => v.name === selectedVoice)
    if (voice) {
      utterance.voice = voice
    }

    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)

    speechSynthesis.speak(utterance)
  }

  // アラートを追加
  const addAlert = (type: VoiceAlert['type'], message: string, priority: VoiceAlert['priority'] = 'medium', autoSpeak = true) => {
    const alert: VoiceAlert = {
      id: Date.now().toString(),
      type,
      message,
      priority,
      autoSpeak,
      timestamp: new Date().toISOString()
    }

    setAlerts(prev => [alert, ...prev.slice(0, 9)]) // 最新10件保持

    if (autoSpeak && isEnabled) {
      speak(message, priority)
    }
  }

  // 送迎関連の定型アナウンス
  const announcements = {
    // 送迎開始
    transportationStart: () => {
      speak('送迎を開始いたします。安全運転でお送りします。', 'medium')
      addAlert('info', '送迎を開始いたします', 'medium')
    },

    // 利用者お迎え
    userPickup: (userName: string) => {
      speak(`${userName}様のお迎えに向かいます。`, 'medium')
      addAlert('info', `${userName}様のお迎えに向かいます`, 'medium')
    },

    // 到着通知
    arrival: (destination: string) => {
      speak(`${destination}に到着いたしました。`, 'medium')
      addAlert('success', `${destination}に到着いたしました`, 'medium')
    },

    // 安全確認
    safetyCheck: () => {
      speak('シートベルトの着用をご確認ください。', 'medium')
      addAlert('warning', 'シートベルトの着用をご確認ください', 'medium')
    },

    // 体調確認
    healthCheck: () => {
      speak('ご気分はいかがですか。何かございましたらお知らせください。', 'medium')
      addAlert('info', 'ご利用者様の体調確認をお願いします', 'medium')
    },

    // 緊急事態
    emergency: (emergencyType: string) => {
      speak(`緊急事態が発生しました。${emergencyType}です。すぐに本部に連絡してください。`, 'high')
      addAlert('danger', `緊急事態: ${emergencyType}`, 'high')
    },

    // 送迎完了
    transportationComplete: () => {
      speak('送迎が完了いたしました。お疲れ様でした。', 'medium')
      addAlert('success', '送迎が完了いたしました', 'medium')
    },

    // 天候注意
    weatherWarning: (weather: string) => {
      speak(`${weather}のため、安全運転にご注意ください。`, 'medium')
      addAlert('warning', `天候注意: ${weather}`, 'medium')
    },

    // 道路状況
    trafficInfo: (info: string) => {
      speak(`道路状況をお知らせします。${info}`, 'medium')
      addAlert('info', `道路状況: ${info}`, 'medium')
    }
  }

  const getAlertIcon = (type: string) => {
    const iconMap = {
      info: '💡',
      warning: '⚠️',
      danger: '🚨',
      success: '✅'
    }
    return iconMap[type as keyof typeof iconMap] || '📢'
  }

  const getAlertColor = (type: string) => {
    const colorMap = {
      info: 'bg-blue-100 text-blue-800 border-blue-200',
      warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      danger: 'bg-red-100 text-red-800 border-red-200',
      success: 'bg-green-100 text-green-800 border-green-200'
    }
    return colorMap[type as keyof typeof colorMap] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  return (
    <div className={`welfare-card ${className}`}>
      <div className="mb-4">
        <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
          🔊 音声案内システム
        </h3>
        
        {/* 音声設定 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={isEnabled}
                onChange={(e) => setIsEnabled(e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded"
              />
              <span className="font-medium">音声案内を有効にする</span>
            </label>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              音量
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={currentVolume}
              onChange={(e) => setCurrentVolume(Number(e.target.value))}
              className="w-full"
            />
            <span className="text-xs text-gray-600">{Math.round(currentVolume * 100)}%</span>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              音声選択
            </label>
            <select
              value={selectedVoice}
              onChange={(e) => setSelectedVoice(e.target.value)}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
            >
              {supportedVoices.map((voice) => (
                <option key={voice.name} value={voice.name}>
                  {voice.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 定型アナウンスボタン */}
      <div className="mb-6">
        <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
          📢 定型アナウンス
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button
            onClick={announcements.transportationStart}
            className="welfare-button welfare-button-primary text-sm p-2"
            disabled={!isEnabled}
          >
            🚐 送迎開始
          </button>
          <button
            onClick={() => announcements.userPickup('利用者')}
            className="welfare-button welfare-button-secondary text-sm p-2"
            disabled={!isEnabled}
          >
            👤 お迎え中
          </button>
          <button
            onClick={() => announcements.arrival('目的地')}
            className="welfare-button welfare-button-secondary text-sm p-2"
            disabled={!isEnabled}
          >
            📍 到着通知
          </button>
          <button
            onClick={announcements.safetyCheck}
            className="welfare-button welfare-button-outline text-sm p-2"
            disabled={!isEnabled}
          >
            🛡️ 安全確認
          </button>
          <button
            onClick={announcements.healthCheck}
            className="welfare-button welfare-button-outline text-sm p-2"
            disabled={!isEnabled}
          >
            💊 体調確認
          </button>
          <button
            onClick={() => announcements.emergency('医療緊急事態')}
            className="welfare-button welfare-button-danger text-sm p-2"
            disabled={!isEnabled}
          >
            🚨 緊急事態
          </button>
          <button
            onClick={announcements.transportationComplete}
            className="welfare-button welfare-button-secondary text-sm p-2"
            disabled={!isEnabled}
          >
            ✅ 送迎完了
          </button>
          <button
            onClick={() => speak('テスト音声です。音声案内システムが正常に動作しています。', 'medium')}
            className="welfare-button welfare-button-outline text-sm p-2"
            disabled={!isEnabled}
          >
            🔊 音声テスト
          </button>
        </div>
      </div>

      {/* アラート履歴 */}
      <div>
        <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
          📝 音声案内履歴
          {isSpeaking && (
            <span className="welfare-badge bg-blue-100 text-blue-800 animate-pulse">
              🔊 読み上げ中
            </span>
          )}
        </h4>
        
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {alerts.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              音声案内の履歴がありません
            </div>
          ) : (
            alerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-3 rounded-lg border ${getAlertColor(alert.type)}`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-start gap-2">
                    <span className="text-lg">{getAlertIcon(alert.type)}</span>
                    <div>
                      <div className="font-medium">{alert.message}</div>
                      <div className="text-xs opacity-75">
                        {new Date(alert.timestamp).toLocaleTimeString('ja-JP')}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => speak(alert.message, alert.priority)}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                    disabled={!isEnabled}
                  >
                    🔄 再生
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 音声案内の説明 */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-blue-600 text-lg">💡</span>
          <span className="font-bold text-blue-800">音声案内について</span>
        </div>
        <ul className="text-blue-700 text-sm space-y-1">
          <li>• 送迎中の重要な情報を音声で案内します</li>
          <li>• 緊急時は自動的に高い優先度で読み上げます</li>
          <li>• 定型文を使用することで、適切な案内を提供できます</li>
          <li>• 音量やスピードは緊急度に応じて自動調整されます</li>
        </ul>
      </div>
    </div>
  )
}