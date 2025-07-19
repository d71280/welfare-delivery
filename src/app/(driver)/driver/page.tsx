'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface DriverSession {
  driverId: string
  driverName: string
  vehicleId: string
  vehicleNo: string
  loginTime: string
  selectedRoute?: string
}

export default function DriverPage() {
  const router = useRouter()

  useEffect(() => {
    // セッション情報を取得
    const sessionData = localStorage.getItem('driverSession')
    if (!sessionData) {
      router.push('/login')
      return
    }

    const parsedSession = JSON.parse(sessionData) as DriverSession

    // ログイン時に選択されたルートに直接リダイレクト
    if (parsedSession.selectedRoute) {
      router.push(`/driver/route-details/${parsedSession.selectedRoute}`)
    } else {
      // ルートが選択されていない場合はログイン画面に戻る
      router.push('/login')
    }
  }, [router])

  // ローディング画面を表示
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">配送ルートに移動中...</p>
      </div>
    </div>
  )
}