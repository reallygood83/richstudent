import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get('student_session_token')?.value

    if (!sessionToken) {
      return NextResponse.json({
        success: false,
        error: '인증이 필요합니다.'
      }, { status: 401 })
    }

    // 세션 토큰으로 실제 학생 정보 조회
    const { data: sessionData, error: sessionError } = await supabase
      .from('student_sessions')
      .select('student_id, expires_at')
      .eq('session_token', sessionToken)
      .single()

    if (sessionError || !sessionData) {
      return NextResponse.json({
        success: false,
        error: '유효하지 않은 세션입니다.'
      }, { status: 401 })
    }

    // 세션 만료 확인
    const now = new Date()
    const expiresAt = new Date(sessionData.expires_at)
    if (now > expiresAt) {
      // 만료된 세션 삭제
      await supabase
        .from('student_sessions')
        .delete()
        .eq('session_token', sessionToken)
      
      return NextResponse.json({
        success: false,
        error: '세션이 만료되었습니다. 다시 로그인해주세요.'
      }, { status: 401 })
    }

    // 학생 정보 조회
    const { data: student } = await supabase
      .from('students')
      .select('id, teacher_id')
      .eq('id', sessionData.student_id)
      .single()

    if (!student) {
      return NextResponse.json({
        success: false,
        error: '학생 정보를 찾을 수 없습니다.'
      }, { status: 404 })
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

    // 포트폴리오 요약 계산
    const totalInvested = portfolio?.reduce((sum, item) => sum + Number(item.total_invested), 0) || 0
    const totalCurrentValue = portfolio?.reduce((sum, item) => sum + Number(item.current_value), 0) || 0
    const totalProfitLoss = totalCurrentValue - totalInvested
    const totalProfitLossPercent = totalInvested > 0 ? (totalProfitLoss / totalInvested) * 100 : 0
    const cashBalance = investmentAccount?.balance || 0
    const totalAssets = totalCurrentValue + cashBalance

    // 자산별 비중 계산
    const portfolioWithWeight = portfolio?.map(item => ({
      ...item,
      weight: totalCurrentValue > 0 ? (Number(item.current_value) / totalCurrentValue) * 100 : 0
    })) || []

    // 자산 카테고리별 분포는 나중에 구현

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
          by_category: []
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
    const sessionToken = cookieStore.get('student_session_token')?.value

    if (!sessionToken) {
      return NextResponse.json({
        success: false,
        error: '인증이 필요합니다.'
      }, { status: 401 })
    }

    // 세션 토큰으로 실제 학생 정보 조회
    const { data: sessionData, error: sessionError } = await supabase
      .from('student_sessions')
      .select(`
        student_id,
        expires_at,
        students (
          id,
          teacher_id
        )
      `)
      .eq('session_token', sessionToken)
      .single()

    if (sessionError || !sessionData) {
      return NextResponse.json({
        success: false,
        error: '유효하지 않은 세션입니다.'
      }, { status: 401 })
    }

    // 세션 만료 확인
    const now = new Date()
    const expiresAt = new Date(sessionData.expires_at)
    if (now > expiresAt) {
      // 만료된 세션 삭제
      await supabase
        .from('student_sessions')
        .delete()
        .eq('session_token', sessionToken)
      
      return NextResponse.json({
        success: false,
        error: '세션이 만료되었습니다. 다시 로그인해주세요.'
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