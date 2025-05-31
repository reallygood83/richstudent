'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { syncSupabaseAuthUser } from '@/lib/auth'

export default function AuthCallbackPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // URL에서 인증 코드 처리
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Auth callback error:', error)
          setError('인증 처리 중 오류가 발생했습니다.')
          return
        }

        if (data.session) {
          // Supabase Auth 세션을 우리 시스템과 동기화
          const syncResult = await syncSupabaseAuthUser()
          
          if (syncResult.success) {
            // 성공하면 대시보드로 이동
            router.push('/teacher/dashboard')
          } else {
            setError(syncResult.error || '계정 동기화에 실패했습니다.')
          }
        } else {
          setError('인증 세션을 찾을 수 없습니다.')
        }
      } catch (error) {
        console.error('Callback handling error:', error)
        setError('예상치 못한 오류가 발생했습니다.')
      } finally {
        setLoading(false)
      }
    }

    handleAuthCallback()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            구글 계정으로 로그인 중...
          </h2>
          <p className="text-gray-600">
            잠시만 기다려주세요.
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            로그인 실패
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/auth/login')}
            className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600"
          >
            로그인 페이지로 돌아가기
          </button>
        </div>
      </div>
    )
  }

  return null
}