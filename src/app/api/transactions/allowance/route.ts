import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase/client'

// 수당 지급 API
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
      selected_students,
      amount,
      account_type = 'checking',
      description = '',
      use_weekly_allowance = true
    } = await request.json()

    // 입력 검증
    if (!selected_students || selected_students.length === 0) {
      return NextResponse.json(
        { success: false, error: '최소 한 명의 학생을 선택해야 합니다.' },
        { status: 400 }
      )
    }

    if (!use_weekly_allowance && (!amount || amount <= 0)) {
      return NextResponse.json(
        { success: false, error: '올바른 수당 금액을 입력해주세요.' },
        { status: 400 }
      )
    }

    // 선택된 학생들의 정보 조회
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('id, name, weekly_allowance')
      .in('id', selected_students)

    if (studentsError || !students) {
      return NextResponse.json(
        { success: false, error: '학생 정보를 찾을 수 없습니다.' },
        { status: 400 }
      )
    }

    const allowancePromises = students.map(async (student) => {
      const allowanceAmount = use_weekly_allowance ? student.weekly_allowance : parseFloat(amount)

      // 먼저 현재 잔액 조회
      const { data: account, error: fetchError } = await supabase
        .from('accounts')
        .select('balance')
        .eq('student_id', student.id)
        .eq('account_type', account_type)
        .single()

      if (fetchError || !account) {
        throw new Error(`${student.name} 계좌 조회 실패: ${fetchError?.message}`)
      }

      // 계좌 잔액 업데이트
      const { error: updateError } = await supabase
        .from('accounts')
        .update({ 
          balance: account.balance + allowanceAmount,
          updated_at: new Date().toISOString()
        })
        .eq('student_id', student.id)
        .eq('account_type', account_type)

      if (updateError) {
        throw new Error(`${student.name} 계좌 업데이트 실패: ${updateError.message}`)
      }

      // 거래 기록 저장
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          from_entity: 'teacher',
          to_student_id: student.id,
          transaction_type: 'allowance',
          amount: allowanceAmount,
          to_account_type: account_type,
          description: description || `수당 지급 - ${student.name}`,
          status: 'completed'
        })

      if (transactionError) {
        console.error(`Transaction record error for ${student.name}:`, transactionError)
      }

      return {
        student_id: student.id,
        student_name: student.name,
        amount: allowanceAmount
      }
    })

    try {
      const results = await Promise.all(allowancePromises)
      
      const totalAmount = results.reduce((sum, result) => sum + result.amount, 0)

      return NextResponse.json({
        success: true,
        message: '수당 지급이 완료되었습니다.',
        summary: {
          student_count: results.length,
          total_amount: totalAmount,
          recipients: results
        }
      })

    } catch (error) {
      return NextResponse.json(
        { success: false, error: error instanceof Error ? error.message : '수당 지급 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Allowance distribution error:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}