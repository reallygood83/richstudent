import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const studentId = cookieStore.get('student_id')?.value
    const teacherId = cookieStore.get('teacher_id')?.value

    if (!studentId || !teacherId) {
      return NextResponse.json({
        success: false,
        error: '인증이 필요합니다.'
      }, { status: 401 })
    }

    // 현재 학생 정보 확인
    const { data: student } = await supabase
      .from('students')
      .select('id, teacher_id')
      .eq('id', studentId)
      .eq('teacher_id', teacherId)
      .single()

    if (!student) {
      return NextResponse.json({
        success: false,
        error: '유효하지 않은 학생 정보입니다.'
      }, { status: 401 })
    }

    const studentData = {
      student_id: student.id,
      teacher_id: student.teacher_id
    }

    // 포트폴리오 조회 (자산 정보 포함)
    const { data: portfolio, error: portfolioError } = await supabase
      .from('portfolio')
      .select(`
        id,
        quantity,
        average_price,
        total_invested,
        current_value,
        profit_loss,
        profit_loss_percent,
        created_at,
        updated_at,
        market_assets (
          id,
          symbol,
          name,
          current_price,
          currency,
          asset_type,
          category
        )
      `)
      .eq('student_id', studentData.student_id)
      .order('current_value', { ascending: false })

    if (portfolioError) {
      console.error('Portfolio fetch error:', portfolioError)
      return NextResponse.json({
        success: false,
        error: '포트폴리오 조회에 실패했습니다.'
      }, { status: 500 })
    }

    // 투자 계좌 잔액 조회
    const { data: investmentAccount } = await supabase
      .from('accounts')
      .select('balance')
      .eq('student_id', studentData.student_id)
      .eq('account_type', 'investment')
      .single()

    // 자산 거래 내역 조회 (최근 20개)
    const { data: transactions, error: transactionsError } = await supabase
      .from('asset_transactions')
      .select(`
        id,
        transaction_type,
        quantity,
        price,
        total_amount,
        fee,
        status,
        created_at,
        market_assets (
          symbol,
          name
        )
      `)
      .eq('student_id', studentData.student_id)
      .order('created_at', { ascending: false })
      .limit(20)

    if (transactionsError) {
      console.error('Transactions fetch error:', transactionsError)
    }

    // 먼저 실시간 계산을 위한 데이터 처리
    const portfolioWithCalculations = portfolio?.map(item => {
      const quantity = Number(item.quantity)
      const averagePrice = Number(item.average_price)
      const marketAsset = Array.isArray(item.market_assets) ? item.market_assets[0] : item.market_assets
      const currentPrice = Number(marketAsset?.current_price || 0)
      
      // 실제 현재 가치 계산 (수량 × 현재가)
      const realCurrentValue = quantity * currentPrice
      
      // 투자 원금 (수량 × 평균 매수가)
      const totalInvested = quantity * averagePrice
      
      // 손익 계산
      const profitLoss = realCurrentValue - totalInvested
      
      // 수익률 계산
      const profitLossPercent = totalInvested > 0 ? (profitLoss / totalInvested) * 100 : 0

      return {
        ...item,
        current_value: realCurrentValue,
        profit_loss: profitLoss,
        profit_loss_percent: profitLossPercent,
        total_invested: totalInvested,
        market_assets: marketAsset
      }
    }) || []

    // 포트폴리오 요약 계산 (실시간 계산된 값으로)
    const totalInvested = portfolioWithCalculations.reduce((sum, item) => sum + Number(item.total_invested), 0)
    const totalCurrentValue = portfolioWithCalculations.reduce((sum, item) => sum + Number(item.current_value), 0)
    const totalProfitLoss = totalCurrentValue - totalInvested
    const totalProfitLossPercent = totalInvested > 0 ? (totalProfitLoss / totalInvested) * 100 : 0
    const cashBalance = investmentAccount?.balance || 0
    const totalAssets = totalCurrentValue + cashBalance

    // 비중 계산 (전체 포트폴리오 대비)
    const portfolioWithWeight = portfolioWithCalculations.map(item => ({
      ...item,
      weight: totalCurrentValue > 0 ? (Number(item.current_value) / totalCurrentValue) * 100 : 0
    }))

    // 자산 카테고리별 분포 계산
    const categoryDistribution = portfolioWithWeight.reduce((acc, item) => {
      const marketAsset = Array.isArray(item.market_assets) ? item.market_assets[0] : item.market_assets
      const category = marketAsset?.category || '기타'
      const value = Number(item.current_value)
      
      if (!acc[category]) {
        acc[category] = {
          category: category,
          value: 0,
          count: 0,
          weight: 0
        }
      }
      
      acc[category].value += value
      acc[category].count += 1
      acc[category].weight = totalCurrentValue > 0 ? (acc[category].value / totalCurrentValue) * 100 : 0
      
      return acc
    }, {} as Record<string, {category: string; value: number; count: number; weight: number}>)

    const categoryArray = Object.values(categoryDistribution)

    return NextResponse.json({
      success: true,
      portfolio: {
        summary: {
          total_invested: totalInvested,
          current_value: totalCurrentValue,
          profit_loss: totalProfitLoss,
          profit_loss_percent: totalProfitLossPercent,
          cash_balance: cashBalance,
          total_assets: totalAssets
        },
        holdings: portfolioWithWeight,
        transactions: transactions || [],
        distribution: {
          by_category: categoryArray
        }
      }
    })

  } catch (error) {
    console.error('Portfolio API error:', error)
    return NextResponse.json({
      success: false,
      error: '서버 오류가 발생했습니다.'
    }, { status: 500 })
  }
}

// 포트폴리오 현재 가치 업데이트 API
export async function PUT() {
  try {
    const cookieStore = await cookies()
    const studentId = cookieStore.get('student_id')?.value
    const teacherId = cookieStore.get('teacher_id')?.value

    if (!studentId || !teacherId) {
      return NextResponse.json({
        success: false,
        error: '인증이 필요합니다.'
      }, { status: 401 })
    }

    // 포트폴리오 현재 가치 업데이트 함수 호출
    const { error } = await supabase
      .rpc('update_portfolio_current_values')

    if (error) {
      console.error('Portfolio update error:', error)
      return NextResponse.json({
        success: false,
        error: '포트폴리오 업데이트에 실패했습니다.'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: '포트폴리오가 성공적으로 업데이트되었습니다.'
    })

  } catch (error) {
    console.error('Portfolio update API error:', error)
    return NextResponse.json({
      success: false,
      error: '서버 오류가 발생했습니다.'
    }, { status: 500 })
  }
}