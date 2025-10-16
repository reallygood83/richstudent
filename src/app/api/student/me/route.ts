import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

// 학생 정보 조회 API
export async function GET(request: NextRequest) {
  try {
    const studentId = request.cookies.get('student_id')?.value
    const teacherId = request.cookies.get('teacher_id')?.value

    if (!studentId || !teacherId) {
      return NextResponse.json(
        { success: false, error: '인증이 필요합니다.' },
        { status: 401 }
      )
    }

    // 학생 정보 조회
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, teacher_id, student_code, name, password, credit_score, weekly_allowance, last_allowance_date')
      .eq('id', studentId)
      .eq('teacher_id', teacherId)
      .single()

    if (studentError || !student) {
      return NextResponse.json(
        { success: false, error: '학생 정보를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

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