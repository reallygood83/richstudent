# Yahoo Finance API 무료 사용 가이드

## 📌 Yahoo Finance API 특징

### ✅ 무료로 사용 가능한 이유
1. **공식 API 아님**: Yahoo Finance는 공식적으로 API를 제공하지 않음
2. **웹 스크래핑**: 실제로는 Yahoo Finance 웹사이트의 차트 데이터 엔드포인트를 활용
3. **무제한 무료**: API 키 불필요, 사용량 제한 없음 (단, Rate Limit 존재)

### ⚠️ Rate Limit 제약사항
- **초당 요청**: ~5-10 requests/second
- **분당 요청**: ~60-120 requests/minute
- **시간당 요청**: ~500-1000 requests/hour
- **초과 시**: HTTP 429 (Too Many Requests) 응답

### 🎯 현재 RichStudent 사용량 분석

**문제점**:
- 사용자마다 프론트엔드에서 15분마다 업데이트 → **중복 API 호출**
- 사용자 100명 × 15분마다 = 시간당 400회 API 호출
- 각 업데이트마다 40개 자산 조회 = **시간당 16,000+ API 요청** 🚨

**해결책**:
- **중앙집중식 업데이트**: Vercel Cron으로 30분마다 1번만 호출
- **모든 사용자 공유**: DB에 저장된 가격을 모든 사용자가 조회
- **API 사용량 감소**: 시간당 16,000+ → **시간당 80회** (99.5% 감소)

## 🏗️ 최적화 전략

### 1️⃣ 중앙집중식 업데이트 (Vercel Cron)
```javascript
// vercel.json
{
  "crons": [
    {
      "path": "/api/market-data/auto-update",
      "schedule": "*/30 * * * *"  // 30분마다 실행
    }
  ]
}
```

### 2️⃣ 프론트엔드 캐싱 (DB 조회만)
```javascript
// 프론트엔드: Yahoo API 호출 제거 → DB 조회만
const fetchMarketData = async () => {
  const response = await fetch('/api/market-data') // DB에서 조회
  // Yahoo Finance 직접 호출 제거
}
```

### 3️⃣ 배치 처리 최적화
```javascript
// 5개씩 3초 간격으로 처리
await processBatch(assets, 5, processAsset, 3000, 8000)
```

## 📊 최적화 결과 비교

| 항목 | 기존 방식 | 최적화 방식 | 개선율 |
|------|-----------|-------------|--------|
| API 호출 주체 | 각 사용자 프론트엔드 | Vercel Cron (중앙) | - |
| 업데이트 주기 | 15분마다 | 30분마다 | - |
| 시간당 업데이트 | 4회 × 100명 = 400회 | 2회 × 1명 = 2회 | **99.5% 감소** |
| 시간당 API 요청 | 400회 × 40자산 = 16,000+ | 2회 × 40자산 = 80 | **99.5% 감소** |
| Rate Limit 위험 | 🔴 매우 높음 | 🟢 매우 낮음 | - |
| 서버 부하 | 🔴 높음 | 🟢 낮음 | - |

## 🔧 구현 세부사항

### Yahoo Finance 엔드포인트
```javascript
// 실시간 차트 데이터 (2일치)
https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=2d

// 응답 예시
{
  "chart": {
    "result": [{
      "meta": {
        "regularMarketPrice": 114900,      // 현재가
        "chartPreviousClose": 111900,      // 전일종가
        "currency": "KRW",
        "symbol": "005930.KS"
      }
    }]
  }
}
```

### 재시도 로직 (Rate Limit 대응)
```javascript
// Exponential Backoff
for (let attempt = 1; attempt <= 3; attempt++) {
  try {
    const response = await fetch(yahooURL)
    if (response.status === 429) {
      const backoff = Math.pow(2, attempt) * 1000 // 2s, 4s, 8s
      await new Promise(resolve => setTimeout(resolve, backoff))
      continue
    }
    // 성공 처리
  } catch (error) {
    // 에러 처리
  }
}
```

### 환율 데이터 대체 API
```javascript
// Yahoo Finance는 JPY/KRW를 제공하지 않음
// 대체 API: ExchangeRate-API (무료, API 키 불필요)
const response = await fetch('https://api.exchangerate-api.com/v4/latest/JPY')
const jpyToKrw = response.rates.KRW * 100 // 100엔 기준
```

## 🎯 권장 운영 방식

### 정규 거래 시간 기준 업데이트
```javascript
// 한국 증시: 평일 09:00-15:30
// 미국 증시: 평일 23:30-06:00 (KST)

// 최적 업데이트 시간
- 09:00, 09:30, 10:00, ... 15:00, 15:30 (한국 증시)
- 23:30, 00:00, 00:30, ... 05:30, 06:00 (미국 증시)
```

### Vercel Cron 한계
- **최소 주기**: 1분마다 (`* * * * *`)
- **무료 플랜**: 월 100시간 실행 시간
- **Pro 플랜**: 월 1,000시간 실행 시간

## 🚀 추가 최적화 방안

### 1️⃣ 캐시 레이어 추가
```javascript
// Redis나 Supabase Edge Functions 활용
const cachedPrice = await redis.get(`price:${symbol}`)
if (cachedPrice && Date.now() - cachedPrice.timestamp < 30 * 60 * 1000) {
  return cachedPrice.data
}
```

### 2️⃣ Webhook 기반 업데이트
```javascript
// 외부 Cron 서비스 활용 (cron-job.org)
POST https://richstudent.dev/api/market-data/auto-update
Authorization: Bearer YOUR_CRON_SECRET
```

### 3️⃣ 사용자별 맞춤 업데이트
```javascript
// 학생들이 보유한 자산만 업데이트
const activeAssets = await getStudentHoldings()
const assetsToUpdate = marketAssets.filter(a => activeAssets.includes(a.symbol))
```

## 📖 참고 자료

- [Yahoo Finance API Unofficial Guide](https://github.com/ranaroussi/yfinance)
- [Vercel Cron Jobs Documentation](https://vercel.com/docs/cron-jobs)
- [ExchangeRate-API](https://www.exchangerate-api.com/)

## ⚠️ 주의사항

1. **IP 차단 위험**: 너무 빈번한 요청 시 Yahoo에서 IP 차단 가능
2. **데이터 정확성**: 비공식 API이므로 구조 변경 가능성 존재
3. **법적 책임**: 상업적 목적 사용 시 Yahoo 이용약관 확인 필요
4. **백업 전략**: API 장애 대비 랜덤 가격 생성 로직 유지

## ✅ RichStudent 최종 권장 설정

```javascript
// vercel.json
{
  "crons": [
    {
      "path": "/api/market-data/auto-update",
      "schedule": "*/30 * * * *"  // 30분마다 중앙 업데이트
    }
  ]
}

// 프론트엔드: DB 조회만 (3분마다)
setInterval(fetchMarketData, 3 * 60 * 1000)

// Yahoo API 호출: Vercel Cron에서만 (30분마다 1회)
```

**예상 API 사용량**: 시간당 80회 (Rate Limit 안전 범위 내)
