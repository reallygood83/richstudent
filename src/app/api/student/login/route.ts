import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import { cookies } from 'next/headers'
import crypto from 'crypto'

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

    // 세션 토큰 생성 (교사와 동일한 방식)
    const sessionToken = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 8) // 8시간 후 만료

    // student_sessions 테이블에 세션 저장
    const { error: sessionInsertError } = await supabase
      .from('student_sessions')
      .insert({
        student_id: student.id,
        session_token: sessionToken,
        expires_at: expiresAt.toISOString()
      })

    if (sessionInsertError) {
      console.error('Failed to create student session:', sessionInsertError)
      return NextResponse.json(
        { success: false, error: '세션 생성에 실패했습니다.' },
        { status: 500 }
      )
    }

    console.log('✅ Student session created:', {
      student_id: student.id,
      expires_at: expiresAt.toISOString()
    })

    // 세션 토큰을 쿠키에 저장
    const cookieStore = await cookies()

    // 학생 세션 토큰 저장 (httpOnly로 보안 강화)
    cookieStore.set('student_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 8 * 60 * 60, // 8시간
      path: '/'
    })

    // 학생 ID 저장 (기존 코드 호환성)
    cookieStore.set('student_id', student.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 8 * 60 * 60, // 8시간
      path: '/'
    })

    // 교사 ID 저장 (같은 반 학생 조회용)
    cookieStore.set('teacher_id', teacher.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 8 * 60 * 60, // 8시간
      path: '/'
    })

    // 학생 이름 저장 (UI 표시용)
    cookieStore.set('student_name', student.name, {
      httpOnly: false, // 클라이언트에서 읽을 수 있도록
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 8 * 60 * 60, // 8시간
      path: '/'
    })

    console.log('Student login successful:', {
      studentId: student.id,
      teacherId: teacher.id,
      studentName: student.name,
      sessionToken: sessionToken.substring(0, 10) + '...'
    })

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
      }
    })

  } catch (error) {
    console.error('Student login error:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}