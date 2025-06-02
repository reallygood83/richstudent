import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase/client'

interface TaxCollectionRequest {
  tax_type: 'percentage' | 'fixed'
  account_type: string
  description?: string
  percentage_rate?: number
  fixed_amount?: number
  student_ids: string[]
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

    const body: TaxCollectionRequest = await request.json()
    const { 
      tax_type, 
      account_type, 
      description = '',
      percentage_rate,
      fixed_amount,
      student_ids 
    } = body

    // 입력 검증
    if (!tax_type || !account_type || !student_ids || student_ids.length === 0) {
      return NextResponse.json({
        success: false,
        error: '필수 정보가 누락되었습니다.'
      }, { status: 400 })
    }

    if (tax_type === 'percentage') {
      if (!percentage_rate || percentage_rate <= 0 || percentage_rate > 100) {
        return NextResponse.json({
          success: false,
          error: '세율은 0%보다 크고 100% 이하여야 합니다.'
        }, { status: 400 })
      }
    } else if (tax_type === 'fixed') {
      if (!fixed_amount || fixed_amount <= 0) {
        return NextResponse.json({
          success: false,
          error: '고정 금액은 0보다 커야 합니다.'
        }, { status: 400 })
      }
    }

    // 학생들 정보 조회
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('id, name, student_code')
      .eq('teacher_id', teacher.id)
      .in('id', student_ids)

    if (studentsError || !students || students.length === 0) {
      return NextResponse.json({
        success: false,
        error: '학생 정보를 찾을 수 없습니다.'
      }, { status: 404 })
    }

    // Government 계정 정보 조회 (세금을 받을 계정)
    const { data: government, error: govError } = await supabase
      .from('economic_entities')
      .select('id, name')
      .eq('name', 'Government')
      .eq('teacher_id', teacher.id)
      .single()

    if (govError || !government) {
      return NextResponse.json({
        success: false,
        error: 'Government 계정을 찾을 수 없습니다. 경제 기구를 먼저 초기화해주세요.'
      }, { status: 404 })
    }

    // Government 계좌 조회
    const { data: governmentAccount, error: govAccountError } = await supabase
      .from('economic_entity_accounts')
      .select('balance')
      .eq('entity_id', government.id)
      .eq('account_type', account_type)
      .single()

    if (govAccountError || !governmentAccount) {
      return NextResponse.json({
        success: false,
        error: `Government ${account_type} 계좌를 찾을 수 없습니다.`
      }, { status: 404 })
    }

    // 세금 계산 및 검증
    const taxCollections = []
    const errors = []

    for (const student of students) {
      // 학생 계좌 잔액 조회
      const { data: studentAccount, error: accountError } = await supabase
        .from('accounts')
        .select('balance')
        .eq('student_id', student.id)
        .eq('account_type', account_type)
        .single()

      if (accountError || !studentAccount) {
        errors.push(`${student.name}의 ${account_type} 계좌를 찾을 수 없습니다.`)
        continue
      }

      const currentBalance = studentAccount.balance
      
      let taxAmount = 0
      if (tax_type === 'percentage') {
        taxAmount = Math.round(currentBalance * (percentage_rate! / 100))
      } else {
        taxAmount = fixed_amount!
      }

      if (taxAmount <= 0) {
        continue // 세금이 0인 경우 건너뛰기
      }

      if (taxAmount > currentBalance) {
        errors.push(`${student.name}: 잔액 부족 (잔액: ₩${currentBalance.toLocaleString()}, 세금: ₩${taxAmount.toLocaleString()})`)
        continue
      }

      taxCollections.push({
        student,
        taxAmount,
        currentBalance
      })
    }

    if (errors.length > 0) {
      return NextResponse.json({
        success: false,
        error: `일부 학생의 잔액이 부족합니다:\n${errors.join('\n')}`,
        data: { errors }
      }, { status: 400 })
    }

    if (taxCollections.length === 0) {
      return NextResponse.json({
        success: false,
        error: '세금을 징수할 수 있는 학생이 없습니다.'
      }, { status: 400 })
    }

    // 트랜잭션 실행
    const totalTaxAmount = taxCollections.reduce((sum, collection) => sum + collection.taxAmount, 0)
    const transactionRecords = []

    // Government 계정에 세금 추가
    const { error: govUpdateError } = await supabase
      .from('economic_entity_accounts')
      .update({ balance: governmentAccount.balance + totalTaxAmount })
      .eq('entity_id', government.id)
      .eq('account_type', account_type)

    if (govUpdateError) {
      return NextResponse.json({
        success: false,
        error: 'Government 계정 업데이트에 실패했습니다.'
      }, { status: 500 })
    }

    // 각 학생에서 세금 징수
    for (const collection of taxCollections) {
      const { student, taxAmount, currentBalance } = collection

      try {
        // 학생 계좌에서 세금 차감
        const { error: studentUpdateError } = await supabase
          .from('accounts')
          .update({ balance: currentBalance - taxAmount })
          .eq('student_id', student.id)
          .eq('account_type', account_type)

        if (studentUpdateError) {
          errors.push(`${student.name}의 계좌 업데이트에 실패했습니다.`)
          continue
        }

        // 거래 기록 생성
        const taxDescription = description 
          ? `${description} (${tax_type === 'percentage' ? `${percentage_rate}% 비례세` : `₩${fixed_amount!.toLocaleString()} 정액세`})`
          : `${tax_type === 'percentage' ? `${percentage_rate}% 비례세` : `₩${fixed_amount!.toLocaleString()} 정액세`} 징수`

        // 학생 거래 기록 (세금 지출)
        const { data: studentTransaction, error: studentTxError } = await supabase
          .from('transactions')
          .insert({
            from_student_id: student.id,
            to_economic_entity_id: government.id,
            from_account_type: account_type,
            to_account_type: account_type,
            amount: taxAmount,
            transaction_type: 'tax_payment',
            status: 'completed',
            memo: taxDescription
          })
          .select()
          .single()

        if (studentTxError) {
          errors.push(`${student.name}의 거래 기록 생성에 실패했습니다.`)
        } else {
          transactionRecords.push({
            transaction_id: studentTransaction.id,
            student_name: student.name,
            student_code: student.student_code,
            tax_amount: taxAmount
          })
        }

      } catch (error) {
        console.error(`Tax collection error for ${student.id}:`, error)
        errors.push(`${student.name}의 세금 징수 중 오류가 발생했습니다.`)
      }
    }

    // 결과 반환
    const successCount = transactionRecords.length
    
    if (errors.length > 0) {
      return NextResponse.json({
        success: false,
        error: `일부 세금 징수가 실패했습니다: ${errors.join(', ')}`,
        data: {
          success_count: successCount,
          error_count: errors.length,
          total_tax_amount: totalTaxAmount,
          errors
        }
      }, { status: 207 }) // 207 Multi-Status
    }

    return NextResponse.json({
      success: true,
      message: `${successCount}명에게서 총 ₩${totalTaxAmount.toLocaleString()}의 세금을 징수했습니다.`,
      data: {
        success_count: successCount,
        total_tax_amount: totalTaxAmount,
        average_tax_amount: Math.round(totalTaxAmount / successCount),
        transactions: transactionRecords,
        tax_type,
        percentage_rate: tax_type === 'percentage' ? percentage_rate : null,
        fixed_amount: tax_type === 'fixed' ? fixed_amount : null,
        account_type,
        government: {
          id: government.id,
          name: government.name,
          new_balance: governmentAccount.balance + totalTaxAmount
        }
      }
    })

  } catch (error) {
    console.error('Tax collection error:', error)
    return NextResponse.json({
      success: false,
      error: '세금 징수 처리 중 오류가 발생했습니다.'
    }, { status: 500 })
  }
}