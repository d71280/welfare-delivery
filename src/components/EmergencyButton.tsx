'use client'

import { useState } from 'react'

interface EmergencyButtonProps {
  onEmergency?: (type: string, message: string) => void
  className?: string
}

export default function EmergencyButton({ onEmergency, className = '' }: EmergencyButtonProps) {
  const [isPressed, setIsPressed] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

  const handleEmergency = (type: string, message: string) => {
    setIsPressed(true)
    setShowMenu(false)
    
    // 音声アラート
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(`緊急事態が発生しました。${message}`)
      utterance.lang = 'ja-JP'
      utterance.rate = 1.2
      speechSynthesis.speak(utterance)
    }

    // バイブレーション
    if ('vibrator' in navigator || 'vibrate' in navigator) {
      navigator.vibrate([200, 100, 200, 100, 200])
    }

    // 5秒後にリセット
    setTimeout(() => {
      setIsPressed(false)
    }, 5000)

    // コールバック実行
    if (onEmergency) {
      onEmergency(type, message)
    }

    // 実際の緊急通報システムに送信
    handleEmergencyCall(type, message)
  }

  const handleEmergencyCall = async (type: string, message: string) => {
    try {
      // 緊急通報データ
      const emergencyData = {
        type,
        message,
        timestamp: new Date().toISOString(),
        location: await getCurrentLocation(),
        userAgent: navigator.userAgent,
        emergency: true
      }

      console.log('🚨 緊急通報:', emergencyData)
      
      // 実際のシステムでは緊急通報APIに送信
      // await fetch('/api/emergency', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(emergencyData)
      // })

      // デモ用: ローカルストレージに保存
      const emergencyLog = JSON.parse(localStorage.getItem('emergencyLog') || '[]')
      emergencyLog.push(emergencyData)
      localStorage.setItem('emergencyLog', JSON.stringify(emergencyLog.slice(-10))) // 最新10件保持
      
    } catch (error) {
      console.error('緊急通報送信エラー:', error)
    }
  }

  const getCurrentLocation = (): Promise<{ lat: number; lng: number } | null> => {
    return new Promise((resolve) => {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              lat: position.coords.latitude,
              lng: position.coords.longitude
            })
          },
          () => resolve(null),
          { timeout: 5000 }
        )
      } else {
        resolve(null)
      }
    })
  }

  return (
    <div className={`relative ${className}`}>
      {/* メイン緊急ボタン */}
      <button
        onClick={() => setShowMenu(!showMenu)}
        className={`welfare-icon-button ${
          isPressed 
            ? 'emergency-pulse bg-red-600 text-white' 
            : 'bg-red-500 hover:bg-red-600 text-white'
        } transition-all duration-200`}
        title="緊急通報"
      >
        {isPressed ? '🚨' : '🆘'}
      </button>

      {/* 緊急事態選択メニュー */}
      {showMenu && !isPressed && (
        <div className="absolute bottom-full right-0 mb-2 bg-white rounded-xl shadow-2xl border-2 border-red-200 p-4 min-w-64 fade-in">
          <h3 className="font-bold text-red-800 mb-3 flex items-center gap-2">
            🚨 緊急事態の種類
          </h3>
          <div className="space-y-2">
            <button
              onClick={() => handleEmergency('medical', '利用者様の体調急変です')}
              className="w-full text-left p-3 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">🏥</span>
                <div>
                  <div className="font-bold text-red-800">体調急変</div>
                  <div className="text-sm text-red-600">利用者様の緊急医療対応</div>
                </div>
              </div>
            </button>
            
            <button
              onClick={() => handleEmergency('accident', '交通事故が発生しました')}
              className="w-full text-left p-3 rounded-lg bg-orange-50 hover:bg-orange-100 border border-orange-200 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">🚗</span>
                <div>
                  <div className="font-bold text-orange-800">交通事故</div>
                  <div className="text-sm text-orange-600">車両事故・接触事故</div>
                </div>
              </div>
            </button>
            
            <button
              onClick={() => handleEmergency('breakdown', '車両故障が発生しました')}
              className="w-full text-left p-3 rounded-lg bg-yellow-50 hover:bg-yellow-100 border border-yellow-200 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">🔧</span>
                <div>
                  <div className="font-bold text-yellow-800">車両故障</div>
                  <div className="text-sm text-yellow-600">エンジン停止・パンクなど</div>
                </div>
              </div>
            </button>
            
            <button
              onClick={() => handleEmergency('behavior', '利用者様の行動上の問題です')}
              className="w-full text-left p-3 rounded-lg bg-purple-50 hover:bg-purple-100 border border-purple-200 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">👤</span>
                <div>
                  <div className="font-bold text-purple-800">行動上の問題</div>
                  <div className="text-sm text-purple-600">転倒・迷子・パニックなど</div>
                </div>
              </div>
            </button>
            
            <button
              onClick={() => handleEmergency('other', 'その他の緊急事態です')}
              className="w-full text-left p-3 rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">❗</span>
                <div>
                  <div className="font-bold text-gray-800">その他</div>
                  <div className="text-sm text-gray-600">上記以外の緊急事態</div>
                </div>
              </div>
            </button>
          </div>
          
          <button
            onClick={() => setShowMenu(false)}
            className="w-full mt-3 p-2 text-center text-gray-600 hover:text-gray-800 transition-colors"
          >
            ❌ キャンセル
          </button>
        </div>
      )}

      {/* 緊急状態表示 */}
      {isPressed && (
        <div className="absolute bottom-full right-0 mb-2 bg-red-600 text-white rounded-xl p-4 min-w-64 fade-in">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl animate-pulse">🚨</span>
            <span className="font-bold">緊急通報中...</span>
          </div>
          <p className="text-sm">
            本部に緊急事態を通報しました。<br />
            しばらくお待ちください。
          </p>
        </div>
      )}
    </div>
  )
}