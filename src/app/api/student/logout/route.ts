import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

// 학생 로그아웃 API
export async function POST() {
  try {
    const cookieStore = await cookies()

    // 모든 학생 세션 쿠키 삭제
    cookieStore.delete('student_id')
    cookieStore.delete('teacher_id')
    cookieStore.delete('student_name')

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