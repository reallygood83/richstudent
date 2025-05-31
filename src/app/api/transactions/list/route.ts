import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase/client'

// 거래 목록 조회 API
export async function GET(request: NextRequest) {
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

    // 거래 목록 조회 (최신 50개)
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select(`
        id,
        from_student_id,
        to_student_id,
        transaction_type,
        amount,
        description,
        status,
        created_at
      `)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Transactions fetch error:', error)
      return NextResponse.json(
        { success: false, error: '거래 목록 조회 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    // 학생 정보 매핑을 위해 학생 목록도 가져오기
    const { data: students } = await supabase
      .from('students')
      .select('id, name')

    const studentMap = new Map(students?.map(s => [s.id, s.name]) || [])

    // 거래 목록에 학생 이름 추가
    const enrichedTransactions = transactions?.map(transaction => ({
      ...transaction,
      from_student_name: transaction.from_student_id 
        ? studentMap.get(transaction.from_student_id) 
        : null,
      to_student_name: transaction.to_student_id 
        ? studentMap.get(transaction.to_student_id) 
        : null
    })) || []

    return NextResponse.json({
      success: true,
      transactions: enrichedTransactions
    })

  } catch (error) {
    console.error('Transactions list error:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}