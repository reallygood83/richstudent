import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

// 포트폴리오 데이터 수동 복구 API
export async function POST() {
  try {
    console.log('Starting portfolio data recovery...')

    // 1. 거래 내역은 있지만 포트폴리오에 누락된 데이터 찾기
    const { error: queryError } = await supabase
      .rpc('get_missing_portfolios', {})
      .select()

    if (queryError) {
      console.log('RPC function not available, using alternative query...')
      
      // RPC 함수가 없으면 직접 쿼리
      const { data: transactions, error: txError } = await supabase
        .from('asset_transactions')
        .select(`
          student_id,
          asset_id,
          transaction_type,
          quantity,
          price,
          total_amount,
          market_assets (
            current_price
          )
        `)

      if (txError) {
        throw new Error(`Transaction query error: ${txError.message}`)
      }

      // JavaScript에서 그룹핑 및 계산
      const portfolioMap = new Map()

      transactions.forEach(tx => {
        const key = `${tx.student_id}_${tx.asset_id}`
        
        if (!portfolioMap.has(key)) {
          portfolioMap.set(key, {
            student_id: tx.student_id,
            asset_id: tx.asset_id,
            buy_quantity: 0,
            sell_quantity: 0,
            total_invested: 0,
            total_sold: 0,
            current_price: (tx.market_assets as any)?.current_price || 0
          })
        }

        const item = portfolioMap.get(key)
        
        if (tx.transaction_type === 'buy') {
          item.buy_quantity += tx.quantity
          item.total_invested += tx.total_amount
        } else if (tx.transaction_type === 'sell') {
          item.sell_quantity += tx.quantity
          item.total_sold += tx.total_amount
        }
      })

      // 포트폴리오에 있는 항목들 제외
      const { data: existingPortfolios } = await supabase
        .from('portfolio')
        .select('student_id, asset_id')

      const existingKeys = new Set(
        existingPortfolios?.map(p => `${p.student_id}_${p.asset_id}`) || []
      )

      // 누락된 포트폴리오만 필터링
      const toCreate = Array.from(portfolioMap.values())
        .filter(item => {
          const key = `${item.student_id}_${item.asset_id}`
          const netQuantity = item.buy_quantity - item.sell_quantity
          return !existingKeys.has(key) && netQuantity > 0
        })

      console.log(`Found ${toCreate.length} missing portfolio entries`)

      if (toCreate.length === 0) {
        return NextResponse.json({
          success: true,
          message: 'No missing portfolio entries found',
          recovered: 0
        })
      }

      // 누락된 포트폴리오 생성
      const portfoliosToInsert = toCreate.map(item => {
        const netQuantity = item.buy_quantity - item.sell_quantity
        const netInvested = item.total_invested - item.total_sold
        const averagePrice = item.buy_quantity > 0 ? item.total_invested / item.buy_quantity : 0
        const currentValue = netQuantity * item.current_price
        const profitLoss = currentValue - netInvested
        const profitLossPercent = netInvested > 0 ? (profitLoss / netInvested) * 100 : 0

        return {
          student_id: item.student_id,
          asset_id: item.asset_id,
          quantity: netQuantity,
          average_price: averagePrice,
          total_invested: netInvested,
          current_value: currentValue,
          profit_loss: profitLoss,
          profit_loss_percent: profitLossPercent
        }
      })

      console.log('Inserting portfolio data:', portfoliosToInsert)

      const { error: insertError } = await supabase
        .from('portfolio')
        .insert(portfoliosToInsert)

      if (insertError) {
        throw new Error(`Portfolio insert error: ${insertError.message}`)
      }

      return NextResponse.json({
        success: true,
        message: `Successfully recovered ${portfoliosToInsert.length} portfolio entries`,
        recovered: portfoliosToInsert.length,
        data: portfoliosToInsert
      })
    }

    return NextResponse.json({
      success: false,
      error: 'RPC function method not implemented yet'
    })

  } catch (error) {
    console.error('Portfolio recovery error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}