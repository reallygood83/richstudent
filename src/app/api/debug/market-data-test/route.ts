import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

// 시장 데이터 확인용 디버그 API
export async function GET() {
  try {
    // 모든 시장 자산 조회
    const { data: marketAssets, error: marketError } = await supabase
      .from('market_assets')
      .select('*')
      .order('created_at', { ascending: false })

    // 포트폴리오에서 사용되는 심볼들 조회
    const { data: portfolioSymbols, error: portfolioError } = await supabase
      .from('portfolio')
      .select('asset_symbol, quantity, student_id')
      .limit(20)

    // 교사별 시장 자산 개수 확인
    const { data: teacherAssets, error: teacherError } = await supabase
      .from('market_assets')
      .select('teacher_id, symbol, name, current_price')
      .order('teacher_id')

    return NextResponse.json({
      success: true,
      debug_info: {
        total_market_assets: marketAssets?.length || 0,
        total_portfolio_entries: portfolioSymbols?.length || 0,
        market_assets: marketAssets || [],
        portfolio_symbols: portfolioSymbols || [],
        teacher_assets: teacherAssets || [],
        price_analysis: {
          zero_price_assets: marketAssets?.filter(asset => Number(asset.current_price) === 0).length || 0,
          non_zero_price_assets: marketAssets?.filter(asset => Number(asset.current_price) > 0).length || 0,
          max_price: Math.max(...(marketAssets?.map(asset => Number(asset.current_price)) || [0])),
          min_price: Math.min(...(marketAssets?.filter(asset => Number(asset.current_price) > 0).map(asset => Number(asset.current_price)) || [0]))
        },
        errors: {
          market_error: marketError,
          portfolio_error: portfolioError,
          teacher_error: teacherError
        }
      }
    })

  } catch (error) {
    console.error('Market data debug API error:', error)
    return NextResponse.json({
      success: false,
      error: '시장 데이터 디버그 API 오류가 발생했습니다.',
      details: error
    }, { status: 500 })
  }
}