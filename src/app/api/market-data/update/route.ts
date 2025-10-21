import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

// Vercel Serverless Function 설정
export const maxDuration = 180 // 3분 타임아웃

// ==================== Finnhub API ====================
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

// ==================== Yahoo Finance API ====================
interface YahooFinanceResponse {
  chart: {
    result: Array<{
      meta: {
        regularMarketPrice: number
        previousClose?: number
        chartPreviousClose: number
        currency: string
        symbol: string
      }
    }>
  }
}

// 한국 주식 심볼 목록 (Yahoo Finance 전용)
const KOREAN_STOCK_SYMBOLS = [
  '000270', '000660', '005380', '005490', '005930',
  '006400', '035420', '035720', '051910', '068270'
]

// Finnhub 심볼 매핑 (미국 주식, 암호화폐, ETF, 환율)
const FINNHUB_SYMBOL_MAP: Record<string, string> = {
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

  // 암호화폐: Binance 거래소 형식
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

  // 환율: Forex 형식
  'USDKRW=X': 'OANDA:USD_KRW',
  'EURKRW=X': 'OANDA:EUR_KRW',
  'JPYKRW=X': 'OANDA:JPY_KRW',
  'GBPKRW=X': 'OANDA:GBP_KRW',
  'CNYKRW=X': 'OANDA:CNY_KRW',
}

// ==================== Yahoo Finance 함수 (한국 주식 전용) ====================
async function fetchYahooPrice(symbol: string, retries = 3): Promise<{ price: number; changePercent: number; previousClose: number } | null> {
  const yahooSymbol = `${symbol}.KS` // 한국 주식은 .KS 접미사

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1d&range=1d`

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
        },
      })

      if (!response.ok) {
        if (response.status === 429) {
          // Rate Limit: 지수 백오프 (2초, 4초, 8초)
          const backoffTime = Math.pow(2, attempt) * 1000
          console.log(`⚠️ Yahoo Rate Limit for ${symbol}, waiting ${backoffTime}ms (attempt ${attempt}/${retries})`)
          await new Promise(resolve => setTimeout(resolve, backoffTime))
          continue
        }
        throw new Error(`Yahoo API error: ${response.status}`)
      }

      const data: YahooFinanceResponse = await response.json()

      if (!data.chart?.result?.[0]?.meta) {
        console.warn(`⚠️ No Yahoo data for ${symbol}`)
        return null
      }

      const meta = data.chart.result[0].meta
      const currentPrice = meta.regularMarketPrice
      const previousClose = meta.previousClose || meta.chartPreviousClose

      if (!currentPrice || !previousClose) {
        return null
      }

      const changePercent = ((currentPrice - previousClose) / previousClose) * 100

      console.log(`✅ Yahoo ${symbol}: ₩${Math.round(currentPrice).toLocaleString()} (${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%)`)

      return {
        price: Math.round(currentPrice),
        changePercent: Math.round(changePercent * 100) / 100,
        previousClose: Math.round(previousClose)
      }

    } catch (error) {
      if (attempt < retries) {
        const backoffTime = Math.pow(2, attempt) * 1000
        console.log(`⚠️ Yahoo error for ${symbol}, retrying in ${backoffTime}ms (attempt ${attempt}/${retries})`)
        await new Promise(resolve => setTimeout(resolve, backoffTime))
        continue
      }

      console.error(`❌ Yahoo failed for ${symbol} after ${retries} attempts:`, error)
      return null
    }
  }

  return null
}

// ==================== Finnhub API 함수 ====================
async function fetchFinnhubPrice(originalSymbol: string): Promise<{ price: number; changePercent: number; previousClose: number } | null> {
  const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY

  if (!FINNHUB_API_KEY) {
    console.error('❌ FINNHUB_API_KEY not found')
    return null
  }

  const finnhubSymbol = FINNHUB_SYMBOL_MAP[originalSymbol]
  if (!finnhubSymbol) {
    console.warn(`⚠️ No Finnhub mapping for ${originalSymbol}`)
    return null
  }

  try {
    const url = `https://finnhub.io/api/v1/quote?symbol=${finnhubSymbol}&token=${FINNHUB_API_KEY}`

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      console.error(`❌ Finnhub API error for ${finnhubSymbol}: ${response.status}`)
      return null
    }

    const data: FinnhubQuote = await response.json()

    // Finnhub는 데이터가 없을 때 모든 값이 0
    if (data.c === 0 && data.pc === 0) {
      console.warn(`⚠️ No Finnhub data for ${finnhubSymbol}`)
      return null
    }

    const currentPrice = data.c
    const previousClose = data.pc
    const changePercent = data.dp // 이미 % 계산됨

    console.log(`✅ Finnhub ${originalSymbol}: $${currentPrice.toFixed(2)} (${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%)`)

    return {
      price: currentPrice,
      changePercent: Math.round(changePercent * 100) / 100,
      previousClose
    }

  } catch (error) {
    console.error(`❌ Finnhub error for ${finnhubSymbol}:`, error)
    return null
  }
}

// ==================== 환율 조회 ====================
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
    console.error('❌ USD/KRW rate error:', error)
    return 1300
  }
}

// ==================== 메인 업데이트 함수 ====================
export async function POST() {
  try {
    console.log('🚀 Hybrid market data update started...')

    // 모든 활성 자산 조회
    const { data: assets, error: fetchError } = await supabase
      .from('market_assets')
      .select('*')
      .eq('is_active', true)

    if (fetchError) {
      return NextResponse.json({
        success: false,
        error: `Database error: ${fetchError.message}`
      }, { status: 500 })
    }

    if (!assets || assets.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No active assets found'
      }, { status: 404 })
    }

    console.log(`📊 Found ${assets.length} active assets`)

    // USD/KRW 환율 조회 (Finnhub)
    const usdKrwRate = await fetchUSDKRWRate()
    console.log(`💱 USD/KRW Rate: ₩${usdKrwRate.toLocaleString()}`)

    // 자산을 한국 주식과 나머지로 분리
    const koreanStocks = assets.filter(a => KOREAN_STOCK_SYMBOLS.includes(a.symbol))
    const otherAssets = assets.filter(a => !KOREAN_STOCK_SYMBOLS.includes(a.symbol))

    console.log(`🇰🇷 Korean stocks (Yahoo): ${koreanStocks.length}`)
    console.log(`🌍 Other assets (Finnhub): ${otherAssets.length}`)

    let successCount = 0
    let failCount = 0
    const updates = []

    // ========== 한국 주식 처리 (Yahoo Finance) ==========
    console.log('\n📊 Processing Korean stocks with Yahoo Finance...')
    for (const asset of koreanStocks) {
      const marketData = await fetchYahooPrice(asset.symbol)

      if (marketData) {
        updates.push({
          id: asset.id,
          current_price: marketData.price,
          change_percent: marketData.changePercent,
          previous_close: marketData.previousClose,
          last_updated: new Date().toISOString()
        })
        successCount++
      } else {
        failCount++
        console.warn(`⚠️ Failed: ${asset.name} (${asset.symbol})`)
      }

      // Yahoo Rate Limit 방지: 한국 주식 간 2초 대기
      await new Promise(resolve => setTimeout(resolve, 2000))
    }

    // ========== 나머지 자산 처리 (Finnhub) ==========
    console.log('\n🌍 Processing other assets with Finnhub...')
    for (const asset of otherAssets) {
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
          previous_close: Math.round(marketData.previousClose * (asset.currency === 'USD' ? usdKrwRate : 1)),
          last_updated: new Date().toISOString()
        })
        successCount++
      } else {
        failCount++
        console.warn(`⚠️ Failed: ${asset.name} (${asset.symbol})`)
      }

      // Finnhub Rate Limit 방지: 1초 대기
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    // ========== 데이터베이스 업데이트 ==========
    console.log('\n💾 Updating database...')
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

    console.log(`\n✅ Update complete: ${successCount} success, ${failCount} failed`)

    return NextResponse.json({
      success: true,
      message: `${successCount}/${assets.length} assets updated successfully`,
      successCount,
      failCount,
      totalAssets: assets.length,
      koreanStocks: koreanStocks.length,
      otherAssets: otherAssets.length
    })

  } catch (error) {
    console.error('❌ Market data update error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
