import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import { cookies } from 'next/headers'

// 학생 계좌 간 자금 이동 API
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
    const { from_account, to_account, amount } = body

    // 입력 데이터 검증
    if (!from_account || !to_account || !amount) {
      return NextResponse.json({
        success: false,
        error: '출금 계좌, 입금 계좌, 금액은 필수입니다.'
      }, { status: 400 })
    }

    // 금액을 숫자로 변환
    const transferAmount = Number(amount)
    if (isNaN(transferAmount)) {
      return NextResponse.json({
        success: false,
        error: '유효하지 않은 금액입니다.'
      }, { status: 400 })
    }

    if (from_account === to_account) {
      return NextResponse.json({
        success: false,
        error: '같은 계좌로는 이체할 수 없습니다.'
      }, { status: 400 })
    }

    const validAccounts = ['checking', 'savings', 'investment']
    if (!validAccounts.includes(from_account) || !validAccounts.includes(to_account)) {
      return NextResponse.json({
        success: false,
        error: '유효하지 않은 계좌 타입입니다.'
      }, { status: 400 })
    }

    if (transferAmount <= 0) {
      return NextResponse.json({
        success: false,
        error: '이체 금액은 0보다 커야 합니다.'
      }, { status: 400 })
    }

    // 출금 계좌 잔액 확인
    const { data: fromAccount, error: fromAccountError } = await supabase
      .from('accounts')
      .select('balance')
      .eq('student_id', studentId)
      .eq('account_type', from_account)
      .single()

    if (fromAccountError || !fromAccount) {
      return NextResponse.json({
        success: false,
        error: '출금 계좌를 찾을 수 없습니다.'
      }, { status: 404 })
    }

    if (fromAccount.balance < transferAmount) {
      return NextResponse.json({
        success: false,
        error: '출금 계좌의 잔액이 부족합니다.'
      }, { status: 400 })
    }

    // 입금 계좌 확인
    const { data: toAccount, error: toAccountError } = await supabase
      .from('accounts')
      .select('balance')
      .eq('student_id', studentId)
      .eq('account_type', to_account)
      .single()

    if (toAccountError || !toAccount) {
      return NextResponse.json({
        success: false,
        error: '입금 계좌를 찾을 수 없습니다.'
      }, { status: 404 })
    }

    // 출금 계좌에서 차감
    const { error: debitError } = await supabase
      .from('accounts')
      .update({ 
        balance: fromAccount.balance - transferAmount,
        updated_at: new Date().toISOString()
      })
      .eq('student_id', studentId)
      .eq('account_type', from_account)

    if (debitError) {
      console.error('Debit error:', debitError)
      return NextResponse.json({
        success: false,
        error: '출금 처리에 실패했습니다.'
      }, { status: 500 })
    }

    // 입금 계좌에 입금
    const { error: creditError } = await supabase
      .from('accounts')
      .update({ 
        balance: toAccount.balance + transferAmount,
        updated_at: new Date().toISOString()
      })
      .eq('student_id', studentId)
      .eq('account_type', to_account)

    if (creditError) {
      console.error('Credit error:', creditError)
      
      // 롤백: 출금 계좌 복구
      await supabase
        .from('accounts')
        .update({ 
          balance: fromAccount.balance,
          updated_at: new Date().toISOString()
        })
        .eq('student_id', studentId)
        .eq('account_type', from_account)

      return NextResponse.json({
        success: false,
        error: '입금 처리에 실패했습니다.'
      }, { status: 500 })
    }

    // 거래 내역 기록
    const { error: transactionError } = await supabase
      .from('transactions')
      .insert({
        from_student_id: studentId,
        to_student_id: studentId,
        amount: transferAmount,
        transaction_type: 'account_transfer',
        description: `${from_account} → ${to_account} 계좌 이체`,
        status: 'completed'
      })

    if (transactionError) {
      console.warn('Transaction log error:', transactionError)
      // 거래 로그 실패는 전체 작업을 실패시키지 않음
    }

    const accountNames = {
      checking: '당좌계좌',
      savings: '저축계좌', 
      investment: '투자계좌'
    }

    return NextResponse.json({
      success: true,
      message: `${accountNames[from_account as keyof typeof accountNames]}에서 ${accountNames[to_account as keyof typeof accountNames]}로 ${transferAmount.toLocaleString()}원이 이체되었습니다.`,
      transfer: {
        from_account,
        to_account,
        amount: transferAmount,
        from_balance: fromAccount.balance - transferAmount,
        to_balance: toAccount.balance + transferAmount
      }
    })

  } catch (error) {
    console.error('Account transfer error:', error)
    return NextResponse.json({
      success: false,
      error: '서버 오류가 발생했습니다.'
    }, { status: 500 })
  }
}