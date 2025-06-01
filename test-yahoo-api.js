// Yahoo Finance API 테스트 스크립트

async function testYahooAPI() {
  console.log('Yahoo Finance API 테스트 시작...')
  
  const symbols = ['AAPL', '005930.KS', 'BTC-USD']
  
  for (const symbol of symbols) {
    try {
      console.log(`\n${symbol} 테스트 중...`)
      
      const response = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=2d`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        }
      )
      
      console.log(`응답 상태: ${response.status}`)
      
      if (response.ok) {
        const data = await response.json()
        const result = data.chart?.result?.[0]
        
        if (result) {
          const meta = result.meta
          console.log(`✅ ${symbol}: ₩${meta.regularMarketPrice} (${meta.currency})`)
          console.log(`   이전 종가: ₩${meta.previousClose}`)
          console.log(`   변화: ${((meta.regularMarketPrice - meta.previousClose) / meta.previousClose * 100).toFixed(2)}%`)
        } else {
          console.log(`❌ ${symbol}: 데이터 없음`)
        }
      } else {
        console.log(`❌ ${symbol}: HTTP ${response.status}`)
      }
    } catch (error) {
      console.log(`❌ ${symbol}: ${error.message}`)
    }
  }
  
  // 환율 테스트
  try {
    console.log('\n환율 API 테스트...')
    const rateResponse = await fetch('https://api.exchangerate-api.com/v4/latest/USD')
    if (rateResponse.ok) {
      const rateData = await rateResponse.json()
      console.log(`✅ USD/KRW: ${rateData.rates.KRW}`)
    } else {
      console.log('❌ 환율 API 실패')
    }
  } catch (error) {
    console.log(`❌ 환율 API 오류: ${error.message}`)
  }
}

testYahooAPI()