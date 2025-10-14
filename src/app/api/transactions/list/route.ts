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

    // URL 파라미터에서 학생 ID 필터 가져오기
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('student_id')

    // Limit 파라미터 검증 (보안 및 성능 최적화)
    const limitParam = searchParams.get('limit')
    let limit = 100 // 기본값

    if (limitParam) {
      const parsedLimit = parseInt(limitParam, 10)
      // NaN, 음수, 0 체크 및 최대값 제한
      if (!isNaN(parsedLimit) && parsedLimit > 0 && parsedLimit <= 500) {
        limit = parsedLimit
      } else if (parsedLimit > 500) {
        limit = 500 // 최대 500개로 제한
      }
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('=== Transaction List Request ===')
      console.log('Student ID filter:', studentId)
      console.log('Limit:', limit)
    }

    // 기본 쿼리 빌더
    let query = supabase
      .from('transactions')
      .select(`
        id,
        from_student_id,
        to_student_id,
        transaction_type,
        amount,
        from_account_type,
        to_account_type,
        description,
        status,
        created_at
      `)
      .eq('teacher_id', teacher.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    // 학생 ID 필터링 적용 (해당 학생이 송금자 또는 수신자인 거래)
    if (studentId && studentId !== 'all') {
      // UUID 형식 검증 (SQL injection 방어)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(studentId)) {
        return NextResponse.json(
          { success: false, error: '유효하지 않은 학생 ID 형식입니다.' },
          { status: 400 }
        )
      }
      // Supabase의 파라미터화된 쿼리는 SQL injection에 안전하지만,
      // 명시적 검증으로 추가 보안 계층 제공
      query = query.or(`from_student_id.eq.${studentId},to_student_id.eq.${studentId}`)
    }

    const { data: transactions, error } = await query

    if (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Transactions fetch error:', error)
      }
      return NextResponse.json(
        { success: false, error: '거래 목록 조회 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ Fetched ${transactions?.length || 0} transactions`)
    }

    // 학생 정보 매핑을 위해 학생 목록도 가져오기
    const { data: students } = await supabase
      .from('students')
      .select('id, name, student_code')
      .eq('teacher_id', teacher.id)

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

    // 학생별 통계 계산 (특정 학생 필터링 시에만)
    let statistics = null
    if (studentId && enrichedTransactions.length > 0) {
      const sentTransactions = enrichedTransactions.filter(t => t.from_student_id === studentId)
      const receivedTransactions = enrichedTransactions.filter(t => t.to_student_id === studentId)

      const totalSent = sentTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0)
      const totalReceived = receivedTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0)

      // 거래 유형별 분류
      const typeStats = {
        transfer: 0,
        multi_transfer: 0,
        allowance: 0,
        tax: 0,
        loan: 0,
        real_estate_purchase: 0,
        real_estate_sale: 0,
        investment_buy: 0,
        investment_sell: 0,
        other: 0
      }

      enrichedTransactions.forEach(t => {
        if (typeStats.hasOwnProperty(t.transaction_type)) {
          typeStats[t.transaction_type as keyof typeof typeStats]++
        } else {
          typeStats.other++
        }
      })

      statistics = {
        total_transactions: enrichedTransactions.length,
        total_sent: totalSent,
        total_received: totalReceived,
        net_change: totalReceived - totalSent,
        sent_count: sentTransactions.length,
        received_count: receivedTransactions.length,
        type_breakdown: typeStats,
        student_name: studentMap.get(studentId) || 'Unknown'
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('📊 Student statistics calculated:', statistics)
      }
    }

    return NextResponse.json({
      success: true,
      transactions: enrichedTransactions,
      statistics,
      filter: studentId ? { student_id: studentId } : null
    })

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Transactions list error:', error)
    }
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
