import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import { cookies } from 'next/headers'

// 대출 신청 API
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const studentId = cookieStore.get('student_id')?.value
    const teacherId = cookieStore.get('teacher_id')?.value

    if (!studentId || !teacherId) {
      return NextResponse.json({
        success: false,
        error: '인증이 필요합니다.'
      }, { status: 401 })
    }

    const body = await request.json()
    const { loan_amount, duration_weeks } = body

    // 입력 검증
    if (!loan_amount || !duration_weeks) {
      return NextResponse.json({
        success: false,
        error: '대출 금액과 기간은 필수입니다.'
      }, { status: 400 })
    }

    if (loan_amount <= 0 || duration_weeks <= 0) {
      return NextResponse.json({
        success: false,
        error: '대출 금액과 기간은 양수여야 합니다.'
      }, { status: 400 })
    }

    // 학생 정보 조회 (신용점수 포함)
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, name, credit_score, teacher_id')
      .eq('id', studentId)
      .eq('teacher_id', teacherId)
      .single()

    if (studentError || !student) {
      return NextResponse.json({
        success: false,
        error: '학생 정보를 찾을 수 없습니다.'
      }, { status: 404 })
    }

    // 대출 가능 여부 확인
    const { data: eligibilityCheck, error: eligibilityError } = await supabase
      .rpc('check_loan_eligibility', { student_uuid: student.id })

    if (eligibilityError) {
      console.error('Eligibility check error:', eligibilityError)
    }

    const eligibility = eligibilityCheck?.[0]
    if (!eligibility?.eligible) {
      return NextResponse.json({
        success: false,
        error: eligibility?.reason || '대출 신청이 불가능합니다.'
      }, { status: 400 })
    }

    // 신용점수에 따른 이자율 조회
    const { data: rateInfo, error: rateError } = await supabase
      .rpc('get_interest_rate_by_credit_score', { credit_score: student.credit_score })

    if (rateError || !rateInfo || rateInfo.length === 0) {
      return NextResponse.json({
        success: false,
        error: '신용점수에 해당하는 이자율을 찾을 수 없습니다.'
      }, { status: 400 })
    }

    const rate = rateInfo[0]

    // 대출 한도 확인
    if (loan_amount > rate.max_amount) {
      return NextResponse.json({
        success: false,
        error: `신용등급에 따른 최대 대출한도(${rate.max_amount.toLocaleString()}원)를 초과했습니다.`
      }, { status: 400 })
    }

    // 대출 기간 확인
    if (duration_weeks > rate.max_weeks) {
      return NextResponse.json({
        success: false,
        error: `신용등급에 따른 최대 대출기간(${rate.max_weeks}주)을 초과했습니다.`
      }, { status: 400 })
    }

    // 주간 상환금 계산
    const { data: weeklyPaymentData, error: paymentError } = await supabase
      .rpc('calculate_weekly_payment', {
        principal: loan_amount,
        annual_rate: rate.annual_rate,
        duration_weeks: duration_weeks
      })

    if (paymentError) {
      console.error('Payment calculation error:', paymentError)
      return NextResponse.json({
        success: false,
        error: '상환금 계산에 실패했습니다.'
      }, { status: 500 })
    }

    const weeklyPayment = weeklyPaymentData
    const totalPayment = weeklyPayment * duration_weeks

    // 대출 생성
    const nextPaymentDue = new Date()
    nextPaymentDue.setDate(nextPaymentDue.getDate() + 7) // 1주 후

    const { data: newLoan, error: loanError } = await supabase
      .from('loans')
      .insert({
        student_id: student.id,
        loan_amount: loan_amount,
        interest_rate: rate.annual_rate,
        loan_duration_weeks: duration_weeks,
        weekly_payment: weeklyPayment,
        total_payment: totalPayment,
        remaining_balance: loan_amount,
        remaining_weeks: duration_weeks,
        status: 'active',
        next_payment_due: nextPaymentDue.toISOString()
      })
      .select()
      .single()

    if (loanError) {
      console.error('Loan creation error:', loanError)
      return NextResponse.json({
        success: false,
        error: '대출 생성에 실패했습니다.'
      }, { status: 500 })
    }

    // 대출금을 학생의 입출금 계좌에 입금
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('balance')
      .eq('student_id', student.id)
      .eq('account_type', 'checking')
      .single()

    if (accountError || !account) {
      return NextResponse.json({
        success: false,
        error: '입출금 계좌를 찾을 수 없습니다.'
      }, { status: 404 })
    }

    // 계좌에 대출금 입금
    const { error: balanceUpdateError } = await supabase
      .from('accounts')
      .update({
        balance: account.balance + loan_amount,
        updated_at: new Date().toISOString()
      })
      .eq('student_id', student.id)
      .eq('account_type', 'checking')

    if (balanceUpdateError) {
      console.error('Balance update error:', balanceUpdateError)
      return NextResponse.json({
        success: false,
        error: '계좌 입금에 실패했습니다.'
      }, { status: 500 })
    }

    // 거래 내역 기록
    await supabase
      .from('transactions')
      .insert({
        from_student_id: null, // 은행에서
        to_student_id: student.id,
        amount: loan_amount,
        transaction_type: 'loan_disbursement',
        description: `대출 실행 - ${duration_weeks}주 상환, 연이자 ${rate.annual_rate}%`,
        status: 'completed'
      })

    // 은행 경제주체 잔액 차감 (대출금 지급)
    const { data: bank } = await supabase
      .from('economic_entities')
      .select('id, balance')
      .eq('teacher_id', student.teacher_id)
      .eq('entity_type', 'bank')
      .single()

    if (bank && bank.balance >= loan_amount) {
      await supabase
        .from('economic_entities')
        .update({
          balance: bank.balance - loan_amount,
          updated_at: new Date().toISOString()
        })
        .eq('id', bank.id)
    }

    return NextResponse.json({
      success: true,
      message: `대출이 성공적으로 실행되었습니다. ${loan_amount.toLocaleString()}원이 입출금 계좌에 입금되었습니다.`,
      loan: {
        id: newLoan.id,
        loan_amount: loan_amount,
        interest_rate: rate.annual_rate,
        duration_weeks: duration_weeks,
        weekly_payment: weeklyPayment,
        total_payment: totalPayment,
        next_payment_due: nextPaymentDue,
        grade_description: rate.grade_description
      }
    })

  } catch (error) {
    console.error('Loan application error:', error)
    return NextResponse.json({
      success: false,
      error: '서버 오류가 발생했습니다.'
    }, { status: 500 })
  }
}