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

    // 세션 토큰으로 실제 학생 정보 조회
    const { data: sessionData, error: sessionError } = await supabase
      .from('student_sessions')
      .select(`
        student_id,
        expires_at,
        students (
          id,
          teacher_id,
          student_code,
          name,
          password,
          credit_score,
          weekly_allowance,
          last_allowance_date
        )
      `)
      .eq('session_token', sessionToken)
      .single()

    if (sessionError || !sessionData) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 세션입니다.' },
        { status: 401 }
      )
    }

    // 세션 만료 확인
    const now = new Date()
    const expiresAt = new Date(sessionData.expires_at)
    if (now > expiresAt) {
      // 만료된 세션 삭제
      await supabase
        .from('student_sessions')
        .delete()
        .eq('session_token', sessionToken)
      
      return NextResponse.json(
        { success: false, error: '세션이 만료되었습니다. 다시 로그인해주세요.' },
        { status: 401 }
      )
    }

    const student = sessionData.students

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