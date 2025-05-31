import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase/client'

// 학생 목록 조회 API
export async function GET(request: NextRequest) {
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

    // 학생 목록 조회 (계좌 정보 포함)
    const { data: students, error } = await supabase
      .from('students')
      .select(`
        *,
        accounts(account_type, balance)
      `)
      .eq('teacher_id', teacher.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Students fetch error:', error)
      return NextResponse.json(
        { success: false, error: '학생 목록 조회 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    // 데이터 정리 및 총 자산 계산
    const studentsWithTotals = students?.map(student => {
      const accounts = student.accounts || []
      const totalBalance = accounts.reduce((sum: number, account: any) => sum + (account.balance || 0), 0)
      
      return {
        id: student.id,
        name: student.name,
        student_code: student.student_code,
        credit_score: student.credit_score,
        weekly_allowance: student.weekly_allowance,
        created_at: student.created_at,
        accounts: {
          checking: accounts.find((acc: any) => acc.account_type === 'checking')?.balance || 0,
          savings: accounts.find((acc: any) => acc.account_type === 'savings')?.balance || 0,
          investment: accounts.find((acc: any) => acc.account_type === 'investment')?.balance || 0
        },
        total_balance: totalBalance
      }
    }) || []

    return NextResponse.json({
      success: true,
      students: studentsWithTotals,
      total_count: studentsWithTotals.length,
      limit: teacher.student_limit
    })

  } catch (error) {
    console.error('Students list error:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}