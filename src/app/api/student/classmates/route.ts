import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const studentId = cookieStore.get('student_id')?.value
    const teacherId = cookieStore.get('teacher_id')?.value

    if (!studentId || !teacherId) {
      return NextResponse.json({
        success: false,
        error: '인증이 필요합니다.'
      }, { status: 401 })
    }

    // 현재 학생 정보 확인
    const { data: currentStudent } = await supabase
      .from('students')
      .select('id, teacher_id')
      .eq('id', studentId)
      .eq('teacher_id', teacherId)
      .single()

    if (!currentStudent) {
      return NextResponse.json({
        success: false,
        error: '유효하지 않은 학생 정보입니다.'
      }, { status: 401 })
    }

    // 같은 교사의 다른 학생들 조회
    const { data: students, error } = await supabase
      .from('students')
      .select('id, name, student_code')
      .eq('teacher_id', teacherId)
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