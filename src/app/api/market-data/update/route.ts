import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

// Finnhub API 응답 인터페이스
interface FinnhubQuote {
  c: number  // Current price
  d: number  // Change
  dp: number // Percent change
  h: number  // High price of the day
  l: number  // Low price of the day
  o: number  // Open price of the day
  pc: number // Previous close price
  t: number  // Timestamp
}

// 심볼 변환 맵 (Yahoo Finance → Finnhub)
const SYMBOL_MAP: Record<string, string> = {
  // 한국 주식: 6자리 코드 → KOSPI 형식 (예: 005930 → 005930.KS)
  '000270': '000270.KS',  // 기아
  '000660': '000660.KS',  // SK하이닉스
  '005380': '005380.KS',  // 현대자동차
  '005490': '005490.KS',  // 포스코홀딩스
  '005930': '005930.KS',  // 삼성전자
  '006400': '006400.KS',  // 삼성SDI
  '035420': '035420.KS',  // NAVER
  '035720': '035720.KS',  // 카카오
  '051910': '051910.KS',  // LG화학
  '068270': '068270.KS',  // 셀트리온

  // 미국 주식: 그대로 사용
  'AAPL': 'AAPL',
  'AMD': 'AMD',
  'AMZN': 'AMZN',
  'GOOGL': 'GOOGL',
  'KO': 'KO',
  'META': 'META',
  'MSFT': 'MSFT',
  'NFLX': 'NFLX',
  'NVDA': 'NVDA',
  'TSLA': 'TSLA',

  // 암호화폐: Binance 거래소 형식 (예: BTC-USD → BINANCE:BTCUSDT)
  'BTC-USD': 'BINANCE:BTCUSDT',
  'ETH-USD': 'BINANCE:ETHUSDT',
  'BNB-USD': 'BINANCE:BNBUSDT',
  'XRP-USD': 'BINANCE:XRPUSDT',
  'ADA-USD': 'BINANCE:ADAUSDT',

  // ETF: 그대로 사용
  'SPY': 'SPY',
  'QQQ': 'QQQ',
  'DIA': 'DIA',
  'IWM': 'IWM',
  'VTI': 'VTI',
  'ARKK': 'ARKK',
  'EEM': 'EEM',
  'GLD': 'GLD',
  'SLV': 'SLV',
  'USO': 'USO',

  // 환율: Forex 형식 (예: USDKRW=X → OANDA:USD_KRW)
  'USDKRW=X': 'OANDA:USD_KRW',
  'EURKRW=X': 'OANDA:EUR_KRW',
  'JPYKRW=X': 'OANDA:JPY_KRW',
  'GBPKRW=X': 'OANDA:GBP_KRW',
  'CNYKRW=X': 'OANDA:CNY_KRW',
}

// Finnhub API에서 가격 데이터 조회
async function fetchFinnhubPrice(originalSymbol: string): Promise<{ price: number; changePercent: number; previousClose: number } | null> {
  const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY

  if (!FINNHUB_API_KEY) {
    console.error('❌ FINNHUB_API_KEY not found in environment variables')
    return null
  }

  const finnhubSymbol = SYMBOL_MAP[originalSymbol] || originalSymbol

  try {
    // Finnhub Quote API 호출
    const url = `https://finnhub.io/api/v1/quote?symbol=${finnhubSymbol}&token=${FINNHUB_API_KEY}`

    console.log(`🔍 Fetching ${originalSymbol} (${finnhubSymbol}) from Finnhub...`)

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      console.error(`❌ Finnhub API error for ${finnhubSymbol}: ${response.status} ${response.statusText}`)
      return null
    }

    const data: FinnhubQuote = await response.json()

    // Finnhub는 데이터가 없을 때 모든 값이 0으로 반환됨
    if (data.c === 0 && data.pc === 0) {
      console.warn(`⚠️ No data available for ${finnhubSymbol}`)
      return null
    }

    const currentPrice = data.c      // 현재가
    const previousClose = data.pc    // 전일종가
    const changePercent = data.dp    // 변동률 (이미 % 계산됨)

    console.log(`✅ ${originalSymbol}: ₩${currentPrice.toLocaleString()} (${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%)`)

    return {
      price: Math.round(currentPrice),
      changePercent: Math.round(changePercent * 100) / 100,
      previousClose: Math.round(previousClose)
    }

  } catch (error) {
    console.error(`❌ Error fetching ${finnhubSymbol}:`, error)
    return null
  }
}

// USD/KRW 환율 조회 (Finnhub Forex API)
async function fetchUSDKRWRate(): Promise<number> {
  const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY

  if (!FINNHUB_API_KEY) {
    return 1300 // 기본값
  }

  try {
    const url = `https://finnhub.io/api/v1/quote?symbol=OANDA:USD_KRW&token=${FINNHUB_API_KEY}`
    const response = await fetch(url)

    if (!response.ok) {
      return 1300
    }

    const data: FinnhubQuote = await response.json()
    return data.c || 1300
  } catch (error) {
    console.error('❌ USD/KRW rate fetch error:', error)
    return 1300
  }
}

export async function POST() {
  try {
    console.log('🚀 Market data update started (Finnhub API)...')

    // 모든 활성 자산 조회
    const { data: assets, error: fetchError } = await supabase
      .from('market_assets')
      .select('*')
      .eq('is_active', true)

    if (fetchError) {
      return NextResponse.json({
        success: false,
        error: `Database fetch error: ${fetchError.message}`
      }, { status: 500 })
    }

    if (!assets || assets.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No active assets found'
      }, { status: 404 })
    }

    console.log(`📊 Found ${assets.length} active assets`)

    // USD/KRW 환율 조회 (미국 주식 가격 변환용)
    const usdKrwRate = await fetchUSDKRWRate()
    console.log(`💱 USD/KRW Rate: ₩${usdKrwRate.toLocaleString()}`)

    let successCount = 0
    let failCount = 0
    const updates = []

    // 자산별로 순차 처리 (Rate Limit 방지)
    for (const asset of assets) {
      const marketData = await fetchFinnhubPrice(asset.symbol)

      if (marketData) {
        let finalPrice = marketData.price

        // USD 자산은 KRW로 변환
        if (asset.currency === 'USD' && !asset.symbol.includes('KRW')) {
          finalPrice = Math.round(marketData.price * usdKrwRate)
        }

        updates.push({
          id: asset.id,
          current_price: finalPrice,
          change_percent: marketData.changePercent,
          previous_close: marketData.previousClose,
          last_updated: new Date().toISOString()
        })

        successCount++
      } else {
        failCount++
        console.warn(`⚠️ Failed to update: ${asset.name} (${asset.symbol})`)
      }

      // Rate Limit 방지: 1초당 1개 요청 (Finnhub 무료 티어: 60 calls/분)
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    // 데이터베이스 일괄 업데이트
    if (updates.length > 0) {
      for (const update of updates) {
        const { error: updateError } = await supabase
          .from('market_assets')
          .update({
            current_price: update.current_price,
            change_percent: update.change_percent,
            previous_close: update.previous_close,
            last_updated: update.last_updated
          })
          .eq('id', update.id)

        if (updateError) {
          console.error(`❌ Update error for asset ${update.id}:`, updateError)
        }
      }
    }

    console.log(`✅ Update complete: ${successCount} success, ${failCount} failed`)

    return NextResponse.json({
      success: true,
      message: `${successCount}/${assets.length} assets updated successfully`,
      successCount,
      failCount,
      totalAssets: assets.length
    })

  } catch (error) {
    console.error('❌ Market data update error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
