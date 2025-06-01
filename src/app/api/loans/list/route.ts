import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import { cookies } from 'next/headers'

// 대출 목록 조회 API
export async function GET() {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get('student_session_token')?.value

    if (!sessionToken) {
      return NextResponse.json({
        success: false,
        error: '인증이 필요합니다.'
      }, { status: 401 })
    }

    // 세션 토큰으로 학생 정보 조회
    const { data: sessionData, error: sessionError } = await supabase
      .from('student_sessions')
      .select('student_id, expires_at')
      .eq('session_token', sessionToken)
      .single()

    if (sessionError || !sessionData) {
      return NextResponse.json({
        success: false,
        error: '유효하지 않은 세션입니다.'
      }, { status: 401 })
    }

    // 세션 만료 확인
    const now = new Date()
    const expiresAt = new Date(sessionData.expires_at)
    if (now > expiresAt) {
      return NextResponse.json({
        success: false,
        error: '세션이 만료되었습니다.'
      }, { status: 401 })
    }

    // 학생 정보 조회
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, name, credit_score')
      .eq('id', sessionData.student_id)
      .single()

    if (studentError || !student) {
      return NextResponse.json({
        success: false,
        error: '학생 정보를 찾을 수 없습니다.'
      }, { status: 404 })
    }

    // 대출 목록 조회
    const { data: loans, error: loansError } = await supabase
      .from('loans')
      .select('*')
      .eq('student_id', student.id)
      .order('created_at', { ascending: false })

    if (loansError) {
      console.error('Loans fetch error:', loansError)
      return NextResponse.json({
        success: false,
        error: '대출 목록 조회에 실패했습니다.'
      }, { status: 500 })
    }

    // 대출 가능 여부 확인
    const { data: eligibilityCheck, error: eligibilityError } = await supabase
      .rpc('check_loan_eligibility', { student_uuid: student.id })

    if (eligibilityError) {
      console.error('Eligibility check error:', eligibilityError)
    }

    const eligibility = eligibilityCheck?.[0]

    // 신용점수에 따른 이자율 정보 조회
    const { data: rateInfo, error: rateError } = await supabase
      .rpc('get_interest_rate_by_credit_score', { credit_score: student.credit_score })

    if (rateError) {
      console.error('Rate info error:', rateError)
    }

    const currentRate = rateInfo?.[0]

    // 활성 대출들의 통계 계산
    const activeLoans = loans?.filter(loan => loan.status === 'active') || []
    const totalOutstanding = activeLoans.reduce((sum, loan) => sum + loan.remaining_balance, 0)
    const totalMonthlyPayment = activeLoans.reduce((sum, loan) => sum + loan.weekly_payment, 0)

    // 대출 데이터 포맷팅
    const formattedLoans = loans?.map(loan => ({
      id: loan.id,
      loan_amount: loan.loan_amount,
      interest_rate: loan.interest_rate,
      loan_duration_weeks: loan.loan_duration_weeks,
      weekly_payment: loan.weekly_payment,
      total_payment: loan.total_payment,
      remaining_balance: loan.remaining_balance,
      remaining_weeks: loan.remaining_weeks,
      status: loan.status,
      next_payment_due: loan.next_payment_due,
      created_at: loan.created_at,
      progress_percentage: loan.loan_duration_weeks > 0 
        ? Math.round(((loan.loan_duration_weeks - loan.remaining_weeks) / loan.loan_duration_weeks) * 100)
        : 0
    }))

    return NextResponse.json({
      success: true,
      data: {
        student: {
          name: student.name,
          credit_score: student.credit_score
        },
        loans: formattedLoans || [],
        summary: {
          total_loans: loans?.length || 0,
          active_loans: activeLoans.length,
          total_outstanding: totalOutstanding,
          total_monthly_payment: totalMonthlyPayment
        },
        eligibility: {
          can_apply: eligibility?.eligible || false,
          reason: eligibility?.reason || '',
          current_loans_count: eligibility?.current_loans_count || 0
        },
        current_rate: currentRate ? {
          annual_rate: currentRate.annual_rate,
          max_amount: currentRate.max_amount,
          max_weeks: currentRate.max_weeks,
          description: currentRate.grade_description
        } : null
      }
    })

  } catch (error) {
    console.error('Loan list error:', error)
    return NextResponse.json({
      success: false,
      error: '서버 오류가 발생했습니다.'
    }, { status: 500 })
  }
}