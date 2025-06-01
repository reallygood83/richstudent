import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get('student_session')?.value

    if (!sessionToken) {
      return NextResponse.json({
        success: false,
        error: '인증이 필요합니다.'
      }, { status: 401 })
    }

    // 학생 세션 확인
    const { data: sessionData } = await supabase
      .from('student_sessions')
      .select('student_id, teacher_id')
      .eq('session_token', sessionToken)
      .eq('is_active', true)
      .single()

    if (!sessionData) {
      return NextResponse.json({
        success: false,
        error: '유효하지 않은 세션입니다.'
      }, { status: 401 })
    }

    // 같은 교사의 다른 학생들 조회
    const { data: students, error } = await supabase
      .from('students')
      .select('id, name, student_code')
      .eq('teacher_id', sessionData.teacher_id)
      .order('name')

    if (error) {
      console.error('Students fetch error:', error)
      return NextResponse.json({
        success: false,
        error: '학생 목록 조회에 실패했습니다.'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      students: students || []
    })

  } catch (error) {
    console.error('Classmates API error:', error)
    return NextResponse.json({
      success: false,
      error: '서버 오류가 발생했습니다.'
    }, { status: 500 })
  }
}