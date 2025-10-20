'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

export default function GoogleCallbackPage() {
  const router = useRouter()
  const [status, setStatus] = useState('처리 중...')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleGoogleCallback = async () => {
      try {
        console.log('Processing Google OAuth callback...')
        setStatus('Google 인증 처리 중...')
        
        // URL에서 OAuth 매개변수 처리
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Session retrieval error:', error)
          setError(`세션 가져오기 실패: ${error.message}`)
          return
        }

        if (!data.session) {
          console.log('No session found, waiting for OAuth completion...')
          setStatus('OAuth 완료 대기 중...')
          
          // OAuth 완료를 기다리기 위한 재시도
          setTimeout(async () => {
            const { data: retryData, error: retryError } = await supabase.auth.getSession()
            
            if (retryError || !retryData.session) {
              setError('Google 인증에 실패했습니다. 다시 시도해주세요.')
              return
            }
            
            await processSuccessfulAuth(retryData.session.user)
          }, 2000)
          return
        }

        await processSuccessfulAuth(data.session.user)
        
      } catch (error) {
        console.error('Google callback error:', error)
        setError('인증 처리 중 오류가 발생했습니다.')
      }
    }

    const processSuccessfulAuth = async (user: { 
      id: string; 
      email?: string; 
      user_metadata?: { 
        full_name?: string; 
        avatar_url?: string; 
      } 
    }) => {
      try {
        if (!user.email) {
          setError('사용자 이메일 정보를 찾을 수 없습니다.')
          return
        }

        console.log('Processing successful authentication for user:', user.email)
        setStatus('계정 정보 동기화 중...')

        const userEmail = user.email! // 이미 위에서 null 체크 완료

        // 기존 교사 계정 확인
        const { data: existingTeacher } = await supabase
          .from('teachers')
          .select('*')
          .eq('email', userEmail)
          .single()

        if (existingTeacher) {
          // 기존 교사 계정 업데이트
          console.log('Updating existing teacher account')

          // session_code가 없는 경우 생성
          const updateData: {
            google_id: string
            auth_provider: string
            email_verified: boolean
            profile_image_url: string | null
            updated_at: string
            session_code?: string
          } = {
            google_id: user.id,
            auth_provider: 'google',
            email_verified: true,
            profile_image_url: user.user_metadata?.avatar_url || null,
            updated_at: new Date().toISOString()
          }

          if (!existingTeacher.session_code) {
            console.log('⚠️ Existing teacher missing session_code, generating one...')

            const generateSessionCode = () => {
              const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
              let code = ''
              for (let i = 0; i < 6; i++) {
                code += chars.charAt(Math.floor(Math.random() * chars.length))
              }
              return code
            }

            let sessionCode = generateSessionCode()
            let codeExists = true

            while (codeExists) {
              const { data: existing } = await supabase
                .from('teachers')
                .select('id')
                .eq('session_code', sessionCode)
                .single()

              if (!existing) {
                codeExists = false
              } else {
                sessionCode = generateSessionCode()
              }
            }

            updateData.session_code = sessionCode
            console.log('Generated session code for existing teacher:', sessionCode)
          }

          const { error: updateError } = await supabase
            .from('teachers')
            .update(updateData)
            .eq('email', userEmail)

          if (updateError) {
            console.error('Teacher update error:', updateError)
            setError('계정 업데이트에 실패했습니다.')
            return
          }

          console.log('✅ Existing teacher account updated')
        } else {
          // 새 교사 계정 생성
          console.log('Creating new teacher account')

          // 고유한 6자리 세션 코드 생성
          const generateSessionCode = () => {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
            let code = ''
            for (let i = 0; i < 6; i++) {
              code += chars.charAt(Math.floor(Math.random() * chars.length))
            }
            return code
          }

          let sessionCode = generateSessionCode()
          let codeExists = true

          // 중복되지 않는 세션 코드 생성
          while (codeExists) {
            const { data: existing } = await supabase
              .from('teachers')
              .select('id')
              .eq('session_code', sessionCode)
              .single()

            if (!existing) {
              codeExists = false
            } else {
              sessionCode = generateSessionCode()
            }
          }

          console.log('Generated unique session code:', sessionCode)

          const { error: insertError } = await supabase
            .from('teachers')
            .insert({
              email: userEmail,
              name: user.user_metadata?.full_name || userEmail.split('@')[0],
              school: '',
              session_code: sessionCode,  // 🔥 핵심 수정: 세션 코드 추가!
              google_id: user.id,
              auth_provider: 'google',
              email_verified: true,
              profile_image_url: user.user_metadata?.avatar_url || null,
              plan: 'free',
              student_limit: 30,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })

          if (insertError) {
            console.error('Teacher creation error:', insertError)
            setError('계정 생성에 실패했습니다.')
            return
          }

          console.log('✅ New teacher account created with session code:', sessionCode)
        }

        // 세션 생성
        setStatus('세션 생성 중...')
        const sessionToken = crypto.randomUUID()
        const expiresAt = new Date()
        expiresAt.setHours(expiresAt.getHours() + 24)

        const { data: teacher } = await supabase
          .from('teachers')
          .select('*')
          .eq('email', userEmail)
          .single()

        if (!teacher) {
          setError('교사 정보를 찾을 수 없습니다.')
          return
        }

        const { error: sessionError } = await supabase
          .from('teacher_sessions')
          .insert({
            teacher_id: teacher.id,
            session_token: sessionToken,
            expires_at: expiresAt.toISOString(),
            created_at: new Date().toISOString()
          })

        if (sessionError) {
          console.error('Session creation error:', sessionError)
          setError('세션 생성에 실패했습니다.')
          return
        }

        // 쿠키 설정
        document.cookie = `session_token=${sessionToken}; path=/; max-age=86400; secure; samesite=strict`

        // localStorage에 세션 토큰 저장 (일반 로그인과 동일하게)
        localStorage.setItem('teacher_session', sessionToken)
        console.log('✅ 세션 토큰 localStorage에 저장 완료')

        setStatus('로그인 완료! 대시보드로 이동 중...')
        
        // 대시보드로 리다이렉트
        setTimeout(() => {
          router.push('/teacher/dashboard')
        }, 1500)

      } catch (error) {
        console.error('Auth processing error:', error)
        setError('인증 처리 중 오류가 발생했습니다.')
      }
    }

    handleGoogleCallback()
  }, [router])

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-500 text-5xl mb-4">❌</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Google 로그인 실패
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
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

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center max-w-md mx-auto p-6">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Google 계정으로 로그인 중...
        </h2>
        <p className="text-gray-600 mb-4">{status}</p>
        <div className="text-sm text-gray-500">
          잠시만 기다려주세요...
        </div>
      </div>
    </div>
  )
}