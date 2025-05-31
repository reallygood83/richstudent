import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('session_token')?.value

    if (!sessionToken) {
      return NextResponse.json(
        { success: false, error: '세션이 없습니다.' },
        { status: 401 }
      )
    }

    const teacher = await validateSession(sessionToken)

    if (!teacher) {
      // 만료된 세션 쿠키 삭제
      const response = NextResponse.json(
        { success: false, error: '세션이 만료되었습니다.' },
        { status: 401 }
      )
      response.cookies.delete('session_token')
      return response
    }

    return NextResponse.json({
      success: true,
      teacher
    })
  } catch (error) {
    console.error('Session validation API error:', error)
    return NextResponse.json(
      { success: false, error: '세션 검증 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}