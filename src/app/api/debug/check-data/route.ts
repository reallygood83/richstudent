import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

// 현재 데이터베이스 상태 확인 API
export async function GET() {
  try {
    // 교사 목록 조회
    const { data: teachers, error: teacherError } = await supabase
      .from('teachers')
      .select('id, name, email, session_code')

    if (teacherError) {
      console.error('Teacher fetch error:', teacherError)
    }

    // 학생 목록 조회
    const { data: students, error: studentError } = await supabase
      .from('students')
      .select('id, name, student_code, teacher_id')

    if (studentError) {
      console.error('Student fetch error:', studentError)
    }

    return NextResponse.json({
      success: true,
      data: {
        teachers: teachers || [],
        students: students || [],
        teacherError: teacherError?.message,
        studentError: studentError?.message
      }
    })

  } catch (error) {
    console.error('Debug check data error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: '데이터 조회 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}