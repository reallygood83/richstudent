import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import { fetchMultipleAssetPrices, getExchangeRate, formatKoreanStock } from '@/lib/market-data'

// 시장 데이터 업데이트 API
export async function POST() {
  try {
    console.log('Starting market data update...')

    // 활성화된 모든 자산 조회
    const { data: assets, error: assetsError } = await supabase
      .from('market_assets')
      .select('id, symbol, currency, current_price')
      .eq('is_active', true)

    if (assetsError) {
      console.error('Failed to fetch assets:', assetsError)
      return NextResponse.json({
        success: false,
        error: '자산 목록 조회 실패',
        details: assetsError.message
      }, { status: 500 })
    }

    if (!assets || assets.length === 0) {
      return NextResponse.json({
        success: true,
        message: '업데이트할 자산이 없습니다.'
      })
    }

    // 환율 정보 조회
    const exchangeRate = await getExchangeRate()
    console.log('Current USD/KRW rate:', exchangeRate)

    // 심볼 목록 준비 (한국 주식은 .KS 접미사 추가)
    const symbols = assets.map(asset => formatKoreanStock(asset.symbol))
    console.log('Fetching prices for symbols:', symbols)

    // Yahoo Finance에서 가격 데이터 조회
    const marketData = await fetchMultipleAssetPrices(symbols)
    console.log('Fetched market data:', marketData.length, 'items')

    // 데이터베이스 업데이트
    const updatePromises = assets.map(async (asset) => {
      const formattedSymbol = formatKoreanStock(asset.symbol)
      const priceData = marketData.find(data => data.symbol === formattedSymbol)

      if (!priceData) {
        console.warn(`No price data found for ${asset.symbol}`)
        return { asset_id: asset.id, status: 'no_data' }
      }

      // USD 자산인 경우 원화로 환산
      let finalPrice = priceData.price
      if (asset.currency === 'USD' || priceData.currency === 'USD') {
        finalPrice = priceData.price * exchangeRate
      }

      // 이전 가격 대비 변화 계산
      const previousPrice = asset.current_price || finalPrice
      const priceChange = finalPrice - previousPrice
      const priceChangePercent = previousPrice > 0 ? (priceChange / previousPrice) * 100 : 0

      try {
        // 자산 가격 업데이트
        const { error: updateError } = await supabase
          .from('market_assets')
          .update({
            previous_price: previousPrice,
            current_price: finalPrice,
            price_change: priceChange,
            price_change_percent: priceChangePercent,
            last_updated: new Date().toISOString()
          })
          .eq('id', asset.id)

        if (updateError) {
          console.error(`Failed to update ${asset.symbol}:`, updateError)
          return { asset_id: asset.id, status: 'error', error: updateError.message }
        }

        // 가격 히스토리 저장
        const { error: historyError } = await supabase
          .from('price_history')
          .insert({
            asset_id: asset.id,
            price: finalPrice,
            timestamp: new Date().toISOString()
          })

        if (historyError) {
          console.warn(`Failed to save price history for ${asset.symbol}:`, historyError)
        }

        return {
          asset_id: asset.id,
          symbol: asset.symbol,
          status: 'updated',
          price: finalPrice,
          change: priceChangePercent
        }
      } catch (error) {
        console.error(`Error updating ${asset.symbol}:`, error)
        return { asset_id: asset.id, status: 'error', error: String(error) }
      }
    })

    const results = await Promise.all(updatePromises)
    
    const successCount = results.filter(r => r.status === 'updated').length
    const errorCount = results.filter(r => r.status === 'error').length
    const noDataCount = results.filter(r => r.status === 'no_data').length

    console.log('Market update completed:', {
      total: assets.length,
      success: successCount,
      errors: errorCount,
      noData: noDataCount
    })

    return NextResponse.json({
      success: true,
      message: '시장 데이터 업데이트 완료',
      summary: {
        total_assets: assets.length,
        updated: successCount,
        errors: errorCount,
        no_data: noDataCount,
        exchange_rate: exchangeRate
      },
      results: results
    })

  } catch (error) {
    console.error('Market update error:', error)
    return NextResponse.json({
      success: false,
      error: '시장 데이터 업데이트 실패',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

// GET 요청으로 현재 시장 데이터 조회
export async function GET() {
  try {
    const { data: assets, error } = await supabase
      .from('market_assets')
      .select('*')
      .eq('is_active', true)
      .order('symbol')

    if (error) {
      return NextResponse.json({
        success: false,
        error: '시장 데이터 조회 실패',
        details: error.message
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      assets: assets || []
    })

  } catch (error) {
    console.error('Market data fetch error:', error)
    return NextResponse.json({
      success: false,
      error: '서버 오류',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}