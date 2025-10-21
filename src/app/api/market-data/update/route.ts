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

// Yahoo Finance 사용 심볼 목록 (한국 주식 + 환율)
const YAHOO_FINANCE_SYMBOLS = [
  // 한국 주식 (10개)
  '000270', '000660', '005380', '005490', '005930',
  '006400', '035420', '035720', '051910', '068270',

  // 환율 (4개) - Yahoo Finance에서 직접 지원
  // JPYKRW는 ExchangeRate-API로 별도 처리 (Yahoo Finance 미지원)
  'USDKRW=X', 'EURKRW=X', 'GBPKRW=X', 'CNYKRW=X'
]

// Finnhub 심볼 매핑 (미국 주식, 암호화폐, ETF만)
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
}

// ==================== ExchangeRate-API 함수 (JPY/KRW 환율) ====================
async function fetchJpyKrwRate(): Promise<{ price: number; changePercent: number; previousClose: number } | null> {
  try {
    // ExchangeRate-API로 JPY→KRW 환율 조회
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/JPY')

    if (!response.ok) {
      console.error(`❌ ExchangeRate-API error: ${response.status}`)
      return null
    }

    const data = await response.json()
    const jpyToKrw = data.rates?.KRW

    if (!jpyToKrw) {
      console.error('❌ JPY/KRW rate not found in ExchangeRate-API response')
      return null
    }

    // 100엔당 원화로 변환 (일반적인 표기 방식)
    const price = Math.round(jpyToKrw * 100 * 100) / 100

    console.log(`✅ ExchangeRate JPY/KRW: ₩${price.toFixed(2)} (100 JPY)`)

    // previousClose는 현재가로 설정 (ExchangeRate-API는 실시간만 제공)
    return {
      price,
      changePercent: 0, // 변동률 데이터 없음
      previousClose: price
    }

  } catch (error) {
    console.error('❌ ExchangeRate-API error for JPY/KRW:', error)
    return null
  }
}

// ==================== Yahoo Finance 함수 (한국 주식 + 환율) ====================
async function fetchYahooPrice(symbol: string, retries = 3): Promise<{ price: number; changePercent: number; previousClose: number } | null> {
  // 한국 주식은 .KS 접미사, 환율은 그대로 사용
  const yahooSymbol = symbol.includes('=X') ? symbol : `${symbol}.KS`

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

      // 환율은 소수점 2자리, 주식은 정수
      const isForex = symbol.includes('=X')
      const formattedPrice = isForex ? currentPrice.toFixed(2) : Math.round(currentPrice).toLocaleString()

      console.log(`✅ Yahoo ${symbol}: ${isForex ? '' : '₩'}${formattedPrice} (${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%)`)

      return {
        price: isForex ? Math.round(currentPrice * 100) / 100 : Math.round(currentPrice),
        changePercent: Math.round(changePercent * 100) / 100,
        previousClose: isForex ? Math.round(previousClose * 100) / 100 : Math.round(previousClose)
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

    // USD/KRW 환율 조회 (Yahoo Finance)
    const usdKrwData = await fetchYahooPrice('USDKRW=X')
    const usdKrwRate = usdKrwData?.price || 1300
    console.log(`💱 USD/KRW Rate: ₩${usdKrwRate.toLocaleString()}`)

    // 자산을 Yahoo Finance와 Finnhub로 분리
    const yahooAssets = assets.filter(a => YAHOO_FINANCE_SYMBOLS.includes(a.symbol))
    const finnhubAssets = assets.filter(a => !YAHOO_FINANCE_SYMBOLS.includes(a.symbol))

    console.log(`🇰🇷 Yahoo Finance assets (Korean stocks + Forex): ${yahooAssets.length}`)
    console.log(`🌍 Finnhub assets (US stocks, Crypto, ETF): ${finnhubAssets.length}`)

    let successCount = 0
    let failCount = 0
    const updates = []

    // JPY/KRW 환율 조회 (ExchangeRate-API)
    let jpyKrwData: { price: number; changePercent: number; previousClose: number } | null = null
    const jpyKrwAsset = assets.find(a => a.symbol === 'JPYKRW=X')
    if (jpyKrwAsset) {
      jpyKrwData = await fetchJpyKrwRate()
      if (jpyKrwData) {
        updates.push({
          id: jpyKrwAsset.id,
          current_price: jpyKrwData.price,
          change_percent: jpyKrwData.changePercent,
          previous_close: jpyKrwData.previousClose,
          last_updated: new Date().toISOString()
        })
        successCount++
      } else {
        failCount++
        console.warn(`⚠️ Failed: ${jpyKrwAsset.name} (${jpyKrwAsset.symbol})`)
      }
    }

    // ========== Yahoo Finance 자산 처리 (한국 주식 + 환율) ==========
    console.log('\n📊 Processing Yahoo Finance assets...')
    for (const asset of yahooAssets) {
      // USD/KRW는 이미 조회했으므로 스킵
      if (asset.symbol === 'USDKRW=X' && usdKrwData) {
        updates.push({
          id: asset.id,
          current_price: usdKrwData.price,
          change_percent: usdKrwData.changePercent,
          previous_close: usdKrwData.previousClose,
          last_updated: new Date().toISOString()
        })
        successCount++
        continue
      }

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

      // Yahoo Rate Limit 방지: 2초 대기
      await new Promise(resolve => setTimeout(resolve, 2000))
    }

    // ========== Finnhub 자산 처리 (미국 주식, 암호화폐, ETF) ==========
    console.log('\n🌍 Processing Finnhub assets...')
    for (const asset of finnhubAssets) {
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
      yahooAssets: yahooAssets.length,
      finnhubAssets: finnhubAssets.length
    })

  } catch (error) {
    console.error('❌ Market data update error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
