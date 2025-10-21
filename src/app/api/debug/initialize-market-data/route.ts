import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

export async function POST() {
  try {
    console.log('🚀 Initializing market data...')

    // 기존 데이터 확인
    const { data: existingData, error: checkError } = await supabase
      .from('market_assets')
      .select('id')
      .limit(1)

    if (checkError) {
      return NextResponse.json({
        success: false,
        error: `Database error: ${checkError.message}`
      }, { status: 500 })
    }

    if (existingData && existingData.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Market data already exists. Use DELETE method to reset first.'
      }, { status: 400 })
    }

    // 초기 시장 자산 데이터
    const initialAssets = [
      // 한국 주식
      { symbol: '005930', name: '삼성전자', asset_type: 'stock', category: 'technology', currency: 'KRW', min_quantity: 1, current_price: 0, is_active: true },
      { symbol: '000660', name: 'SK하이닉스', asset_type: 'stock', category: 'technology', currency: 'KRW', min_quantity: 1, current_price: 0, is_active: true },
      { symbol: '035420', name: 'NAVER', asset_type: 'stock', category: 'technology', currency: 'KRW', min_quantity: 1, current_price: 0, is_active: true },
      { symbol: '051910', name: 'LG화학', asset_type: 'stock', category: 'chemical', currency: 'KRW', min_quantity: 1, current_price: 0, is_active: true },
      { symbol: '006400', name: '삼성SDI', asset_type: 'stock', category: 'battery', currency: 'KRW', min_quantity: 1, current_price: 0, is_active: true },
      { symbol: '005380', name: '현대자동차', asset_type: 'stock', category: 'automotive', currency: 'KRW', min_quantity: 1, current_price: 0, is_active: true },
      { symbol: '035720', name: '카카오', asset_type: 'stock', category: 'technology', currency: 'KRW', min_quantity: 1, current_price: 0, is_active: true },
      { symbol: '000270', name: '기아', asset_type: 'stock', category: 'automotive', currency: 'KRW', min_quantity: 1, current_price: 0, is_active: true },

      // 미국 주식
      { symbol: 'AAPL', name: 'Apple Inc.', asset_type: 'stock', category: 'technology', currency: 'USD', min_quantity: 1, current_price: 0, is_active: true },
      { symbol: 'GOOGL', name: 'Alphabet Inc.', asset_type: 'stock', category: 'technology', currency: 'USD', min_quantity: 1, current_price: 0, is_active: true },
      { symbol: 'MSFT', name: 'Microsoft Corp.', asset_type: 'stock', category: 'technology', currency: 'USD', min_quantity: 1, current_price: 0, is_active: true },
      { symbol: 'TSLA', name: 'Tesla Inc.', asset_type: 'stock', category: 'automotive', currency: 'USD', min_quantity: 1, current_price: 0, is_active: true },
      { symbol: 'NVDA', name: 'NVIDIA Corp.', asset_type: 'stock', category: 'technology', currency: 'USD', min_quantity: 1, current_price: 0, is_active: true },
      { symbol: 'AMZN', name: 'Amazon.com Inc.', asset_type: 'stock', category: 'technology', currency: 'USD', min_quantity: 1, current_price: 0, is_active: true },
      { symbol: 'META', name: 'Meta Platforms Inc.', asset_type: 'stock', category: 'technology', currency: 'USD', min_quantity: 1, current_price: 0, is_active: true },

      // 암호화폐
      { symbol: 'BTC-USD', name: '비트코인', asset_type: 'crypto', category: 'cryptocurrency', currency: 'USD', min_quantity: 0.0001, current_price: 0, is_active: true },
      { symbol: 'ETH-USD', name: '이더리움', asset_type: 'crypto', category: 'cryptocurrency', currency: 'USD', min_quantity: 0.001, current_price: 0, is_active: true },
      { symbol: 'BNB-USD', name: '바이낸스 코인', asset_type: 'crypto', category: 'cryptocurrency', currency: 'USD', min_quantity: 0.01, current_price: 0, is_active: true },

      // 원자재 ETF
      { symbol: 'GLD', name: '금 ETF', asset_type: 'commodity', category: 'etf', currency: 'USD', min_quantity: 0.1, current_price: 0, is_active: true },
      { symbol: 'SLV', name: '은 ETF', asset_type: 'commodity', category: 'etf', currency: 'USD', min_quantity: 1, current_price: 0, is_active: true },
      { symbol: 'USO', name: '석유 ETF', asset_type: 'commodity', category: 'etf', currency: 'USD', min_quantity: 1, current_price: 0, is_active: true },

      // 환율
      { symbol: 'USDKRW=X', name: '미국 달러', asset_type: 'currency', category: 'exchange_rate', currency: 'KRW', min_quantity: 1, current_price: 0, is_active: true },
      { symbol: 'EURKRW=X', name: '유로', asset_type: 'currency', category: 'exchange_rate', currency: 'KRW', min_quantity: 1, current_price: 0, is_active: true },
      { symbol: 'JPYKRW=X', name: '일본 엔 (100엔)', asset_type: 'currency', category: 'exchange_rate', currency: 'KRW', min_quantity: 100, current_price: 0, is_active: true },
      { symbol: 'CNYKRW=X', name: '중국 위안', asset_type: 'currency', category: 'exchange_rate', currency: 'KRW', min_quantity: 1, current_price: 0, is_active: true },
    ]

    // 데이터 삽입
    const { data: inserted, error: insertError } = await supabase
      .from('market_assets')
      .insert(initialAssets)
      .select()

    if (insertError) {
      return NextResponse.json({
        success: false,
        error: `Insert error: ${insertError.message}`,
        details: insertError
      }, { status: 500 })
    }

    console.log(`✅ ${inserted.length}개 시장 자산 초기화 완료`)

    return NextResponse.json({
      success: true,
      message: `${inserted.length}개 시장 자산이 성공적으로 생성되었습니다.`,
      data: {
        count: inserted.length,
        assets: inserted
      }
    })

  } catch (error) {
    console.error('Market data initialization error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// 데이터 삭제 (재초기화용)
export async function DELETE() {
  try {
    const { error } = await supabase
      .from('market_assets')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // 모든 레코드 삭제

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: '모든 시장 데이터가 삭제되었습니다.'
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
