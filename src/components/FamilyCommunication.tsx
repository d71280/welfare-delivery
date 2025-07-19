'use client'

import { useState, useEffect } from 'react'

interface Message {
  id: string
  type: 'departure' | 'arrival' | 'delay' | 'emergency' | 'info' | 'health_update'
  sender: 'driver' | 'facility' | 'family'
  senderName: string
  recipient: 'driver' | 'facility' | 'family' | 'all'
  userId?: string
  userName?: string
  subject: string
  message: string
  timestamp: string
  isRead: boolean
  priority: 'low' | 'medium' | 'high'
  attachments?: string[]
}

interface NotificationSettings {
  enableSMS: boolean
  enableEmail: boolean
  enablePush: boolean
  emergencyOnly: boolean
}

interface FamilyCommunicationProps {
  userId?: string
  userRole: 'driver' | 'facility' | 'family'
  className?: string
}

export default function FamilyCommunication({ userId, userRole, className = '' }: FamilyCommunicationProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState({
    type: 'info' as Message['type'],
    recipient: 'all' as Message['recipient'],
    subject: '',
    message: '',
    priority: 'medium' as Message['priority']
  })
  const [showComposer, setShowComposer] = useState(false)
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    enableSMS: true,
    enableEmail: true,
    enablePush: true,
    emergencyOnly: false
  })
  const [selectedTab, setSelectedTab] = useState<'all' | 'received' | 'sent'>('all')

  // メッセージ取得
  useEffect(() => {
    loadMessages()
    
    // 30秒ごとに新しいメッセージをチェック
    const interval = setInterval(loadMessages, 30000)
    
    return () => clearInterval(interval)
  }, [])

  const loadMessages = () => {
    try {
      const storedMessages = JSON.parse(localStorage.getItem('familyMessages') || '[]')
      setMessages(storedMessages)
    } catch (error) {
      console.error('メッセージ取得エラー:', error)
    }
  }

  const sendMessage = () => {
    if (!newMessage.subject.trim() || !newMessage.message.trim()) {
      alert('件名とメッセージを入力してください')
      return
    }

    const message: Message = {
      id: Date.now().toString(),
      type: newMessage.type,
      sender: userRole,
      senderName: getSenderName(),
      recipient: newMessage.recipient,
      userId,
      userName: userId ? 'ご利用者様' : undefined,
      subject: newMessage.subject,
      message: newMessage.message,
      timestamp: new Date().toISOString(),
      isRead: false,
      priority: newMessage.priority,
      attachments: []
    }

    try {
      const storedMessages = JSON.parse(localStorage.getItem('familyMessages') || '[]')
      const updatedMessages = [message, ...storedMessages]
      localStorage.setItem('familyMessages', JSON.stringify(updatedMessages.slice(0, 100))) // 最新100件保持
      
      setMessages(updatedMessages)
      setNewMessage({
        type: 'info',
        recipient: 'all',
        subject: '',
        message: '',
        priority: 'medium'
      })
      setShowComposer(false)

      // 通知送信をシミュレート
      sendNotification(message)
      
    } catch (error) {
      console.error('メッセージ送信エラー:', error)
      alert('メッセージの送信に失敗しました')
    }
  }

  const sendNotification = (message: Message) => {
    // 実際のシステムでは、SMS/メール/プッシュ通知APIを呼び出し
    console.log('📱 通知送信:', {
      to: message.recipient,
      subject: message.subject,
      message: message.message,
      priority: message.priority
    })

    // デモ用: ブラウザ通知
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`${message.subject}`, {
        body: message.message,
        icon: '/favicon.ico',
        tag: message.id
      })
    }
  }

  const getSenderName = () => {
    const nameMap = {
      driver: 'ドライバー',
      facility: '施設スタッフ',
      family: 'ご家族'
    }
    return nameMap[userRole]
  }

  const markAsRead = (messageId: string) => {
    try {
      const storedMessages = JSON.parse(localStorage.getItem('familyMessages') || '[]')
      const updatedMessages = storedMessages.map((msg: Message) =>
        msg.id === messageId ? { ...msg, isRead: true } : msg
      )
      localStorage.setItem('familyMessages', JSON.stringify(updatedMessages))
      setMessages(updatedMessages)
    } catch (error) {
      console.error('既読更新エラー:', error)
    }
  }

  const getMessageIcon = (type: string) => {
    const iconMap = {
      departure: '🚗',
      arrival: '📍',
      delay: '⏰',
      emergency: '🚨',
      info: '💡',
      health_update: '🏥'
    }
    return iconMap[type as keyof typeof iconMap] || '📩'
  }

  const getMessageColor = (type: string, priority: string) => {
    if (priority === 'high') return 'bg-red-50 border-red-200'
    
    const colorMap = {
      departure: 'bg-blue-50 border-blue-200',
      arrival: 'bg-green-50 border-green-200',
      delay: 'bg-yellow-50 border-yellow-200',
      emergency: 'bg-red-50 border-red-200',
      info: 'bg-gray-50 border-gray-200',
      health_update: 'bg-purple-50 border-purple-200'
    }
    return colorMap[type as keyof typeof colorMap] || 'bg-gray-50 border-gray-200'
  }

  const getPriorityLabel = (priority: string) => {
    const labelMap = {
      low: '📗 通常',
      medium: '📙 重要',
      high: '📕 緊急'
    }
    return labelMap[priority as keyof typeof labelMap] || priority
  }

  const filteredMessages = messages.filter(msg => {
    if (selectedTab === 'sent') return msg.sender === userRole
    if (selectedTab === 'received') return msg.sender !== userRole
    return true
  })

  const unreadCount = messages.filter(msg => !msg.isRead && msg.sender !== userRole).length

  return (
    <div className={`welfare-card ${className}`}>
      <div className="mb-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            📱 リアルタイム連絡システム
            {unreadCount > 0 && (
              <span className="welfare-badge bg-red-100 text-red-800">
                {unreadCount}件未読
              </span>
            )}
          </h3>
          <button
            onClick={() => setShowComposer(!showComposer)}
            className="welfare-button welfare-button-primary text-sm"
          >
            ✉️ メッセージ作成
          </button>
        </div>

        {/* タブ切り替え */}
        <div className="flex space-x-1 mb-4">
          <button
            onClick={() => setSelectedTab('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              selectedTab === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            📩 すべて
          </button>
          <button
            onClick={() => setSelectedTab('received')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              selectedTab === 'received'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            📥 受信
          </button>
          <button
            onClick={() => setSelectedTab('sent')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              selectedTab === 'sent'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            📤 送信
          </button>
        </div>

        {/* メッセージ作成フォーム */}
        {showComposer && (
          <div className="bg-blue-50 p-4 rounded-xl border-l-4 border-blue-500 mb-6">
            <h4 className="font-bold text-gray-900 mb-4">✉️ 新しいメッセージ</h4>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    メッセージ種別
                  </label>
                  <select
                    value={newMessage.type}
                    onChange={(e) => setNewMessage(prev => ({ ...prev, type: e.target.value as Message['type'] }))}
                    className="welfare-select"
                  >
                    <option value="info">💡 一般連絡</option>
                    <option value="departure">🚗 出発通知</option>
                    <option value="arrival">📍 到着通知</option>
                    <option value="delay">⏰ 遅延連絡</option>
                    <option value="health_update">🏥 健康状況</option>
                    <option value="emergency">🚨 緊急連絡</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    送信先
                  </label>
                  <select
                    value={newMessage.recipient}
                    onChange={(e) => setNewMessage(prev => ({ ...prev, recipient: e.target.value as Message['recipient'] }))}
                    className="welfare-select"
                  >
                    <option value="all">🌐 全員</option>
                    <option value="family">👨‍👩‍👧‍👦 ご家族</option>
                    <option value="facility">🏢 施設</option>
                    <option value="driver">🚗 ドライバー</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    優先度
                  </label>
                  <select
                    value={newMessage.priority}
                    onChange={(e) => setNewMessage(prev => ({ ...prev, priority: e.target.value as Message['priority'] }))}
                    className="welfare-select"
                  >
                    <option value="low">📗 通常</option>
                    <option value="medium">📙 重要</option>
                    <option value="high">📕 緊急</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  件名
                </label>
                <input
                  type="text"
                  value={newMessage.subject}
                  onChange={(e) => setNewMessage(prev => ({ ...prev, subject: e.target.value }))}
                  className="welfare-input"
                  placeholder="件名を入力してください"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  メッセージ
                </label>
                <textarea
                  value={newMessage.message}
                  onChange={(e) => setNewMessage(prev => ({ ...prev, message: e.target.value }))}
                  className="welfare-input"
                  rows={4}
                  placeholder="メッセージ内容を入力してください"
                />
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowComposer(false)}
                  className="welfare-button welfare-button-outline"
                >
                  ❌ キャンセル
                </button>
                <button
                  onClick={sendMessage}
                  className="welfare-button welfare-button-primary"
                >
                  📤 送信
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* メッセージ一覧 */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {filteredMessages.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl text-gray-400">📩</span>
            </div>
            <p className="text-gray-600">メッセージがありません</p>
          </div>
        ) : (
          filteredMessages.map((message) => (
            <div
              key={message.id}
              className={`p-4 rounded-xl border-2 ${getMessageColor(message.type, message.priority)} ${
                !message.isRead && message.sender !== userRole ? 'ring-2 ring-blue-300' : ''
              } hover:shadow-md transition-shadow cursor-pointer`}
              onClick={() => markAsRead(message.id)}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{getMessageIcon(message.type)}</span>
                  <div>
                    <h4 className="font-bold text-gray-900">{message.subject}</h4>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span>👤 {message.senderName}</span>
                      <span>→</span>
                      <span>{message.recipient === 'all' ? '全員' : message.recipient}</span>
                      {message.userName && <span>({message.userName})</span>}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="welfare-badge text-xs">
                    {getPriorityLabel(message.priority)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(message.timestamp).toLocaleString('ja-JP')}
                  </div>
                </div>
              </div>
              
              <p className="text-gray-700 text-sm mb-2">{message.message}</p>
              
              {!message.isRead && message.sender !== userRole && (
                <div className="flex items-center gap-1 text-xs text-blue-600">
                  <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                  <span>未読</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* 定型メッセージクイック送信 */}
      <div className="mt-6 bg-green-50 border border-green-200 rounded-xl p-4">
        <h4 className="font-bold text-gray-900 mb-3">⚡ クイック送信</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <button
            onClick={() => {
              setNewMessage({
                type: 'departure',
                recipient: 'family',
                subject: 'お迎えに出発いたします',
                message: 'ご利用者様のお迎えに出発いたします。到着まで今しばらくお待ちください。',
                priority: 'medium'
              })
              setShowComposer(true)
            }}
            className="welfare-button welfare-button-outline text-xs p-2"
          >
            🚗 出発通知
          </button>
          <button
            onClick={() => {
              setNewMessage({
                type: 'arrival',
                recipient: 'family',
                subject: '施設に到着いたしました',
                message: 'ご利用者様は無事に施設に到着いたしました。本日もありがとうございました。',
                priority: 'medium'
              })
              setShowComposer(true)
            }}
            className="welfare-button welfare-button-outline text-xs p-2"
          >
            📍 到着通知
          </button>
          <button
            onClick={() => {
              setNewMessage({
                type: 'delay',
                recipient: 'all',
                subject: '遅延のお知らせ',
                message: '交通状況により、予定より遅れております。ご迷惑をおかけして申し訳ございません。',
                priority: 'high'
              })
              setShowComposer(true)
            }}
            className="welfare-button welfare-button-outline text-xs p-2"
          >
            ⏰ 遅延連絡
          </button>
          <button
            onClick={() => {
              setNewMessage({
                type: 'health_update',
                recipient: 'family',
                subject: '体調についてのご報告',
                message: 'ご利用者様の本日の体調についてご報告いたします。',
                priority: 'medium'
              })
              setShowComposer(true)
            }}
            className="welfare-button welfare-button-outline text-xs p-2"
          >
            🏥 体調報告
          </button>
        </div>
      </div>

      {/* 通知設定 */}
      <div className="mt-6 bg-gray-50 border border-gray-200 rounded-xl p-4">
        <h4 className="font-bold text-gray-900 mb-3">🔔 通知設定</h4>
        <div className="space-y-2">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={notificationSettings.enablePush}
              onChange={(e) => setNotificationSettings(prev => ({ ...prev, enablePush: e.target.checked }))}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <span className="text-sm">📱 プッシュ通知</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={notificationSettings.enableSMS}
              onChange={(e) => setNotificationSettings(prev => ({ ...prev, enableSMS: e.target.checked }))}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <span className="text-sm">📲 SMS通知</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={notificationSettings.enableEmail}
              onChange={(e) => setNotificationSettings(prev => ({ ...prev, enableEmail: e.target.checked }))}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <span className="text-sm">📧 メール通知</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={notificationSettings.emergencyOnly}
              onChange={(e) => setNotificationSettings(prev => ({ ...prev, emergencyOnly: e.target.checked }))}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <span className="text-sm">🚨 緊急時のみ通知</span>
          </label>
        </div>
      </div>
    </div>
  )
}