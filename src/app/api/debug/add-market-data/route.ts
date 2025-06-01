import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// 서버사이드 Supabase 클라이언트 (RLS 우회)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 시장 자산 데이터 강제 추가 API
export async function POST() {
  try {
    console.log('Adding market assets to database...')

    // 기존 데이터 확인
    const { data: existingAssets } = await supabase
      .from('market_assets')
      .select('symbol')

    console.log('Existing assets:', existingAssets?.length || 0)

    // 시장 자산 데이터
    const marketAssets = [
      // 한국 주식
      { symbol: '005930', name: '삼성전자', asset_type: 'stock', category: 'technology', currency: 'KRW', min_quantity: 1 },
      { symbol: '000660', name: 'SK하이닉스', asset_type: 'stock', category: 'technology', currency: 'KRW', min_quantity: 1 },
      { symbol: '035420', name: 'NAVER', asset_type: 'stock', category: 'technology', currency: 'KRW', min_quantity: 1 },
      { symbol: '051910', name: 'LG화학', asset_type: 'stock', category: 'chemical', currency: 'KRW', min_quantity: 1 },
      { symbol: '006400', name: '삼성SDI', asset_type: 'stock', category: 'battery', currency: 'KRW', min_quantity: 1 },

      // 미국 주식
      { symbol: 'AAPL', name: 'Apple Inc.', asset_type: 'stock', category: 'technology', currency: 'USD', min_quantity: 1 },
      { symbol: 'GOOGL', name: 'Alphabet Inc.', asset_type: 'stock', category: 'technology', currency: 'USD', min_quantity: 1 },
      { symbol: 'MSFT', name: 'Microsoft Corp.', asset_type: 'stock', category: 'technology', currency: 'USD', min_quantity: 1 },
      { symbol: 'TSLA', name: 'Tesla Inc.', asset_type: 'stock', category: 'automotive', currency: 'USD', min_quantity: 1 },
      { symbol: 'NVDA', name: 'NVIDIA Corp.', asset_type: 'stock', category: 'technology', currency: 'USD', min_quantity: 1 },

      // 암호화폐
      { symbol: 'BTC-USD', name: '비트코인', asset_type: 'crypto', category: 'cryptocurrency', currency: 'USD', min_quantity: 0.0001 },
      { symbol: 'ETH-USD', name: '이더리움', asset_type: 'crypto', category: 'cryptocurrency', currency: 'USD', min_quantity: 0.001 },
      { symbol: 'BNB-USD', name: '바이낸스 코인', asset_type: 'crypto', category: 'cryptocurrency', currency: 'USD', min_quantity: 0.01 },

      // 원자재
      { symbol: 'GLD', name: '금 ETF', asset_type: 'commodity', category: 'precious_metals', currency: 'USD', min_quantity: 0.1 },
      { symbol: 'SLV', name: '은 ETF', asset_type: 'commodity', category: 'precious_metals', currency: 'USD', min_quantity: 1 },
      { symbol: 'USO', name: '석유 ETF', asset_type: 'commodity', category: 'energy', currency: 'USD', min_quantity: 1 }
    ]

    // 기존 데이터 삭제 (중복 방지)
    if (existingAssets && existingAssets.length > 0) {
      const { error: deleteError } = await supabase
        .from('market_assets')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000') // 모든 데이터 삭제

      if (deleteError) {
        console.warn('Failed to delete existing assets:', deleteError)
      } else {
        console.log('Deleted existing assets')
      }
    }

    // 새 데이터 삽입
    const assetsToInsert = marketAssets.map(asset => ({
      ...asset,
      current_price: 0,
      previous_price: 0,
      price_change: 0,
      price_change_percent: 0,
      is_active: true
    }))

    const { data: insertedAssets, error: insertError } = await supabase
      .from('market_assets')
      .insert(assetsToInsert)
      .select()

    if (insertError) {
      console.error('Insert error:', insertError)
      return NextResponse.json({
        success: false,
        error: '시장 자산 데이터 삽입 실패',
        details: insertError.message
      }, { status: 500 })
    }

    console.log('Successfully inserted', insertedAssets?.length || 0, 'assets')

    return NextResponse.json({
      success: true,
      message: '시장 자산 데이터 추가 완료',
      inserted_count: insertedAssets?.length || 0,
      assets: insertedAssets
    })

  } catch (error) {
    console.error('Market data insertion error:', error)
    return NextResponse.json({
      success: false,
      error: '시장 데이터 추가 중 오류 발생',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}