import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import { cookies } from 'next/headers'

// 학생 로그인 API
export async function POST(request: NextRequest) {
  try {
    const { session_code, student_code, password = '' } = await request.json()

    console.log('Student login attempt:', {
      session_code,
      student_code,
      hasPassword: !!password
    })

    // 입력 검증
    if (!session_code || !student_code) {
      console.log('Missing required fields')
      return NextResponse.json(
        { success: false, error: '세션 코드와 학생 코드를 모두 입력해주세요.' },
        { status: 400 }
      )
    }

    // 세션 코드로 교사 찾기
    console.log('Looking for teacher with session code:', session_code.toUpperCase())
    const { data: teacher, error: teacherError } = await supabase
      .from('teachers')
      .select('id, name, session_code')
      .eq('session_code', session_code.toUpperCase())
      .single()

    console.log('Teacher query result:', { teacher, teacherError })

    if (teacherError || !teacher) {
      console.log('Teacher not found or error:', teacherError)
      return NextResponse.json(
        { success: false, error: '유효하지 않은 세션 코드입니다.', debug: { teacherError: teacherError?.message } },
        { status: 400 }
      )
    }

    // 학생 코드로 학생 찾기 (해당 교사의 학생만)
    console.log('Looking for student with code:', student_code.toUpperCase(), 'for teacher:', teacher.id)
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, name, student_code, password')
      .eq('teacher_id', teacher.id)
      .eq('student_code', student_code.toUpperCase())
      .single()

    console.log('Student query result:', { student, studentError })

    if (studentError || !student) {
      console.log('Student not found or error:', studentError)
      return NextResponse.json(
        { success: false, error: '존재하지 않는 학생 코드입니다.', debug: { studentError: studentError?.message } },
        { status: 400 }
      )
    }

    // 비밀번호 확인 (설정된 경우)
    if (student.password) {
      if (!password) {
        return NextResponse.json(
          { success: false, error: '비밀번호를 입력해주세요.' },
          { status: 400 }
        )
      }

      // 간단한 비밀번호 확인 (평문 저장된 경우)
      if (password !== student.password) {
        return NextResponse.json(
          { success: false, error: '비밀번호가 올바르지 않습니다.' },
          { status: 400 }
        )
      }
    }

    // 학생 세션 토큰 생성
    const crypto = await import('crypto')
    const sessionToken = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000) // 8시간

    // 기존 세션 삭제 (동일 학생의 기존 세션)
    await supabase
      .from('student_sessions')
      .delete()
      .eq('student_id', student.id)

    // 새 세션 저장
    const { error: sessionError } = await supabase
      .from('student_sessions')
      .insert({
        student_id: student.id,
        session_token: sessionToken,
        expires_at: expiresAt.toISOString()
      })

    if (sessionError) {
      console.error('Session creation error:', sessionError)
      return NextResponse.json(
        { success: false, error: '세션 생성에 실패했습니다.' },
        { status: 500 }
      )
    }

    // 세션 토큰을 쿠키에 저장
    const cookieStore = await cookies()
    cookieStore.set('student_session_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 8 * 60 * 60, // 8시간
      path: '/'
    })

    // 세션 데이터가 DB에 저장되었습니다
    return NextResponse.json({
      success: true,
      student: {
        id: student.id,
        name: student.name,
        student_code: student.student_code
      },
      teacher: {
        name: teacher.name,
        session_code: session_code.toUpperCase()
      },
      session_token: sessionToken
    })

  } catch (error) {
    console.error('Student login error:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}