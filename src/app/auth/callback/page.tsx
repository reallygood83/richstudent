'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    // 이 페이지는 더 이상 사용하지 않음
    // Google OAuth는 /auth/google/callback으로 처리
    console.log('Legacy callback page - redirecting to login')
    router.push('/auth/login')
  }, [router])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center max-w-md mx-auto p-6">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          리다이렉트 중...
        </h2>
        <p className="text-gray-600">
          로그인 페이지로 이동합니다.
        </p>
      </div>
    </div>
  )
}