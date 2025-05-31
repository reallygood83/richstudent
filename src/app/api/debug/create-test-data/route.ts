import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

// 테스트 데이터 생성 API
export async function POST() {
  try {
    // 기존 테스트 교사 확인
    const { data: existingTeacher } = await supabase
      .from('teachers')
      .select('id, session_code')
      .eq('email', 'test@teacher.com')
      .single()

    let teacherId = existingTeacher?.id
    let sessionCode = existingTeacher?.session_code

    if (!existingTeacher) {
      // 테스트 교사 생성
      const { data: teacher, error: teacherError } = await supabase
        .from('teachers')
        .insert({
          name: '테스트 선생님',
          email: 'test@teacher.com',
          school: '테스트 학교',
          password_hash: 'test_hash',
          session_code: 'TEST123',
          student_limit: 30,
          plan: 'basic'
        })
        .select()
        .single()

      if (teacherError) {
        console.error('Teacher creation error:', teacherError)
        return NextResponse.json({
          success: false,
          error: '테스트 교사 생성 실패',
          details: teacherError.message
        }, { status: 500 })
      }

      teacherId = teacher.id
      sessionCode = teacher.session_code
    }

    // 기존 테스트 학생 확인
    const { data: existingStudent } = await supabase
      .from('students')
      .select('id')
      .eq('teacher_id', teacherId)
      .eq('student_code', 'S001')
      .single()

    if (!existingStudent) {
      // 테스트 학생 생성
      const { data: student, error: studentError } = await supabase
        .from('students')
        .insert({
          name: '김학생',
          student_code: 'S001',
          teacher_id: teacherId,
          weekly_allowance: 5000
        })
        .select()
        .single()

      if (studentError) {
        console.error('Student creation error:', studentError)
        return NextResponse.json({
          success: false,
          error: '테스트 학생 생성 실패',
          details: studentError.message
        }, { status: 500 })
      }

      // 학생 계좌 생성
      const accounts = [
        { student_id: student.id, account_type: 'checking', balance: 10000 },
        { student_id: student.id, account_type: 'savings', balance: 20000 },
        { student_id: student.id, account_type: 'investment', balance: 5000 }
      ]

      const { error: accountError } = await supabase
        .from('accounts')
        .insert(accounts)

      if (accountError) {
        console.error('Account creation error:', accountError)
        return NextResponse.json({
          success: false,
          error: '테스트 계좌 생성 실패',
          details: accountError.message
        }, { status: 500 })
      }
    }

    // 시장 데이터 초기화
    try {
      const marketResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/api/market/update-prices`, {
        method: 'POST'
      })
      
      if (marketResponse.ok) {
        console.log('Market data initialized successfully')
      } else {
        console.warn('Failed to initialize market data')
      }
    } catch (error) {
      console.warn('Market data initialization error:', error)
    }

    return NextResponse.json({
      success: true,
      message: '테스트 데이터 생성/확인 완료 (시장 데이터 포함)',
      testCredentials: {
        sessionCode: sessionCode,
        studentCode: 'S001',
        teacherEmail: 'test@teacher.com'
      }
    })

  } catch (error) {
    console.error('Test data creation error:', error)
    return NextResponse.json({
      success: false,
      error: '테스트 데이터 생성 중 오류 발생',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}