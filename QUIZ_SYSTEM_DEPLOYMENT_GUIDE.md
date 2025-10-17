# 퀴즈 보상 시스템 배포 가이드

## 1. 데이터베이스 스키마 적용

### Supabase에서 스키마 실행하기

1. **Supabase Dashboard 접속**
   - https://supabase.com/dashboard
   - 프로젝트 선택

2. **SQL Editor 열기**
   - 좌측 메뉴에서 "SQL Editor" 클릭
   - "New query" 버튼 클릭

3. **스키마 복사 및 실행**
   - `QUIZ_SYSTEM_SIMPLE_SCHEMA.sql` 파일 내용 전체 복사
   - SQL Editor에 붙여넣기
   - "Run" 버튼 클릭 (또는 Ctrl/Cmd + Enter)

4. **실행 결과 확인**
   - 성공 메시지: "Success. No rows returned"
   - 테이블 생성 확인: 좌측 "Table Editor"에서 `quiz_settings`, `daily_quizzes`, `student_quiz_attempts` 테이블 확인

### 생성되는 데이터베이스 구조

```
quiz_settings (교사별 퀴즈 설정)
├── id (UUID)
├── teacher_id (teachers 테이블 참조)
├── quiz_type (english/chinese/idiom)
├── questions_per_quiz (항상 5)
├── daily_open_time (기본값: 08:00)
├── max_attempts_per_day (항상 1)
├── participation_reward (기본값: 1000원)
├── correct_answer_reward (기본값: 1500원)
├── perfect_score_bonus (기본값: 1500원)
├── daily_max_reward (기본값: 10000원)
└── is_active (true/false)

daily_quizzes (AI 자동 생성 퀴즈)
├── id (UUID)
├── teacher_id (teachers 테이블 참조)
├── quiz_date (퀴즈 날짜, UNIQUE per teacher)
├── quiz_type (english/chinese/idiom)
├── questions (JSONB 배열 - 5개 문제)
├── generated_at (생성 시간)
└── generated_by (gemini-ai)

student_quiz_attempts (학생 응시 기록)
├── id (UUID)
├── daily_quiz_id (daily_quizzes 참조)
├── student_id (students 참조)
├── started_at (시작 시간)
├── completed_at (완료 시간)
├── time_spent_seconds (소요 시간)
├── total_questions (5)
├── correct_answers (맞춘 개수)
├── participation_reward (참여 보상)
├── score_reward (정답 보상 합계)
├── bonus_reward (만점 보너스)
├── total_reward (총 보상액)
├── reward_paid (지급 여부)
├── reward_paid_at (지급 시간)
├── answers (JSONB 배열 - 학생 답안)
├── status (in_progress/completed)
└── attempt_number (오늘의 시도 횟수)
```

## 2. 환경 변수 설정

### Vercel Dashboard에서 설정

1. **Vercel Dashboard 접속**
   - https://vercel.com/dashboard
   - richstudent 프로젝트 선택

2. **Environment Variables 설정**
   - Settings → Environment Variables
   - 다음 변수 추가:

```env
CRON_SECRET=your_random_32_character_secret
```

**CRON_SECRET 생성 방법**:
```bash
openssl rand -base64 32
```

**중요**: `GEMINI_API_KEY`는 환경 변수로 설정하지 않습니다. 각 교사가 플랫폼의 뉴스 설정에서 입력합니다.

## 3. Vercel Cron Jobs 확인

### vercel.json 설정 확인

프로젝트에 이미 다음 Cron Jobs이 설정되어 있습니다:

```json
{
  "crons": [
    {
      "path": "/api/cron/generate-daily-quiz",
      "schedule": "0 22 * * *"  // 매일 오후 10시 UTC (한국시간 오전 7시)
    },
    {
      "path": "/api/cron/pay-quiz-rewards",
      "schedule": "0 * * * *"   // 매 시각 정각
    }
  ]
}
```

### Cron Jobs 작동 확인

1. **Vercel Dashboard에서 확인**
   - Deployments → 최신 배포 클릭
   - "Functions" 탭 → Cron Jobs 섹션 확인
   - 2개의 Cron Jobs가 등록되어 있어야 함

2. **수동 테스트 (배포 후)**
```bash
# Daily Quiz Generation 테스트
curl -X GET https://richstudent.dev/api/cron/generate-daily-quiz \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Reward Payment 테스트
curl -X GET https://richstudent.dev/api/cron/pay-quiz-rewards \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## 4. 교사 초기 설정 안내

### 교사가 해야 할 일

1. **Gemini API 키 설정** (필수)
   - 리치스튜던트 플랫폼 로그인
   - "뉴스 설정" 페이지로 이동
   - Google AI Studio에서 발급받은 API 키 입력
   - 저장

2. **퀴즈 설정** (선택)
   - "퀴즈 설정" 페이지로 이동
   - 4가지 설정 확인/수정:
     - 퀴즈 종류 (영어/한자/사자성어)
     - 퀴즈 오픈 시간 (기본값: 08:00)
     - 보상 금액 (기본값 그대로 사용 가능)
     - 활성화 상태 (ON/OFF)
   - 저장

3. **첫 퀴즈 생성 대기**
   - 다음날 오전 7시에 자동으로 퀴즈 생성됨
   - 또는 수동으로 퀴즈 생성 API 호출 가능

## 5. 배포 체크리스트

### 배포 전 확인사항
- [ ] `QUIZ_SYSTEM_SIMPLE_SCHEMA.sql` Supabase에 실행 완료
- [ ] Supabase에서 3개 테이블 생성 확인
- [ ] Vercel에 `CRON_SECRET` 환경 변수 설정 완료
- [ ] `vercel.json`에 Cron Jobs 설정 확인

### 배포 후 확인사항
- [ ] Vercel Dashboard에서 Cron Jobs 등록 확인
- [ ] 교사 대시보드에 "퀴즈 설정" 링크 추가
- [ ] 학생 대시보드에 "오늘의 퀴즈" 링크 추가
- [ ] 교사가 뉴스 설정에서 Gemini API 키 입력 완료
- [ ] 교사가 퀴즈 설정에서 설정 완료
- [ ] 다음날 오전 7시에 퀴즈 자동 생성 확인

## 6. 문제 해결

### 퀴즈가 생성되지 않을 때

1. **API 키 확인**
   - 교사의 news_settings 테이블에 gemini_api_key가 있는지 확인
   - Google AI Studio에서 API 키 유효성 확인

2. **퀴즈 설정 확인**
   - quiz_settings 테이블에서 is_active=true인지 확인
   - daily_open_time이 올바른지 확인

3. **Cron Job 로그 확인**
   - Vercel Dashboard → Functions → Cron Jobs
   - 실행 로그에서 에러 메시지 확인

4. **수동 퀴즈 생성 (임시)**
```bash
curl -X GET https://richstudent.dev/api/cron/generate-daily-quiz \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### 보상이 지급되지 않을 때

1. **student_quiz_attempts 테이블 확인**
   - reward_paid 필드가 false로 남아있는지 확인
   - completed_at이 NULL인지 확인

2. **수동 보상 지급 실행**
```bash
curl -X GET https://richstudent.dev/api/cron/pay-quiz-rewards \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

3. **계좌 잔액 확인**
   - accounts 테이블에서 학생의 checking 계좌 확인
   - transactions 테이블에서 거래 내역 확인

## 7. 유지보수

### 정기 점검 항목

**매일**:
- 퀴즈 자동 생성 확인 (오전 7시 이후)
- 보상 지급 상태 확인

**매주**:
- Gemini API 사용량 확인 (Google AI Studio)
- 학생 참여율 통계 확인

**매월**:
- Supabase 스토리지 사용량 확인
- API 호출 횟수 확인
- Cron Job 실행 로그 검토

### 데이터 백업

**중요 테이블**:
- `quiz_settings` - 교사별 설정 (복구 필요 시 재설정 가능)
- `daily_quizzes` - AI 생성 문제 (재생성 가능)
- `student_quiz_attempts` - 학생 응시 기록 (반드시 백업 필요)

**백업 방법**:
```sql
-- Supabase SQL Editor에서 실행
COPY (SELECT * FROM student_quiz_attempts) TO '/tmp/quiz_attempts_backup.csv' CSV HEADER;
```

## 8. 추가 기능 개발 시 참고사항

### 확장 가능한 부분

1. **퀴즈 종류 추가**
   - `lib/gemini-quiz.ts`에서 새 퀴즈 타입 추가
   - SQL ENUM에 새 타입 추가
   - 프롬프트 작성 함수 추가

2. **보상 구조 변경**
   - `quiz_settings` 테이블에 새 보상 컬럼 추가
   - `calculate_quiz_reward()` 함수 수정
   - API 응답 구조 업데이트

3. **통계 및 랭킹 시스템**
   - `student_quiz_attempts` 테이블을 활용한 통계 쿼리
   - 주간/월간 랭킹 뷰 생성
   - 교사 대시보드에 통계 페이지 추가

## 9. 참고 문서

- **환경 설정**: `QUIZ_SYSTEM_ENV_SETUP.md`
- **API 명세**: 각 API 파일의 JSDoc 주석 참고
- **데이터베이스 스키마**: `QUIZ_SYSTEM_SIMPLE_SCHEMA.sql`
- **Gemini API 문서**: https://ai.google.dev/gemini-api/docs
- **Vercel Cron Jobs**: https://vercel.com/docs/cron-jobs

---

**배포 문의**: 문제 발생 시 개발 문서 및 로그를 확인하세요.
