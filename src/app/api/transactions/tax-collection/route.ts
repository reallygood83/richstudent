import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase/client'

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

    const body = await request.json()
    const {
      student_ids,
      tax_type,
      percentage_rate,
      fixed_amount,
      account_type = 'checking'
    } = body

    // 입력 검증
    if (!student_ids || !Array.isArray(student_ids) || student_ids.length === 0) {
      return NextResponse.json(
        { success: false, error: '학생을 선택해주세요.' },
        { status: 400 }
      )
    }

    if (!tax_type || !['percentage', 'fixed'].includes(tax_type)) {
      return NextResponse.json(
        { success: false, error: '세금 유형을 선택해주세요.' },
        { status: 400 }
      )
    }

    if (tax_type === 'percentage') {
      if (!percentage_rate || percentage_rate <= 0 || percentage_rate > 100) {
        return NextResponse.json(
          { success: false, error: '올바른 세율을 입력해주세요. (1-100)' },
          { status: 400 }
        )
      }
    } else if (tax_type === 'fixed') {
      if (!fixed_amount || fixed_amount <= 0) {
        return NextResponse.json(
          { success: false, error: '올바른 세금 금액을 입력해주세요.' },
          { status: 400 }
        )
      }
    }

    // Government 경제 기구 조회
    const { data: government, error: govError } = await supabase
      .from('economic_entities')
      .select('id, name, balance')
      .eq('name', 'Government')
      .eq('teacher_id', teacher.id)
      .single()

    if (govError || !government) {
      return NextResponse.json(
        { success: false, error: 'Government 경제 기구를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 학생 계좌 조회
    type StudentAccountWithJoin = {
      id: string
      balance: number
      student_id: string
      students: {
        id: string
        name: string
        teacher_id: string
      }
    }

    const { data: studentAccounts, error: accountsError } = await supabase
      .from('accounts')
      .select(`
        id,
        balance,
        student_id,
        students!inner(id, name, teacher_id)
      `)
      .eq('account_type', account_type)
      .in('student_id', student_ids)
      .eq('students.teacher_id', teacher.id) as {
        data: StudentAccountWithJoin[] | null
        error: Error | null
      }

    if (accountsError) {
      return NextResponse.json(
        { success: false, error: '학생 계좌 조회 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    if (!studentAccounts || studentAccounts.length === 0) {
      return NextResponse.json(
        { success: false, error: '선택한 학생의 계좌를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 세금 징수 처리
    const transactions = []
    let totalTaxCollected = 0

    for (const account of studentAccounts) {
      let taxAmount = 0

      if (tax_type === 'percentage') {
        taxAmount = Math.floor(account.balance * (percentage_rate / 100))
      } else {
        taxAmount = fixed_amount
      }

      // 잔액 부족 확인
      if (taxAmount > account.balance) {
        continue // 잔액 부족한 학생은 건너뛰기
      }

      if (taxAmount <= 0) {
        continue // 세금이 0원 이하면 건너뛰기
      }

      // 학생 계좌에서 차감
      const { error: deductError } = await supabase
        .from('accounts')
        .update({
          balance: account.balance - taxAmount,
          updated_at: new Date().toISOString()
        })
        .eq('id', account.id)

      if (deductError) {
        console.error('학생 계좌 차감 오류:', deductError)
        continue
      }

      // Government 잔액에 추가
      const { error: addError } = await supabase
        .from('economic_entities')
        .update({
          balance: government.balance + taxAmount,
          updated_at: new Date().toISOString()
        })
        .eq('id', government.id)

      if (addError) {
        console.error('Government 잔액 추가 오류:', addError)
        // 롤백: 학생 계좌 복구
        await supabase
          .from('accounts')
          .update({ balance: account.balance })
          .eq('id', account.id)
        continue
      }

      // 거래 내역 기록
      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .insert({
          teacher_id: teacher.id,
          from_student_id: account.student_id,
          to_entity: 'Government',
          from_account_type: account_type,
          amount: taxAmount,
          transaction_type: 'tax',
          description: `세금 징수 (${tax_type === 'percentage' ? percentage_rate + '%' : '₩' + fixed_amount.toLocaleString()})`,
          status: 'completed',
          created_at: new Date().toISOString()
        })
        .select()

      if (txError) {
        console.error('❌ 거래 내역 기록 실패:', {
          error: txError,
          message: txError.message,
          details: txError.details,
          hint: txError.hint,
          code: txError.code,
          student_id: account.student_id,
          student_name: account.students.name,
          amount: taxAmount
        })
        // 에러 발생 시 롤백 (학생 계좌와 정부 잔액 복구)
        await supabase
          .from('accounts')
          .update({ balance: account.balance })
          .eq('id', account.id)
        await supabase
          .from('economic_entities')
          .update({ balance: government.balance })
          .eq('id', government.id)
        continue
      }

      console.log('✅ 거래 내역 기록 성공:', {
        student_name: account.students.name,
        amount: taxAmount,
        transaction_id: txData?.[0]?.id
      })

      transactions.push({
        student_name: account.students.name,
        amount: taxAmount
      })

      totalTaxCollected += taxAmount
      government.balance += taxAmount // 다음 학생 처리를 위해 업데이트
    }

    if (transactions.length === 0) {
      return NextResponse.json(
        { success: false, error: '세금을 징수할 수 있는 학생이 없습니다.' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `${transactions.length}명의 학생으로부터 총 ₩${totalTaxCollected.toLocaleString()}의 세금을 징수했습니다.`,
      transactions,
      total_collected: totalTaxCollected
    })

  } catch (error) {
    console.error('세금 징수 오류:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '세금 징수 중 오류가 발생했습니다.'
      },
      { status: 500 }
    )
  }
}
