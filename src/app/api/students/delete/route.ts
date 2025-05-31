import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase/client'

// 학생 삭제 API
export async function DELETE(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('session_token')?.value

    if (!sessionToken) {
      return NextResponse.json(
        { success: false, error: '인증이 필요합니다.' },
        { status: 401 }
      )
    }

    // 세션 검증
    const teacher = await validateSession(sessionToken)
    if (!teacher) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 세션입니다.' },
        { status: 401 }
      )
    }

    const { student_id } = await request.json()

    if (!student_id) {
      return NextResponse.json(
        { success: false, error: '학생 ID가 필요합니다.' },
        { status: 400 }
      )
    }

    // 학생이 해당 교사의 학생인지 확인
    const { data: student, error: fetchError } = await supabase
      .from('students')
      .select('id, name')
      .eq('id', student_id)
      .eq('teacher_id', teacher.id)
      .single()

    if (fetchError || !student) {
      return NextResponse.json(
        { success: false, error: '삭제할 학생을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 학생 삭제 (CASCADE로 관련 데이터도 함께 삭제됨)
    const { error: deleteError } = await supabase
      .from('students')
      .delete()
      .eq('id', student_id)
      .eq('teacher_id', teacher.id)

    if (deleteError) {
      console.error('Student deletion error:', deleteError)
      return NextResponse.json(
        { success: false, error: '학생 삭제 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `${student.name} 학생이 삭제되었습니다.`
    })

  } catch (error) {
    console.error('Student deletion error:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}