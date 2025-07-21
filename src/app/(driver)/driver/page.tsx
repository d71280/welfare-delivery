'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface DriverSession {
  driverId: string
  driverName: string
  vehicleId: string
  vehicleNo: string
  loginTime: string
  selectedUser?: string
  userName?: string
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

    // ログイン時に選択された利用者に基づいて配送画面にリダイレクト
    if (parsedSession.selectedUser) {
      router.push(`/driver/delivery/${parsedSession.selectedUser}`)
    } else {
      // 利用者が選択されていない場合はログイン画面に戻る
      router.push('/login')
    }
  }, [router])

  // ローディング画面を表示
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">配送画面に移動中...</p>
      </div>
    </div>
  )
}