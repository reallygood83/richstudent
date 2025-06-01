import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import { cookies } from 'next/headers'

export async function PUT(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get('teacher_session')?.value

    if (!sessionToken) {
      return NextResponse.json({
        success: false,
        error: '인증이 필요합니다.'
      }, { status: 401 })
    }

    // 교사 세션 확인
    const { data: teacher } = await supabase
      .from('teachers')
      .select('id')
      .eq('session_token', sessionToken)
      .single()

    if (!teacher) {
      return NextResponse.json({
        success: false,
        error: '유효하지 않은 세션입니다.'
      }, { status: 401 })
    }

    const body = await request.json()
    const { 
      student_id, 
      name, 
      weekly_allowance, 
      credit_score, 
      accounts 
    } = body

    // 입력 데이터 검증
    if (!student_id || !name) {
      return NextResponse.json({
        success: false,
        error: '학생 ID와 이름은 필수입니다.'
      }, { status: 400 })
    }

    // 신용점수 범위 검증
    if (credit_score && (credit_score < 350 || credit_score > 850)) {
      return NextResponse.json({
        success: false,
        error: '신용점수는 350-850 범위여야 합니다.'
      }, { status: 400 })
    }

    // 계좌 잔액 검증
    if (accounts) {
      const { checking = 0, savings = 0, investment = 0 } = accounts
      if (checking < 0 || savings < 0 || investment < 0) {
        return NextResponse.json({
          success: false,
          error: '계좌 잔액은 음수일 수 없습니다.'
        }, { status: 400 })
      }
    }

    // 학생이 해당 교사 소속인지 확인
    const { data: student } = await supabase
      .from('students')
      .select('id')
      .eq('id', student_id)
      .eq('teacher_id', teacher.id)
      .single()

    if (!student) {
      return NextResponse.json({
        success: false,
        error: '해당 학생을 찾을 수 없습니다.'
      }, { status: 404 })
    }

    // 학생 기본 정보 업데이트
    const updateData: {
      name: string
      weekly_allowance: number
      updated_at: string
      credit_score?: number
    } = {
      name,
      weekly_allowance,
      updated_at: new Date().toISOString()
    }

    if (credit_score !== undefined) {
      updateData.credit_score = credit_score
    }

    const { error: studentError } = await supabase
      .from('students')
      .update(updateData)
      .eq('id', student_id)

    if (studentError) {
      console.error('Student update error:', studentError)
      return NextResponse.json({
        success: false,
        error: '학생 정보 업데이트에 실패했습니다.'
      }, { status: 500 })
    }

    // 계좌 잔액 업데이트 (제공된 경우)
    if (accounts) {
      const { checking, savings, investment } = accounts

      // 각 계좌별로 업데이트
      const accountUpdates = [
        { account_type: 'checking', balance: checking },
        { account_type: 'savings', balance: savings },
        { account_type: 'investment', balance: investment }
      ]

      for (const account of accountUpdates) {
        const { error: accountError } = await supabase
          .from('accounts')
          .update({ 
            balance: account.balance,
            updated_at: new Date().toISOString()
          })
          .eq('student_id', student_id)
          .eq('account_type', account.account_type)

        if (accountError) {
          console.error(`Account update error for ${account.account_type}:`, accountError)
          return NextResponse.json({
            success: false,
            error: `${account.account_type} 계좌 업데이트에 실패했습니다.`
          }, { status: 500 })
        }
      }

      // 거래 내역 기록 (계좌 수정 로그)
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          from_student_id: student_id,
          to_student_id: student_id,
          amount: checking + savings + investment,
          transaction_type: 'account_adjustment',
          description: `교사에 의한 계좌 잔액 수정`,
          status: 'completed'
        })

      if (transactionError) {
        console.warn('Transaction log error:', transactionError)
        // 거래 로그 실패는 전체 작업을 실패시키지 않음
      }
    }

    return NextResponse.json({
      success: true,
      message: '학생 정보가 성공적으로 업데이트되었습니다.'
    })

  } catch (error) {
    console.error('Student update error:', error)
    return NextResponse.json({
      success: false,
      error: '서버 오류가 발생했습니다.'
    }, { status: 500 })
  }
}