import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import { cookies } from 'next/headers'

// 학생 로그인 API
export async function POST(request: NextRequest) {
  try {
    const { session_code, student_code, password = '' } = await request.json()

    // 입력 검증
    if (!session_code || !student_code) {
      return NextResponse.json(
        { success: false, error: '세션 코드와 학생 코드를 모두 입력해주세요.' },
        { status: 400 }
      )
    }

    // 세션 코드로 교사 찾기
    const { data: teacher, error: teacherError } = await supabase
      .from('teachers')
      .select('id, name, session_code')
      .eq('session_code', session_code.toUpperCase())
      .single()

    if (teacherError || !teacher) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 세션 코드입니다.' },
        { status: 400 }
      )
    }

    // 학생 코드로 학생 찾기 (해당 교사의 학생만)
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, name, student_code, password_hash')
      .eq('teacher_id', teacher.id)
      .eq('student_code', student_code.toUpperCase())
      .single()

    if (studentError || !student) {
      return NextResponse.json(
        { success: false, error: '존재하지 않는 학생 코드입니다.' },
        { status: 400 }
      )
    }

    // 비밀번호 확인 (설정된 경우)
    if (student.password_hash) {
      if (!password) {
        return NextResponse.json(
          { success: false, error: '비밀번호를 입력해주세요.' },
          { status: 400 }
        )
      }

      // 간단한 비밀번호 해시 확인 (실제로는 bcrypt 등 사용 권장)
      const crypto = await import('crypto')
      const hashedPassword = crypto
        .createHash('sha256')
        .update(password + student.student_code)
        .digest('hex')

      if (hashedPassword !== student.password_hash) {
        return NextResponse.json(
          { success: false, error: '비밀번호가 올바르지 않습니다.' },
          { status: 400 }
        )
      }
    }

    // 학생 세션 토큰 생성
    const crypto = await import('crypto')
    const sessionToken = crypto.randomUUID()
    // const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000) // 8시간

    // 세션 정보 저장 (간단한 구현을 위해 메모리나 DB에 저장)
    // 실제로는 Redis 등 사용 권장
    // const sessionData = {
    //   studentId: student.id,
    //   studentName: student.name,
    //   studentCode: student.student_code,
    //   teacherId: teacher.id,
    //   teacherName: teacher.name,
    //   sessionCode: session_code.toUpperCase(),
    //   expiresAt: expiresAt.toISOString()
    // }

    // 세션 토큰을 쿠키에 저장
    const cookieStore = await cookies()
    cookieStore.set('student_session_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 8 * 60 * 60, // 8시간
      path: '/'
    })

    // 실제 구현에서는 세션 데이터를 DB나 Redis에 저장
    // 여기서는 간단히 응답에 포함
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