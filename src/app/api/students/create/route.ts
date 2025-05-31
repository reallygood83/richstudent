import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase/client'

// 학생 생성 API
export async function POST(request: NextRequest) {
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

    const { name, student_code, password, weekly_allowance } = await request.json()

    // 입력 검증
    if (!name || !student_code) {
      return NextResponse.json(
        { success: false, error: '이름과 학생 코드는 필수입니다.' },
        { status: 400 }
      )
    }

    // 중복 학생 코드 확인
    const { data: existingStudent } = await supabase
      .from('students')
      .select('id')
      .eq('teacher_id', teacher.id)
      .eq('student_code', student_code)
      .single()

    if (existingStudent) {
      return NextResponse.json(
        { success: false, error: '이미 존재하는 학생 코드입니다.' },
        { status: 400 }
      )
    }

    // 학생 수 제한 확인
    const { data: students } = await supabase
      .from('students')
      .select('id')
      .eq('teacher_id', teacher.id)

    if (students && students.length >= teacher.student_limit) {
      return NextResponse.json(
        { success: false, error: `학생 수가 플랜 제한(${teacher.student_limit}명)을 초과했습니다.` },
        { status: 400 }
      )
    }

    // 학생 생성
    const { data: student, error: studentError } = await supabase
      .from('students')
      .insert({
        teacher_id: teacher.id,
        name,
        student_code,
        password: password || null,
        weekly_allowance: weekly_allowance || 0,
        credit_score: 700 // 기본 신용점수
      })
      .select()
      .single()

    if (studentError) {
      console.error('Student creation error:', studentError)
      return NextResponse.json(
        { success: false, error: '학생 생성 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    // 기본 계좌 생성 (당좌, 저축, 투자)
    const accounts = [
      {
        student_id: student.id,
        account_type: 'checking',
        balance: 0,
        interest_rate: 0
      },
      {
        student_id: student.id,
        account_type: 'savings',
        balance: 0,
        interest_rate: 0.02 // 2% 기본 이자율
      },
      {
        student_id: student.id,
        account_type: 'investment',
        balance: 0,
        interest_rate: 0
      }
    ]

    const { error: accountsError } = await supabase
      .from('accounts')
      .insert(accounts)

    if (accountsError) {
      console.error('Accounts creation error:', accountsError)
      // 학생은 생성되었으므로 계속 진행
    }

    return NextResponse.json({
      success: true,
      student: {
        id: student.id,
        name: student.name,
        student_code: student.student_code,
        credit_score: student.credit_score,
        weekly_allowance: student.weekly_allowance,
        created_at: student.created_at
      }
    })

  } catch (error) {
    console.error('Student creation error:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}