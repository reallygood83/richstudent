import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

export async function GET() {
  try {
    // 시장 자산 데이터 조회
    const { data: assets, error } = await supabase
      .from('market_assets')
      .select('*')
      .order('symbol')

    if (error) {
      console.error('Market assets fetch error:', error)
      return NextResponse.json({
        success: false,
        error: '시장 데이터를 불러올 수 없습니다.'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      assets: assets || []
    })

  } catch (error) {
    console.error('Market data API error:', error)
    return NextResponse.json({
      success: false,
      error: '서버 오류가 발생했습니다.'
    }, { status: 500 })
  }
}