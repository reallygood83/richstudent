// Yahoo Finance API 통합 서비스

export interface MarketData {
  symbol: string
  price: number
  change: number
  changePercent: number
  currency: string
  lastUpdate: string
}

export interface YahooFinanceResponse {
  chart: {
    result: [{
      meta: {
        symbol: string
        currency: string
        regularMarketPrice: number
        previousClose: number
      }
      indicators: {
        quote: [{
          close: number[]
        }]
      }
    }]
  }
}

// USD to KRW 환율 조회
export async function getExchangeRate(): Promise<number> {
  try {
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD')
    const data = await response.json()
    return data.rates.KRW || 1300 // 기본값 1300원
  } catch (error) {
    console.error('Failed to fetch exchange rate:', error)
    return 1300 // 기본 환율
  }
}

// Yahoo Finance에서 단일 자산 가격 조회
export async function fetchAssetPrice(symbol: string): Promise<MarketData | null> {
  try {
    // Yahoo Finance API 호출
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=2d`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }
    )

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data: YahooFinanceResponse = await response.json()
    const result = data.chart.result[0]
    
    if (!result) {
      throw new Error('No data returned')
    }

    const meta = result.meta
    const currentPrice = meta.regularMarketPrice
    const previousClose = meta.previousClose
    const change = currentPrice - previousClose
    const changePercent = (change / previousClose) * 100

    return {
      symbol,
      price: currentPrice,
      change,
      changePercent,
      currency: meta.currency,
      lastUpdate: new Date().toISOString()
    }
  } catch (error) {
    console.error(`Failed to fetch price for ${symbol}:`, error)
    return null
  }
}

// 여러 자산의 가격을 동시에 조회
export async function fetchMultipleAssetPrices(symbols: string[]): Promise<MarketData[]> {
  const promises = symbols.map(symbol => fetchAssetPrice(symbol))
  const results = await Promise.allSettled(promises)
  
  return results
    .filter((result): result is PromiseFulfilledResult<MarketData> => 
      result.status === 'fulfilled' && result.value !== null
    )
    .map(result => result.value)
}

// 랜덤 가격 생성 (API 실패 시 백업)
export function generateRandomPrice(basePrice: number, volatility: number = 0.05): number {
  const change = (Math.random() - 0.5) * 2 * volatility
  return Math.max(basePrice * (1 + change), 0.01)
}

// 한국 주식 심볼 변환 (.KS 추가)
export function formatKoreanStock(symbol: string): string {
  // 6자리 숫자인 경우 한국 주식으로 간주
  if (/^\d{6}$/.test(symbol)) {
    return `${symbol}.KS`
  }
  return symbol
}

// 시장 시간 확인
export function isMarketOpen(): boolean {
  const now = new Date()
  const kstHour = (now.getUTCHours() + 9) % 24 // KST 시간
  
  // 한국 시장: 평일 9:00-15:30
  const isWeekday = now.getUTCDay() >= 1 && now.getUTCDay() <= 5
  const isKoreanMarketHours = kstHour >= 9 && kstHour < 15.5
  
  return isWeekday && isKoreanMarketHours
}

// 가격 포맷팅
export function formatPrice(price: number, currency: string = 'KRW'): string {
  if (currency === 'KRW') {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price)
  } else {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(price)
  }
}

// 변화율 포맷팅
export function formatChangePercent(changePercent: number): string {
  const sign = changePercent > 0 ? '+' : ''
  return `${sign}${changePercent.toFixed(2)}%`
}

// 가격 변화 색상 결정
export function getPriceChangeColor(change: number): string {
  if (change > 0) return 'text-red-600' // 상승 (빨간색)
  if (change < 0) return 'text-blue-600' // 하락 (파란색)
  return 'text-gray-600' // 보합
}