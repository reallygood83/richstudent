import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

export async function GET() {
  try {
    // 모든 활성 시장 자산 조회
    const { data: assets, error } = await supabase
      .from('market_assets')
      .select('*')
      .eq('is_active', true)
      .order('symbol')

    if (error) {
      console.error('Market data fetch error:', error)
      return NextResponse.json({
        success: false,
        error: '시장 데이터를 조회할 수 없습니다.'
      }, { status: 500 })
    }

    // 가격 변화 계산 (이전 종가 대비)
    const assetsWithChanges = assets.map(asset => {
      // 임시로 가격 변화를 랜덤으로 생성 (실제로는 이전 종가 데이터 필요)
      const randomChange = (Math.random() - 0.5) * 0.1 // ±5% 범위
      const previousPrice = asset.current_price / (1 + randomChange)
      const priceChange = asset.current_price - previousPrice
      const priceChangePercent = (priceChange / previousPrice) * 100

      return {
        ...asset,
        previous_price: Math.round(previousPrice),
        price_change: Math.round(priceChange),
        price_change_percent: Number(priceChangePercent.toFixed(2)),
        last_updated: asset.updated_at || asset.created_at
      }
    })

    return NextResponse.json({
      success: true,
      assets: assetsWithChanges,
      total_count: assetsWithChanges.length,
      last_updated: new Date().toISOString()
    })

  } catch (error) {
    console.error('Market data API error:', error)
    return NextResponse.json({
      success: false,
      error: '서버 오류가 발생했습니다.'
    }, { status: 500 })
  }
}