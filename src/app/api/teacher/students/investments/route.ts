import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import { cookies } from 'next/headers'

// 교사용 학생 투자 현황 조회 API
export async function GET(request: NextRequest) {
  try {
    console.log('Investment monitoring API called')
    
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get('session_token')?.value
    console.log('Session token:', sessionToken ? 'Present' : 'Missing')

    if (!sessionToken) {
      console.log('No session token found')
      return NextResponse.json({
        success: false,
        error: '인증이 필요합니다.'
      }, { status: 401 })
    }

    // 교사 세션 검증
    console.log('Validating teacher session...')
    const { data: teacher, error: sessionError } = await supabase
      .from('teacher_sessions')
      .select('teacher_id')
      .eq('session_token', sessionToken)
      .single()

    console.log('Session validation result:', { teacher, sessionError })

    if (sessionError || !teacher) {
      console.log('Session validation failed:', sessionError)
      return NextResponse.json({
        success: false,
        error: '유효하지 않은 세션입니다.'
      }, { status: 401 })
    }

    // 해당 교사의 모든 학생 조회
    console.log('Fetching students for teacher:', teacher.teacher_id)
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select(`
        id,
        name,
        student_code,
        credit_score,
        accounts!inner(account_type, balance)
      `)
      .eq('teacher_id', teacher.teacher_id)
      .order('name')

    console.log('Students query result:', { students, studentsError })

    if (studentsError) {
      console.error('Students fetch error:', studentsError)
      return NextResponse.json({
        success: false,
        error: '학생 정보를 불러올 수 없습니다.'
      }, { status: 500 })
    }

    console.log(`Found ${students?.length || 0} students`)

    // 각 학생의 포트폴리오 및 거래 내역 조회
    const studentsWithInvestments = await Promise.all(
      students.map(async (student) => {
        // 포트폴리오 조회
        const { data: portfolio } = await supabase
          .from('portfolio')
          .select(`
            quantity,
            average_price,
            total_invested,
            current_value,
            profit_loss,
            profit_loss_percent,
            market_assets (
              id,
              symbol,
              name,
              current_price,
              asset_type,
              category
            )
          `)
          .eq('student_id', student.id)

        // 최근 거래 내역 조회 (최근 10개)
        const { data: transactions } = await supabase
          .from('asset_transactions')
          .select(`
            transaction_type,
            quantity,
            price,
            total_amount,
            fee,
            created_at,
            market_assets (
              symbol,
              name
            )
          `)
          .eq('student_id', student.id)
          .order('created_at', { ascending: false })
          .limit(10)

        // 계좌별 잔액 정리
        const accounts = student.accounts.reduce((acc: any, account: any) => {
          acc[account.account_type] = account.balance
          return acc
        }, {})

        // 포트폴리오 총 가치 계산
        const totalPortfolioValue = portfolio?.reduce((sum, holding) => {
          return sum + (holding.current_value || 0)
        }, 0) || 0

        const totalInvested = portfolio?.reduce((sum, holding) => {
          return sum + (holding.total_invested || 0)
        }, 0) || 0

        const totalProfitLoss = totalPortfolioValue - totalInvested
        const totalProfitLossPercent = totalInvested > 0 ? (totalProfitLoss / totalInvested) * 100 : 0

        return {
          ...student,
          accounts,
          portfolio: {
            holdings: portfolio || [],
            total_value: totalPortfolioValue,
            total_invested: totalInvested,
            total_profit_loss: totalProfitLoss,
            total_profit_loss_percent: totalProfitLossPercent,
            holdings_count: portfolio?.length || 0
          },
          recent_transactions: transactions || [],
          total_assets: (accounts.checking || 0) + (accounts.savings || 0) + (accounts.investment || 0) + totalPortfolioValue
        }
      })
    )

    // 전체 클래스 통계 계산
    const classStats = {
      total_students: studentsWithInvestments.length,
      total_portfolio_value: studentsWithInvestments.reduce((sum, s) => sum + s.portfolio.total_value, 0),
      total_invested: studentsWithInvestments.reduce((sum, s) => sum + s.portfolio.total_invested, 0),
      total_cash: studentsWithInvestments.reduce((sum, s) => sum + (s.accounts.investment || 0), 0),
      total_assets: studentsWithInvestments.reduce((sum, s) => sum + s.total_assets, 0),
      average_credit_score: studentsWithInvestments.reduce((sum, s) => sum + (s.credit_score || 700), 0) / studentsWithInvestments.length,
      active_investors: studentsWithInvestments.filter(s => s.portfolio.holdings_count > 0).length
    }

    const classProfit = classStats.total_portfolio_value - classStats.total_invested
    const classProfitPercent = classStats.total_invested > 0 ? (classProfit / classStats.total_invested) * 100 : 0

    return NextResponse.json({
      success: true,
      data: {
        students: studentsWithInvestments,
        class_stats: {
          ...classStats,
          total_profit_loss: classProfit,
          total_profit_loss_percent: classProfitPercent
        }
      }
    })

  } catch (error) {
    console.error('Teacher investment monitoring error:', error)
    return NextResponse.json({
      success: false,
      error: '서버 오류가 발생했습니다.'
    }, { status: 500 })
  }
}