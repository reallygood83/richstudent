import { NextRequest, NextResponse } from 'next/server'
import { loginTeacher, setupDemoAccount } from '@/lib/auth'
import type { LoginRequest } from '@/types/auth'

export async function POST(request: NextRequest) {
  try {
    const body: LoginRequest = await request.json()

    // 입력 데이터 검증
    if (!body.email || !body.password) {
      return NextResponse.json(
        { success: false, error: '이메일과 비밀번호를 입력해주세요.' },
        { status: 400 }
      )
    }

    // 데모 계정 처리
    if (body.email === 'demo@richstudent.com') {
      const result = await setupDemoAccount()
      if (result.success && result.teacher) {
        // 데모 계정으로 로그인 시도
        const loginResult = await loginTeacher(body)
        if (loginResult.success) {
          // 세션 쿠키 설정
          const response = NextResponse.json(loginResult)
          if (loginResult.sessionId) {
            response.cookies.set('session_token', loginResult.sessionId, {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              maxAge: 24 * 60 * 60 // 24시간
            })
          }
          return response
        }
      }
    }

    // 일반 로그인 처리
    const result = await loginTeacher(body)

    if (!result.success) {
      return NextResponse.json(result, { status: 401 })
    }

    // 성공 시 세션 쿠키 설정
    const response = NextResponse.json(result)
    if (result.sessionId) {
      response.cookies.set('session_token', result.sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 // 24시간
      })
    }

    return response
  } catch (error) {
    console.error('Login API error:', error)
    return NextResponse.json(
      { success: false, error: '로그인 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}