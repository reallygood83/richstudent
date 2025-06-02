import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase/client'

interface TransferRecipient {
  student_id: string
  amount: number
  account_type: string
}

interface MultiTransferRequest {
  from_student_id: string
  from_account_type: string
  recipients: TransferRecipient[]
  description?: string
  transfer_type: 'individual' | 'equal'
}

export async function POST(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('session_token')?.value

    if (!sessionToken) {
      return NextResponse.json({
        success: false,
        error: '인증이 필요합니다.'
      }, { status: 401 })
    }

    // 세션 검증
    const teacher = await validateSession(sessionToken)
    if (!teacher) {
      return NextResponse.json({
        success: false,
        error: '유효하지 않은 세션입니다.'
      }, { status: 401 })
    }

    const body: MultiTransferRequest = await request.json()
    const { 
      from_student_id, 
      from_account_type, 
      recipients, 
      description = '',
      transfer_type 
    } = body

    // 입력 검증
    if (!from_student_id || !from_account_type || !recipients || recipients.length === 0) {
      return NextResponse.json({
        success: false,
        error: '필수 정보가 누락되었습니다.'
      }, { status: 400 })
    }

    // 송금자 정보 및 계좌 조회
    const { data: fromStudent, error: fromError } = await supabase
      .from('students')
      .select('id, name, student_code')
      .eq('id', from_student_id)
      .eq('teacher_id', teacher.id)
      .single()

    if (fromError || !fromStudent) {
      return NextResponse.json({
        success: false,
        error: '송금자를 찾을 수 없습니다.'
      }, { status: 404 })
    }

    // 송금자 계좌 잔액 조회
    const { data: fromAccount, error: fromAccountError } = await supabase
      .from('accounts')
      .select('balance')
      .eq('student_id', from_student_id)
      .eq('account_type', from_account_type)
      .single()

    if (fromAccountError || !fromAccount) {
      return NextResponse.json({
        success: false,
        error: '송금자 계좌를 찾을 수 없습니다.'
      }, { status: 404 })
    }

    // 총 송금액 계산
    const totalAmount = recipients.reduce((sum, recipient) => sum + recipient.amount, 0)
    
    if (totalAmount <= 0) {
      return NextResponse.json({
        success: false,
        error: '총 송금액은 0보다 커야 합니다.'
      }, { status: 400 })
    }

    // 잔액 확인
    if (totalAmount > fromAccount.balance) {
      return NextResponse.json({
        success: false,
        error: `잔액이 부족합니다. (필요: ₩${totalAmount.toLocaleString()}, 보유: ₩${fromAccount.balance.toLocaleString()})`
      }, { status: 400 })
    }

    // 수신자들 유효성 검증
    const recipientIds = recipients.map(r => r.student_id)
    const { data: validRecipients, error: recipientsError } = await supabase
      .from('students')
      .select('id, name, student_code')
      .eq('teacher_id', teacher.id)
      .in('id', recipientIds)

    if (recipientsError || !validRecipients || validRecipients.length !== recipientIds.length) {
      return NextResponse.json({
        success: false,
        error: '일부 수신자를 찾을 수 없습니다.'
      }, { status: 404 })
    }

    // 중복 수신자 확인
    const uniqueRecipients = new Set(recipientIds)
    if (uniqueRecipients.size !== recipientIds.length) {
      return NextResponse.json({
        success: false,
        error: '중복된 수신자가 있습니다.'
      }, { status: 400 })
    }

    // 자기 자신에게 송금 확인
    if (recipientIds.includes(from_student_id)) {
      return NextResponse.json({
        success: false,
        error: '자기 자신에게는 송금할 수 없습니다.'
      }, { status: 400 })
    }

    // 각 수신자 계좌 존재 확인
    for (const recipient of recipients) {
      const { data: recipientAccount, error: accountError } = await supabase
        .from('accounts')
        .select('id')
        .eq('student_id', recipient.student_id)
        .eq('account_type', recipient.account_type)
        .single()

      if (accountError || !recipientAccount) {
        const recipientInfo = validRecipients.find(r => r.id === recipient.student_id)
        return NextResponse.json({
          success: false,
          error: `${recipientInfo?.name}의 ${recipient.account_type} 계좌를 찾을 수 없습니다.`
        }, { status: 404 })
      }
    }

    // 송금자 계좌 차감
    const { error: senderError } = await supabase
      .from('accounts')
      .update({ balance: fromAccount.balance - totalAmount })
      .eq('student_id', from_student_id)
      .eq('account_type', from_account_type)

    if (senderError) {
      return NextResponse.json({
        success: false,
        error: '송금자 계좌 업데이트에 실패했습니다.'
      }, { status: 500 })
    }

    // 각 수신자에게 송금 처리
    const transactionRecords = []
    const errors = []

    for (const recipient of recipients) {
      try {
        const recipientData = validRecipients.find(r => r.id === recipient.student_id)
        if (!recipientData) {
          errors.push(`수신자 ${recipient.student_id}를 찾을 수 없습니다.`)
          continue
        }

        // 수신자 계좌 잔액 조회
        const { data: recipientAccount, error: accountError } = await supabase
          .from('accounts')
          .select('balance')
          .eq('student_id', recipient.student_id)
          .eq('account_type', recipient.account_type)
          .single()

        if (accountError || !recipientAccount) {
          errors.push(`${recipientData.name}의 계좌를 찾을 수 없습니다.`)
          continue
        }

        // 수신자 계좌 잔액 증가
        const { error: recipientError } = await supabase
          .from('accounts')
          .update({ balance: recipientAccount.balance + recipient.amount })
          .eq('student_id', recipient.student_id)
          .eq('account_type', recipient.account_type)

        if (recipientError) {
          errors.push(`${recipientData.name}의 계좌 업데이트에 실패했습니다.`)
          continue
        }

        // 거래 기록 생성
        const transactionDescription = description 
          ? `${description} (${transfer_type === 'equal' ? '동일금액' : '개별금액'} 다중송금)`
          : `${transfer_type === 'equal' ? '동일금액' : '개별금액'} 다중송금`

        // 송금자 거래 기록
        const { data: senderTransaction, error: senderTxError } = await supabase
          .from('transactions')
          .insert({
            from_student_id: from_student_id,
            to_student_id: recipient.student_id,
            from_account_type: from_account_type,
            to_account_type: recipient.account_type,
            amount: recipient.amount,
            transaction_type: 'multi_transfer',
            status: 'completed',
            memo: `${recipientData.name}에게 ${transactionDescription}`
          })
          .select()
          .single()

        if (senderTxError) {
          errors.push(`${recipientData.name}의 거래 기록 생성에 실패했습니다.`)
        } else {
          transactionRecords.push({
            transaction_id: senderTransaction.id,
            recipient_name: recipientData.name,
            recipient_code: recipientData.student_code,
            amount: recipient.amount,
            account_type: recipient.account_type
          })
        }

      } catch (error) {
        console.error(`Transfer error for ${recipient.student_id}:`, error)
        errors.push(`송금 처리 중 오류가 발생했습니다.`)
      }
    }

    // 결과 반환
    const successCount = transactionRecords.length
    
    if (errors.length > 0) {
      return NextResponse.json({
        success: false,
        error: `일부 송금이 실패했습니다: ${errors.join(', ')}`,
        data: {
          success_count: successCount,
          error_count: errors.length,
          total_amount: totalAmount,
          errors
        }
      }, { status: 207 }) // 207 Multi-Status
    }

    return NextResponse.json({
      success: true,
      message: `${successCount}명에게 총 ₩${totalAmount.toLocaleString()}을 송금했습니다.`,
      data: {
        success_count: successCount,
        total_amount: totalAmount,
        transactions: transactionRecords,
        transfer_type,
        from_student: {
          id: fromStudent.id,
          name: fromStudent.name,
          student_code: fromStudent.student_code,
          account_type: from_account_type
        }
      }
    })

  } catch (error) {
    console.error('Multi-transfer error:', error)
    return NextResponse.json({
      success: false,
      error: '다중 송금 처리 중 오류가 발생했습니다.'
    }, { status: 500 })
  }
}