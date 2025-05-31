import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase/client'

// 학생 간 송금 API
export async function POST(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('session_token')?.value

    if (!sessionToken) {
      return NextResponse.json(
        { success: false, error: '인증이 필요합니다.' },
        { status: 401 }
      )
    }

    const teacher = await validateSession(sessionToken)
    if (!teacher) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 세션입니다.' },
        { status: 401 }
      )
    }

    const {
      from_student_id,
      to_student_id,
      amount,
      from_account_type = 'checking',
      to_account_type = 'checking',
      description = ''
    } = await request.json()

    // 입력 검증
    if (!from_student_id || !to_student_id || !amount || amount <= 0) {
      return NextResponse.json(
        { success: false, error: '필수 필드가 누락되었거나 올바르지 않습니다.' },
        { status: 400 }
      )
    }

    if (from_student_id === to_student_id) {
      return NextResponse.json(
        { success: false, error: '같은 학생에게는 송금할 수 없습니다.' },
        { status: 400 }
      )
    }

    // 송금자 계좌 잔액 확인
    const { data: fromAccount, error: fromError } = await supabase
      .from('accounts')
      .select('balance')
      .eq('student_id', from_student_id)
      .eq('account_type', from_account_type)
      .single()

    if (fromError || !fromAccount) {
      return NextResponse.json(
        { success: false, error: '송금자 계좌를 찾을 수 없습니다.' },
        { status: 400 }
      )
    }

    if (fromAccount.balance < amount) {
      return NextResponse.json(
        { success: false, error: '잔액이 부족합니다.' },
        { status: 400 }
      )
    }

    // 수신자 계좌 확인
    const { data: toAccount, error: toError } = await supabase
      .from('accounts')
      .select('id, balance')
      .eq('student_id', to_student_id)
      .eq('account_type', to_account_type)
      .single()

    if (toError || !toAccount) {
      return NextResponse.json(
        { success: false, error: '수신자 계좌를 찾을 수 없습니다.' },
        { status: 400 }
      )
    }

    // 트랜잭션 시작 - 계좌 잔액 업데이트
    const { error: debitError } = await supabase
      .from('accounts')
      .update({ 
        balance: fromAccount.balance - amount,
        updated_at: new Date().toISOString()
      })
      .eq('student_id', from_student_id)
      .eq('account_type', from_account_type)

    if (debitError) {
      return NextResponse.json(
        { success: false, error: '송금 처리 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    const { error: creditError } = await supabase
      .from('accounts')
      .update({ 
        balance: toAccount.balance + amount,
        updated_at: new Date().toISOString()
      })
      .eq('student_id', to_student_id)
      .eq('account_type', to_account_type)

    if (creditError) {
      // 롤백 시도
      await supabase
        .from('accounts')
        .update({ balance: fromAccount.balance })
        .eq('student_id', from_student_id)
        .eq('account_type', from_account_type)

      return NextResponse.json(
        { success: false, error: '송금 처리 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    // 거래 기록 저장
    const { error: transactionError } = await supabase
      .from('transactions')
      .insert({
        teacher_id: teacher.id,
        from_student_id,
        to_student_id,
        transaction_type: 'transfer',
        amount,
        from_account_type,
        to_account_type,
        description,
        status: 'completed'
      })

    if (transactionError) {
      console.error('Transaction record error:', transactionError)
      // 거래는 성공했지만 기록 저장 실패 (로그만 남김)
    }

    return NextResponse.json({
      success: true,
      message: '송금이 완료되었습니다.',
      transaction: {
        from_student_id,
        to_student_id,
        amount,
        from_account_type,
        to_account_type,
        description
      }
    })

  } catch (error) {
    console.error('Transfer error:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}