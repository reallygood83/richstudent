import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import { cookies } from 'next/headers'

// 대출 상환 API
export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { loan_id, payment_amount } = body

    // 입력 검증
    if (!loan_id || !payment_amount) {
      return NextResponse.json({
        success: false,
        error: '대출 ID와 상환 금액은 필수입니다.'
      }, { status: 400 })
    }

    if (payment_amount <= 0) {
      return NextResponse.json({
        success: false,
        error: '상환 금액은 양수여야 합니다.'
      }, { status: 400 })
    }

    // 학생 정보 조회
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, name, teacher_id')
      .eq('id', sessionData.student_id)
      .single()

    if (studentError || !student) {
      return NextResponse.json({
        success: false,
        error: '학생 정보를 찾을 수 없습니다.'
      }, { status: 404 })
    }

    // 대출 정보 조회
    const { data: loan, error: loanError } = await supabase
      .from('loans')
      .select('*')
      .eq('id', loan_id)
      .eq('student_id', student.id)
      .eq('status', 'active')
      .single()

    if (loanError || !loan) {
      return NextResponse.json({
        success: false,
        error: '해당 대출을 찾을 수 없습니다.'
      }, { status: 404 })
    }

    // 계좌 잔액 확인
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

    if (account.balance < payment_amount) {
      return NextResponse.json({
        success: false,
        error: `잔액이 부족합니다. 현재 잔액: ${account.balance.toLocaleString()}원`
      }, { status: 400 })
    }

    // 상환 금액이 남은 잔액보다 큰 경우 조정
    const actualPayment = Math.min(payment_amount, loan.remaining_balance)

    // 이자와 원금 계산
    const weeklyInterestRate = loan.interest_rate / 100 / 12 // 주간 이자율
    const interestAmount = Math.round(loan.remaining_balance * weeklyInterestRate)
    const principalAmount = actualPayment - interestAmount

    // 원금이 음수가 되는 경우 (이자만으로 상환 금액 초과)
    if (principalAmount < 0) {
      return NextResponse.json({
        success: false,
        error: `최소 상환 금액은 ${interestAmount.toLocaleString()}원(이자)입니다.`
      }, { status: 400 })
    }

    // 남은 잔액 계산
    const newRemainingBalance = loan.remaining_balance - principalAmount
    const isLoanCompleted = newRemainingBalance <= 0

    // 계좌에서 상환금 차감
    const { error: balanceUpdateError } = await supabase
      .from('accounts')
      .update({
        balance: account.balance - actualPayment,
        updated_at: new Date().toISOString()
      })
      .eq('student_id', student.id)
      .eq('account_type', 'checking')

    if (balanceUpdateError) {
      console.error('Balance update error:', balanceUpdateError)
      return NextResponse.json({
        success: false,
        error: '계좌 차감에 실패했습니다.'
      }, { status: 500 })
    }

    // 상환 내역 기록
    const paymentWeek = loan.loan_duration_weeks - loan.remaining_weeks + 1
    
    const { error: paymentRecordError } = await supabase
      .from('loan_payments')
      .insert({
        loan_id: loan.id,
        student_id: student.id,
        payment_amount: actualPayment,
        interest_amount: interestAmount,
        principal_amount: principalAmount,
        payment_week: paymentWeek,
        remaining_balance: Math.max(0, newRemainingBalance),
        payment_type: payment_amount === loan.weekly_payment ? 'scheduled' : 'early'
      })

    if (paymentRecordError) {
      console.error('Payment record error:', paymentRecordError)
      return NextResponse.json({
        success: false,
        error: '상환 내역 기록에 실패했습니다.'
      }, { status: 500 })
    }

    // 대출 상태 업데이트
    const nextPaymentDue = new Date(loan.next_payment_due)
    nextPaymentDue.setDate(nextPaymentDue.getDate() + 7) // 다음 주

    const loanUpdateData = isLoanCompleted ? {
      remaining_balance: 0,
      remaining_weeks: 0,
      status: 'completed',
      updated_at: new Date().toISOString()
    } : {
      remaining_balance: newRemainingBalance,
      remaining_weeks: loan.remaining_weeks - 1,
      next_payment_due: nextPaymentDue.toISOString(),
      updated_at: new Date().toISOString()
    }

    const { error: loanUpdateError } = await supabase
      .from('loans')
      .update(loanUpdateData)
      .eq('id', loan.id)

    if (loanUpdateError) {
      console.error('Loan update error:', loanUpdateError)
      return NextResponse.json({
        success: false,
        error: '대출 정보 업데이트에 실패했습니다.'
      }, { status: 500 })
    }

    // 거래 내역 기록
    await supabase
      .from('transactions')
      .insert({
        from_student_id: student.id,
        to_student_id: null, // 은행으로
        amount: actualPayment,
        transaction_type: 'loan_repayment',
        description: `대출 상환 - ${paymentWeek}차 (이자: ${interestAmount.toLocaleString()}원, 원금: ${principalAmount.toLocaleString()}원)`,
        status: 'completed'
      })

    // 은행 경제주체 잔액 증가
    const { data: bank } = await supabase
      .from('economic_entities')
      .select('id, balance')
      .eq('teacher_id', student.teacher_id)
      .eq('entity_type', 'bank')
      .single()

    if (bank) {
      await supabase
        .from('economic_entities')
        .update({
          balance: bank.balance + actualPayment,
          updated_at: new Date().toISOString()
        })
        .eq('id', bank.id)
    }

    return NextResponse.json({
      success: true,
      message: isLoanCompleted 
        ? '축하합니다! 대출이 완전히 상환되었습니다.'
        : `${actualPayment.toLocaleString()}원이 성공적으로 상환되었습니다.`,
      payment: {
        payment_amount: actualPayment,
        interest_amount: interestAmount,
        principal_amount: principalAmount,
        remaining_balance: Math.max(0, newRemainingBalance),
        remaining_weeks: isLoanCompleted ? 0 : loan.remaining_weeks - 1,
        is_completed: isLoanCompleted
      }
    })

  } catch (error) {
    console.error('Loan repayment error:', error)
    return NextResponse.json({
      success: false,
      error: '서버 오류가 발생했습니다.'
    }, { status: 500 })
  }
}