import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { logoutStudent } from '@/lib/student-session'

// 학생 로그아웃 API
export async function POST() {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get('student_session_token')?.value

    if (sessionToken) {
      // 데이터베이스에서 세션 삭제
      await logoutStudent(sessionToken)
    }
    
    // 학생 세션 쿠키 삭제
    cookieStore.delete('student_session_token')

    return NextResponse.json({
      success: true,
      message: '로그아웃되었습니다.'
    })

  } catch (error) {
    console.error('Student logout error:', error)
    return NextResponse.json(
      { success: false, error: '로그아웃 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}