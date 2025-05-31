import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

// 학생 거래 내역 조회 API
export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('student_session_token')?.value
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('student_id')

    if (!sessionToken) {
      return NextResponse.json(
        { success: false, error: '인증이 필요합니다.' },
        { status: 401 }
      )
    }

    if (!studentId) {
      return NextResponse.json(
        { success: false, error: '학생 ID가 필요합니다.' },
        { status: 400 }
      )
    }

    // 해당 학생과 관련된 거래 내역 조회 (보낸 것 + 받은 것)
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select(`
        id,
        from_student_id,
        to_student_id,
        from_entity,
        transaction_type,
        amount,
        description,
        status,
        created_at,
        from_account_type,
        to_account_type
      `)
      .or(`from_student_id.eq.${studentId},to_student_id.eq.${studentId}`)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Transactions fetch error:', error)
      return NextResponse.json(
        { success: false, error: '거래 내역 조회 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    // 거래에 관련된 모든 학생 정보 조회
    const studentIds = new Set<string>()
    transactions?.forEach(transaction => {
      if (transaction.from_student_id) studentIds.add(transaction.from_student_id)
      if (transaction.to_student_id) studentIds.add(transaction.to_student_id)
    })

    const { data: students } = await supabase
      .from('students')
      .select('id, name')
      .in('id', Array.from(studentIds))

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
    console.error('Student transactions error:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}