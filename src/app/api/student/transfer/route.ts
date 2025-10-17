import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import { cookies } from 'next/headers'

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
    const { to_student_id, amount, from_account = 'checking', description } = body

    // 입력 데이터 검증
    if (!to_student_id || !amount || amount <= 0) {
      return NextResponse.json({
        success: false,
        error: '받을 학생과 송금액을 확인해주세요.'
      }, { status: 400 })
    }

    if (!['checking', 'savings', 'investment'].includes(from_account)) {
      return NextResponse.json({
        success: false,
        error: '유효하지 않은 계좌 유형입니다.'
      }, { status: 400 })
    }

    // 자기 자신에게 송금 방지
    if (to_student_id === studentId) {
      return NextResponse.json({
        success: false,
        error: '자기 자신에게는 송금할 수 없습니다.'
      }, { status: 400 })
    }

    // 받을 학생이 같은 교사 소속인지 확인
    const { data: toStudent } = await supabase
      .from('students')
      .select('id, name')
      .eq('id', to_student_id)
      .eq('teacher_id', teacherId)
      .single()

    if (!toStudent) {
      return NextResponse.json({
        success: false,
        error: '해당 학생을 찾을 수 없습니다.'
      }, { status: 404 })
    }

    // 보내는 학생의 계좌 잔액 확인
    const { data: fromAccount } = await supabase
      .from('accounts')
      .select('balance')
      .eq('student_id', studentId)
      .eq('account_type', from_account)
      .single()

    if (!fromAccount) {
      return NextResponse.json({
        success: false,
        error: '계좌 정보를 찾을 수 없습니다.'
      }, { status: 404 })
    }

    if (fromAccount.balance < amount) {
      return NextResponse.json({
        success: false,
        error: '잔액이 부족합니다.'
      }, { status: 400 })
    }

    // 받는 학생의 당좌예금 계좌 확인
    const { data: toAccount } = await supabase
      .from('accounts')
      .select('balance')
      .eq('student_id', to_student_id)
      .eq('account_type', 'checking')
      .single()

    if (!toAccount) {
      return NextResponse.json({
        success: false,
        error: '받는 학생의 계좌를 찾을 수 없습니다.'
      }, { status: 404 })
    }

    // 트랜잭션 시작: 송금 처리
    // 1. 보내는 계좌에서 차감
    const { error: debitError } = await supabase
      .from('accounts')
      .update({
        balance: fromAccount.balance - amount,
        updated_at: new Date().toISOString()
      })
      .eq('student_id', studentId)
      .eq('account_type', from_account)

    if (debitError) {
      console.error('Debit error:', debitError)
      return NextResponse.json({
        success: false,
        error: '송금 처리 중 오류가 발생했습니다.'
      }, { status: 500 })
    }

    // 2. 받는 계좌에 입금
    const { error: creditError } = await supabase
      .from('accounts')
      .update({
        balance: toAccount.balance + amount,
        updated_at: new Date().toISOString()
      })
      .eq('student_id', to_student_id)
      .eq('account_type', 'checking')

    if (creditError) {
      console.error('Credit error:', creditError)

      // 롤백: 보내는 계좌 복구
      await supabase
        .from('accounts')
        .update({ balance: fromAccount.balance })
        .eq('student_id', studentId)
        .eq('account_type', from_account)

      return NextResponse.json({
        success: false,
        error: '송금 처리 중 오류가 발생했습니다.'
      }, { status: 500 })
    }

    // 3. 거래 내역 기록 (metadata 제거, from/to_account_type 사용)
    console.log('💾 Saving student transfer transaction:', {
      from_student_id: studentId,
      to_student_id: to_student_id,
      amount: amount,
      from_account_type: from_account,
      to_account_type: 'checking'
    })

    const { data: transactionData, error: transactionError } = await supabase
      .from('transactions')
      .insert({
        from_student_id: studentId,
        to_student_id: to_student_id,
        amount: amount,
        transaction_type: 'transfer',
        description: description || '학생 송금',
        status: 'completed',
        from_account_type: from_account,
        to_account_type: 'checking'
      })
      .select()

    if (transactionError) {
      console.error('❌ Transaction log error:', transactionError)
      // 거래 로그 실패는 전체 송금을 실패시키지 않음
    } else {
      console.log('✅ Student transfer transaction saved:', transactionData)
    }

    return NextResponse.json({
      success: true,
      message: '송금이 완료되었습니다.',
      transaction: {
        to_student_name: toStudent.name,
        amount: amount,
        from_account: from_account
      }
    })

  } catch (error) {
    console.error('Transfer error:', error)
    return NextResponse.json({
      success: false,
      error: '서버 오류가 발생했습니다.'
    }, { status: 500 })
  }
}