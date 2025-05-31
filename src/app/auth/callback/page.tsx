'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { syncSupabaseAuthUser } from '@/lib/auth'

export default function AuthCallbackPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<string>('')

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        setDebugInfo('인증 세션 확인 중...')
        
        // URL fragment에서 OAuth 토큰 처리 (Google OAuth implicit flow)
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get('access_token')
        
        if (accessToken) {
          setDebugInfo('OAuth 토큰 감지됨. Supabase 세션 설정 중...')
          
          // Supabase에 OAuth 세션 설정
          const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: hashParams.get('refresh_token') || ''
          })
          
          if (sessionError) {
            console.error('Session setup error:', sessionError)
            setError(`세션 설정 오류: ${sessionError.message}`)
            return
          }
          
          console.log('Session setup successful:', sessionData)
        }
        
        // URL에서 인증 코드 처리
        const { data, error } = await supabase.auth.getSession()
        
        console.log('Auth session data:', data)
        console.log('Auth session error:', error)
        
        if (error) {
          console.error('Auth callback error:', error)
          setError(`인증 처리 중 오류: ${error.message}`)
          setDebugInfo(`Error: ${error.message}`)
          return
        }

        if (data.session) {
          setDebugInfo('세션 확인됨. 계정 동기화 중...')
          console.log('User info:', data.session.user)
          
          // Supabase Auth 세션을 우리 시스템과 동기화
          const syncResult = await syncSupabaseAuthUser()
          
          console.log('Sync result:', syncResult)
          
          if (syncResult.success) {
            setDebugInfo('동기화 완료. 대시보드로 이동 중...')
            // 성공하면 대시보드로 이동
            setTimeout(() => {
              router.push('/teacher/dashboard')
            }, 1000)
          } else {
            setError(syncResult.error || '계정 동기화에 실패했습니다.')
            setDebugInfo(`Sync error: ${syncResult.error}`)
          }
        } else {
          setError('인증 세션을 찾을 수 없습니다.')
          setDebugInfo('No session found')
        }
      } catch (error) {
        console.error('Callback handling error:', error)
        const errorMessage = error instanceof Error ? error.message : '예상치 못한 오류가 발생했습니다.'
        setError(errorMessage)
        setDebugInfo(`Exception: ${errorMessage}`)
      } finally {
        setLoading(false)
      }
    }

    handleAuthCallback()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            구글 계정으로 로그인 중...
          </h2>
          <p className="text-gray-600 mb-4">
            잠시만 기다려주세요.
          </p>
          {debugInfo && (
            <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded">
              {debugInfo}
            </div>
          )}
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
          {debugInfo && (
            <div className="text-xs text-gray-500 bg-gray-100 p-2 rounded mb-4 font-mono">
              디버그: {debugInfo}
            </div>
          )}
          <div className="space-y-2">
            <button
              onClick={() => router.push('/auth/login')}
              className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 w-full"
            >
              로그인 페이지로 돌아가기
            </button>
            <button
              onClick={() => window.location.reload()}
              className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600 w-full"
            >
              다시 시도
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}