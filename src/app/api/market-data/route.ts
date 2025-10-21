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

    // DB에 저장된 실제 데이터 사용 (랜덤 생성 제거)
    const assetsWithChanges = assets.map(asset => ({
      ...asset,
      // DB에 저장된 실제 change_percent 사용 (Yahoo/Finnhub에서 가져온 값)
      price_change_percent: asset.change_percent || 0,
      // previous_close는 DB에 저장된 값 사용
      previous_price: asset.previous_close || asset.current_price,
      // 가격 변화량 계산
      price_change: asset.previous_close
        ? asset.current_price - asset.previous_close
        : 0,
      // last_updated 필드를 올바르게 사용 (updated_at이 아닌 last_updated)
      last_updated: asset.last_updated || asset.created_at
    }))

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