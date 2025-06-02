import { NextRequest, NextResponse } from 'next/server'
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

    // 송금자 정보 조회
    const { data: fromStudent, error: fromError } = await supabase
      .from('students')
      .select('id, name, accounts')
      .eq('id', from_student_id)
      .single()

    if (fromError || !fromStudent) {
      return NextResponse.json({
        success: false,
        error: '송금자를 찾을 수 없습니다.'
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
    const availableBalance = fromStudent.accounts[from_account_type] || 0
    if (totalAmount > availableBalance) {
      return NextResponse.json({
        success: false,
        error: '잔액이 부족합니다.'
      }, { status: 400 })
    }

    // 수신자들 유효성 검증
    const recipientIds = recipients.map(r => r.student_id)
    const { data: validRecipients, error: recipientsError } = await supabase
      .from('students')
      .select('id, name, accounts')
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

    // 트랜잭션 시작
    const { error: senderError } = await supabase
      .from('students')
      .update({
        [`accounts.${from_account_type}`]: availableBalance - totalAmount
      })
      .eq('id', from_student_id)

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
      const recipientData = validRecipients.find(r => r.id === recipient.student_id)
      if (!recipientData) {
        errors.push(`수신자 ${recipient.student_id}를 찾을 수 없습니다.`)
        continue
      }

      const currentBalance = recipientData.accounts[recipient.account_type] || 0
      
      // 수신자 계좌 업데이트
      const { error: recipientError } = await supabase
        .from('students')
        .update({
          [`accounts.${recipient.account_type}`]: currentBalance + recipient.amount
        })
        .eq('id', recipient.student_id)

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
          student_id: from_student_id,
          transaction_type: 'transfer_out',
          amount: -recipient.amount,
          account_type: from_account_type,
          description: `${recipientData.name}에게 ${transactionDescription}`,
          related_student_id: recipient.student_id
        })
        .select()

      // 수신자 거래 기록
      const { data: recipientTransaction, error: recipientTxError } = await supabase
        .from('transactions')
        .insert({
          student_id: recipient.student_id,
          transaction_type: 'transfer_in',
          amount: recipient.amount,
          account_type: recipient.account_type,
          description: `${fromStudent.name}으로부터 ${transactionDescription}`,
          related_student_id: from_student_id
        })
        .select()

      if (senderTxError || recipientTxError) {
        errors.push(`${recipientData.name}의 거래 기록 생성에 실패했습니다.`)
      } else {
        transactionRecords.push({
          sender: senderTransaction?.[0],
          recipient: recipientTransaction?.[0]
        })
      }
    }

    // 결과 반환
    const successCount = recipients.length - errors.length
    
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
          account_type: from_account_type
        },
        recipients: recipients.map(r => {
          const recipientData = validRecipients.find(rd => rd.id === r.student_id)
          return {
            id: r.student_id,
            name: recipientData?.name,
            amount: r.amount,
            account_type: r.account_type
          }
        })
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