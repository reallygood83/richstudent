import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

interface YahooFinanceResponse {
  chart: {
    result: Array<{
      meta: {
        regularMarketPrice: number
        previousClose: number
        currency: string
        symbol: string
        exchangeName: string
      }
      timestamp: number[]
      indicators: {
        quote: Array<{
          close: number[]
        }>
      }
    }>
    error?: unknown
  }
}

// 대체 환율 API에서 JPY/KRW 환율 조회
async function fetchJPYKRWRate(): Promise<number> {
  try {
    // ExchangeRate-API에서 JPY 기준 환율 조회
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/JPY')
    
    if (!response.ok) {
      return 960 // 기본값: 100엔 = 960원
    }
    
    const data = await response.json()
    const jpyToKrw = data.rates?.KRW || 0.0096 // 1 JPY = 0.0096 KRW
    return Math.round(jpyToKrw * 100 * 100) / 100 // 100 JPY = X KRW로 변환
  } catch (error) {
    console.error('JPY/KRW exchange rate fetch error:', error)
    return 960 // 기본값: 100엔 = 960원
  }
}

// Yahoo Finance에서 실시간 가격 조회
async function fetchRealTimePrice(symbol: string): Promise<number | null> {
  try {
    // 일본 엔화는 대체 API 사용
    if (symbol === 'JPYKRW=X') {
      return await fetchJPYKRWRate()
    }

    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=2d`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      }
    )

    if (!response.ok) {
      console.error(`Yahoo Finance API error for ${symbol}: ${response.status}`)
      return null
    }

    const data: YahooFinanceResponse = await response.json()
    const result = data.chart?.result?.[0]
    
    if (!result || !result.meta) {
      console.error(`No data found for symbol: ${symbol}`)
      return null
    }

    const price = result.meta.regularMarketPrice || result.meta.previousClose
    const currency = result.meta.currency

    // 환율 데이터 처리
    if (symbol.includes('KRW=X') || symbol.includes('=X')) {
      return Math.round(price * 100) / 100 // 소수점 2자리까지
    }

    // USD 자산인 경우 KRW로 환율 변환
    if (currency === 'USD') {
      const exchangeRate = await fetchExchangeRate()
      return Math.round(price * exchangeRate)
    }

    return Math.round(price)
  } catch (error) {
    console.error(`Error fetching price for ${symbol}:`, error)
    return null
  }
}

// USD/KRW 환율 조회
async function fetchExchangeRate(): Promise<number> {
  try {
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD')
    
    if (!response.ok) {
      return 1300 // 기본 환율
    }
    
    const data = await response.json()
    return data.rates?.KRW || 1300
  } catch (error) {
    console.error('Exchange rate fetch error:', error)
    return 1300 // 기본 환율
  }
}

// 랜덤 가격 생성 (API 실패 시 대체)
function generateRandomPrice(basePrice: number, volatility: number = 0.02): number {
  const changePercent = (Math.random() - 0.5) * 2 * volatility
  return Math.round(basePrice * (1 + changePercent))
}

export async function POST() {
  try {
    console.log('Market data update started...')

    // 모든 시장 자산 조회
    const { data: assets, error: assetsError } = await supabase
      .from('market_assets')
      .select('id, symbol, name, current_price, asset_type')
      .eq('is_active', true)

    if (assetsError || !assets) {
      return NextResponse.json({
        success: false,
        error: '시장 자산을 조회할 수 없습니다.'
      }, { status: 500 })
    }

    const updates: Array<{ id: string; new_price: number; source: string }> = []
    
    // Yahoo Finance 심볼 매핑 (확장 버전 - 40개)
    const symbolMapping: Record<string, string> = {
      // 한국 주식 (10개)
      '005930': '005930.KS',  // 삼성전자
      '000660': '000660.KS',  // SK하이닉스
      '035420': '035420.KS',  // NAVER
      '051910': '051910.KS',  // LG화학
      '006400': '006400.KS',  // 삼성SDI
      '005380': '005380.KS',  // 현대자동차
      '035720': '035720.KS',  // 카카오
      '000270': '000270.KS',  // 기아
      '005490': '005490.KS',  // 포스코홀딩스
      '068270': '068270.KS',  // 셀트리온

      // 미국 주식 (10개)
      'AAPL': 'AAPL',     // Apple
      'GOOGL': 'GOOGL',   // Alphabet
      'MSFT': 'MSFT',     // Microsoft
      'TSLA': 'TSLA',     // Tesla
      'NVDA': 'NVDA',     // NVIDIA
      'AMZN': 'AMZN',     // Amazon
      'META': 'META',     // Meta
      'NFLX': 'NFLX',     // Netflix
      'AMD': 'AMD',       // AMD
      'KO': 'KO',         // Coca-Cola

      // 암호화폐 (5개)
      'BTC-USD': 'BTC-USD',  // 비트코인
      'ETH-USD': 'ETH-USD',  // 이더리움
      'BNB-USD': 'BNB-USD',  // 바이낸스코인
      'XRP-USD': 'XRP-USD',  // 리플
      'ADA-USD': 'ADA-USD',  // 카르다노

      // 환율 (5개)
      'USDKRW=X': 'USDKRW=X',  // 미국 달러
      'EURKRW=X': 'EURKRW=X',  // 유로
      'JPYKRW=X': 'JPYKRW=X',  // 일본 엔
      'CNYKRW=X': 'CNYKRW=X',  // 중국 위안
      'GBPKRW=X': 'GBPKRW=X',  // 영국 파운드

      // 원자재/ETF (10개)
      'GLD': 'GLD',    // 금 ETF
      'SLV': 'SLV',    // 은 ETF
      'USO': 'USO',    // 석유 ETF
      'QQQ': 'QQQ',    // 나스닥100 ETF
      'SPY': 'SPY',    // S&P500 ETF
      'IWM': 'IWM',    // 러셀2000 ETF
      'DIA': 'DIA',    // 다우존스 ETF
      'VTI': 'VTI',    // 미국전체 ETF
      'EEM': 'EEM',    // 신흥국 ETF
      'ARKK': 'ARKK'   // ARK혁신 ETF
    }

    // 각 자산의 실시간 가격 업데이트
    for (const asset of assets) {
      const yahooSymbol = symbolMapping[asset.symbol] || asset.symbol
      
      // API 호출 간격 (Rate Limit 방지)
      await new Promise(resolve => setTimeout(resolve, 200))
      
      let newPrice = await fetchRealTimePrice(yahooSymbol)
      let source = 'yahoo_finance'
      
      // Yahoo Finance API 실패 시 랜덤 가격 생성
      if (newPrice === null) {
        newPrice = generateRandomPrice(asset.current_price)
        source = 'random_fallback'
        console.warn(`Using random price for ${asset.symbol}: ${newPrice}`)
      }
      
      updates.push({
        id: asset.id,
        new_price: newPrice,
        source
      })
      
      // 데이터베이스 업데이트
      const { error: updateError } = await supabase
        .from('market_assets')
        .update({ 
          current_price: newPrice,
          updated_at: new Date().toISOString()
        })
        .eq('id', asset.id)
      
      if (updateError) {
        console.error(`Failed to update ${asset.symbol}:`, updateError)
      } else {
        console.log(`✅ ${asset.symbol}: ₩${newPrice.toLocaleString()} (${source})`)
      }
    }

    return NextResponse.json({
      success: true,
      message: `${updates.length}개 자산의 가격을 업데이트했습니다.`,
      data: {
        updated_count: updates.length,
        yahoo_finance_count: updates.filter(u => u.source === 'yahoo_finance').length,
        fallback_count: updates.filter(u => u.source === 'random_fallback').length,
        updates: updates.map(u => ({
          id: u.id,
          price: u.new_price,
          source: u.source
        }))
      }
    })

  } catch (error) {
    console.error('Market data update error:', error)
    return NextResponse.json({
      success: false,
      error: '시장 데이터 업데이트 중 오류가 발생했습니다.'
    }, { status: 500 })
  }
}