import { NextRequest, NextResponse } from 'next/server'
import { logoutTeacher } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('session_token')?.value

    if (sessionToken) {
      await logoutTeacher(sessionToken)
    }

    // 세션 쿠키 삭제
    const response = NextResponse.json({ success: true })
    response.cookies.delete('session_token')

    return response
  } catch (error) {
    console.error('Logout API error:', error)
    return NextResponse.json(
      { success: false, error: '로그아웃 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}