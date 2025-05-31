import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

// 학생 정보 조회 API
export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('student_session_token')?.value

    if (!sessionToken) {
      return NextResponse.json(
        { success: false, error: '인증이 필요합니다.' },
        { status: 401 }
      )
    }

    // 실제 구현에서는 세션 토큰을 DB나 Redis에서 검증
    // 여기서는 간단한 구현을 위해 토큰 존재만 확인
    
    // 세션 토큰으로부터 학생 정보를 추출하는 로직이 필요
    // 실제로는 세션 데이터를 별도 저장소에서 조회해야 함
    
    // 임시로 모든 학생 중에서 첫 번째 학생 정보를 반환
    // 실제 구현에서는 세션에서 학생 ID를 추출해야 함
    
    // 학생 기본 정보 조회
    const { data: students, error: studentError } = await supabase
      .from('students')
      .select('*')
      .limit(1)

    if (studentError || !students || students.length === 0) {
      return NextResponse.json(
        { success: false, error: '학생 정보를 찾을 수 없습니다.' },
        { status: 400 }
      )
    }

    const student = students[0]

    // 학생 계좌 정보 조회
    const { data: accounts, error: accountError } = await supabase
      .from('accounts')
      .select('account_type, balance')
      .eq('student_id', student.id)

    if (accountError) {
      return NextResponse.json(
        { success: false, error: '계좌 정보를 불러올 수 없습니다.' },
        { status: 500 }
      )
    }

    // 계좌 정보를 객체로 변환
    const accountsObj = {
      checking: 0,
      savings: 0,
      investment: 0
    }

    accounts?.forEach(account => {
      if (account.account_type in accountsObj) {
        accountsObj[account.account_type as keyof typeof accountsObj] = account.balance
      }
    })

    const totalBalance = accountsObj.checking + accountsObj.savings + accountsObj.investment

    // 교사 정보 조회
    const { data: teacher } = await supabase
      .from('teachers')
      .select('name, session_code')
      .eq('id', student.teacher_id)
      .single()

    return NextResponse.json({
      success: true,
      student: {
        id: student.id,
        name: student.name,
        student_code: student.student_code,
        accounts: accountsObj,
        total_balance: totalBalance,
        weekly_allowance: student.weekly_allowance || 0
      },
      session: {
        studentId: student.id,
        studentName: student.name,
        studentCode: student.student_code,
        teacherId: student.teacher_id,
        teacherName: teacher?.name || '',
        sessionCode: teacher?.session_code || ''
      }
    })

  } catch (error) {
    console.error('Student me error:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}