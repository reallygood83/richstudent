# Quiz System Environment Variable Setup

퀴즈 보상 시스템을 위한 환경 변수 설정 가이드입니다.

## Required Environment Variables

### 1. Gemini API Key (교사별 설정)
**⭐ 중요**: Gemini API 키는 환경 변수가 아닌 **news_settings 테이블**에서 교사별로 관리됩니다.

**설정 방법**:
1. Google AI Studio 접속: https://aistudio.google.com/
2. API Key 생성
3. 리치스튜던트 플랫폼 로그인
4. **뉴스 설정** 페이지에서 API 키 입력
5. 동일한 API 키가 퀴즈 생성에도 자동으로 사용됨

**용도**:
- AI 뉴스 설명 자동 생성
- AI 퀴즈 문제 자동 생성 (Gemini 2.0 Flash Experimental 모델 사용)

**장점**:
- 교사마다 자신의 API 키 사용 (비용 관리 용이)
- 한 번 설정으로 뉴스와 퀴즈 기능 모두 활용
- 환경 변수 관리 불필요

### 2. Cron Job Secret (필수)
```env
CRON_SECRET=your_random_secret_here
```

**생성 방법**:
```bash
# 랜덤 시크릿 생성
openssl rand -base64 32
```

**용도**: Cron Job API 보안 인증 (무단 접근 방지)

## Local Development Setup

`.env.local` 파일에 추가:

```env
# Cron Job Security (필수)
CRON_SECRET=your_cron_secret

# Existing variables...
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
```

**주의**: GEMINI_API_KEY는 환경 변수로 설정할 필요가 없습니다. 각 교사가 플랫폼의 뉴스 설정에서 직접 입력합니다.

## Vercel Production Setup

Vercel Dashboard → Settings → Environment Variables에서 설정:

**CRON_SECRET** (필수)
- Key: `CRON_SECRET`
- Value: `your_cron_secret`
- Environment: Production, Preview, Development

**GEMINI_API_KEY** (설정 불필요)
- ❌ 환경 변수로 설정하지 마세요
- ✅ 각 교사가 플랫폼 내에서 자신의 API 키를 설정합니다

## Cron Job Schedule

`vercel.json`에 설정된 스케줄:

### 1. Daily Quiz Generation
- **Path**: `/api/cron/generate-daily-quiz`
- **Schedule**: `0 22 * * *` (매일 오후 10시 UTC = 한국시간 오전 7시)
- **동작**: 모든 활성 교사의 오늘 퀴즈 자동 생성

### 2. Reward Payment (Backup)
- **Path**: `/api/cron/pay-quiz-rewards`
- **Schedule**: `0 * * * *` (매시간 0분)
- **동작**: 미지급 보상 자동 처리 (백업 시스템)

## Testing Cron Jobs Locally

로컬에서 Cron Job 테스트:

```bash
# Daily Quiz Generation Test
curl -X GET http://localhost:3000/api/cron/generate-daily-quiz \
  -H "Authorization: Bearer your_cron_secret"

# Reward Payment Test
curl -X GET http://localhost:3000/api/cron/pay-quiz-rewards \
  -H "Authorization: Bearer your_cron_secret"
```

**예상 응답**:
```json
{
  "success": true,
  "message": "Daily quiz generation completed",
  "stats": {
    "total": 5,
    "success": 5,
    "failed": 0,
    "skipped": 0
  },
  "results": [...]
}
```

## Security Best Practices

1. **절대 커밋하지 말 것**: `.env.local` 파일은 `.gitignore`에 포함되어 있습니다
2. **강력한 시크릿 사용**: `CRON_SECRET`은 최소 32자 이상의 랜덤 문자열
3. **정기적 갱신**: API 키와 시크릿은 정기적으로 갱신 권장

## Troubleshooting

### Gemini API 에러
**에러 메시지**: "No Gemini API key configured in news settings"

**해결 방법**:
1. 교사 계정으로 로그인
2. **뉴스 설정** 페이지로 이동
3. Gemini API 키 입력 및 저장
4. Google AI Studio에서 API 키가 유효한지 확인: https://aistudio.google.com/
5. API 사용량 및 Rate Limit 확인

**중요**: 각 교사가 자신의 API 키를 news_settings 테이블에 저장해야 합니다.

### Cron Job 실행 안됨
- `CRON_SECRET`이 정확히 설정되었는지 확인
- Vercel Dashboard에서 Cron Job 로그 확인
- 스케줄 시간이 올바른지 확인 (UTC 기준)

### 퀴즈 생성 실패
1. **API 키 확인**: 해당 교사의 news_settings에 gemini_api_key가 있는지 확인
2. **설정 확인**: `quiz_settings` 테이블에 활성 설정(`is_active=true`)이 있는지 확인
3. **로그 확인**: Cron Job 실행 로그에서 에러 메시지 확인
4. **데이터베이스**: Supabase 연결 상태 및 테이블 구조 확인

### 퀴즈가 오늘 생성되지 않음
1. **시간 확인**: Cron Job이 오전 7시(한국시간)에 실행되는지 확인
2. **중복 방지**: 이미 오늘 퀴즈가 생성되었는지 `daily_quizzes` 테이블 확인
3. **API 키**: 교사의 news_settings에 유효한 gemini_api_key가 있는지 확인
