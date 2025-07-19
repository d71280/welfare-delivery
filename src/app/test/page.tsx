'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function TestPage() {
  const [connectionStatus, setConnectionStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [data, setData] = useState<unknown>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function testConnection() {
      try {
        const supabase = createClient()
        
        // Test connection by fetching drivers
        const { data: drivers, error } = await supabase
          .from('drivers')
          .select('*')
          .limit(5)

        if (error) {
          setConnectionStatus('error')
          setError(error.message)
        } else {
          setConnectionStatus('success')
          setData(drivers)
        }
      } catch (err) {
        setConnectionStatus('error')
        setError(err instanceof Error ? err.message : 'Unknown error')
      }
    }

    testConnection()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-lg font-medium text-gray-900 mb-4">
            Supabase接続テスト
          </h1>
          
          {connectionStatus === 'loading' && (
            <div className="text-blue-600">接続中...</div>
          )}
          
          {connectionStatus === 'success' && (
            <div>
              <div className="text-green-600 font-medium mb-2">✅ 接続成功!</div>
              <div className="text-sm text-gray-600">
                <p>ドライバーデータ: {Array.isArray(data) ? data.length : 0}件</p>
                {Array.isArray(data) && data.length > 0 && (
                  <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
                    {JSON.stringify(data, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          )}
          
          {connectionStatus === 'error' && (
            <div>
              <div className="text-red-600 font-medium mb-2">❌ 接続エラー</div>
              <div className="text-sm text-red-600">{error}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}