# 퀴즈 학습 보상 시스템 (Quiz Reward System) - 기획 명세서

## 📋 프로젝트 개요

**목표**: 학생들이 플랫폼 내에서 퀴즈를 풀고 참여 보상을 받는 교육-경제 통합 시스템 구축

**핵심 가치**:
- 학습 동기 부여 강화 (경제적 보상)
- 교사의 학습 관리 효율화 (자동화)
- 실시간 참여율 및 학습 성과 추적

---

## 🎯 Phase 1: 핵심 기능 (MVP)

### 1.1 퀴즈 유형
- **영어 단어** (English Vocabulary)
- **한자** (Chinese Characters)
- **사자성어** (Four-Character Idioms)

### 1.2 교사 기능

#### 퀴즈 생성 및 관리
```typescript
interface Quiz {
  id: string
  teacher_id: string
  quiz_type: 'english' | 'chinese' | 'idiom'
  title: string
  description: string

  // 문제 설정
  questions: QuizQuestion[]
  question_count: number // 실제 출제될 문제 수

  // 일정 설정
  schedule_type: 'one_time' | 'daily' | 'weekly'
  scheduled_time: string // "09:00" 형식
  scheduled_days?: number[] // [1,2,3,4,5] (월-금)
  start_date: Date
  end_date?: Date

  // 보상 설정
  reward_type: 'participation' | 'score_based' | 'ranking'
  participation_reward: number // 참여만 해도 받는 금액
  correct_answer_reward: number // 정답당 추가 금액
  perfect_score_bonus: number // 만점 보너스

  // 제한 설정
  time_limit_minutes: number // 0이면 무제한
  max_attempts: number // 1회 제한 권장

  // 상태
  is_active: boolean
  created_at: Date
  updated_at: Date
}

interface QuizQuestion {
  id: string
  quiz_id: string
  question_type: 'multiple_choice' | 'short_answer'

  // 문제 내용
  question_text: string
  question_image_url?: string

  // 답안 (객관식)
  choices?: string[]
  correct_choice_index?: number

  // 답안 (주관식)
  correct_answer?: string
  accept_similar?: boolean // 유사 답안 인정 여부

  // 메타데이터
  difficulty: 'easy' | 'medium' | 'hard'
  explanation?: string // 해설
  order_index: number
}
```

#### 교사 대시보드 화면 구성
```
퀴즈 관리 페이지 (/teacher/quiz)
├── 퀴즈 목록
│   ├── 활성화된 퀴즈 (진행 중)
│   ├── 예정된 퀴즈
│   └── 완료된 퀴즈 (통계 확인)
│
├── 새 퀴즈 만들기 버튼
│   ├── 퀴즈 유형 선택 (영어/한자/사자성어)
│   ├── 문제 작성/가져오기
│   ├── 일정 설정
│   ├── 보상 설정
│   └── 미리보기 및 저장
│
└── 퀴즈 통계 대시보드
    ├── 참여율 차트
    ├── 평균 점수
    ├── 학생별 성과 (상위/하위)
    └── 지급된 총 보상 금액
```

### 1.3 학생 기능

#### 퀴즈 참여 플로우
```
학생 대시보드 (/student/dashboard)
├── "새로운 퀴즈" 알림 배지
│
학생 퀴즈 페이지 (/student/quiz)
├── 진행 중인 퀴즈 목록
│   ├── 퀴즈 제목 및 설명
│   ├── 제한 시간 표시
│   ├── 예상 보상 금액 표시
│   └── "퀴즈 시작하기" 버튼
│
├── 퀴즈 풀기 화면
│   ├── 진행률 표시 (3/10)
│   ├── 남은 시간 타이머
│   ├── 문제 및 선택지
│   ├── 이전/다음 문제 이동
│   └── "제출하기" 버튼
│
└── 퀴즈 결과 화면
    ├── 점수 및 정답률
    ├── 획득한 보상 금액 표시
    ├── 오답 확인 및 해설
    └── 내 순위 (선택적)
```

#### 학생 데이터 모델
```typescript
interface QuizAttempt {
  id: string
  student_id: string
  quiz_id: string

  // 시간 기록
  started_at: Date
  completed_at?: Date
  time_spent_seconds: number

  // 답안 및 결과
  answers: StudentAnswer[]
  score: number
  max_score: number
  percentage: number

  // 보상
  reward_earned: number
  reward_paid: boolean
  reward_transaction_id?: string

  // 상태
  status: 'in_progress' | 'completed' | 'abandoned'
}

interface StudentAnswer {
  question_id: string
  student_answer: string | number
  is_correct: boolean
  time_spent_seconds: number
}
```

---

## 🔧 Phase 2: 고급 기능

### 2.1 자동화 시스템

#### 스케줄러 구현 방안

**Option 1: Vercel Cron Jobs** (추천)
```typescript
// app/api/cron/quiz-scheduler/route.ts
export async function GET(request: NextRequest) {
  // Vercel Cron에서 매 시간 호출
  // Authorization 헤더로 보안 검증

  const now = new Date()
  const currentHour = now.getHours()
  const currentMinute = now.getMinutes()
  const currentDay = now.getDay()

  // 1. 지금 시작해야 할 퀴즈 찾기
  const { data: scheduledQuizzes } = await supabase
    .from('quizzes')
    .select('*')
    .eq('is_active', true)
    .eq('scheduled_time', `${currentHour}:${currentMinute}`)
    // ... 추가 필터링

  // 2. 각 퀴즈에 대해 학생들에게 알림 생성
  for (const quiz of scheduledQuizzes) {
    await createQuizNotifications(quiz)
  }

  // 3. 만료된 퀴즈 처리 (자동 제출)
  await handleExpiredQuizzes()

  return NextResponse.json({ success: true })
}
```

**Vercel Cron 설정** (`vercel.json`):
```json
{
  "crons": [
    {
      "path": "/api/cron/quiz-scheduler",
      "schedule": "*/15 * * * *"
    },
    {
      "path": "/api/cron/quiz-rewards",
      "schedule": "0 */1 * * *"
    }
  ]
}
```

**Option 2: Supabase Edge Functions** (대안)
- PostgreSQL Cron Extension 활용
- Supabase Functions로 스케줄링
- 더 세밀한 제어 가능

#### 알림 시스템

**알림 유형**:
```typescript
interface Notification {
  id: string
  student_id: string
  type: 'quiz_available' | 'quiz_reminder' | 'quiz_expired' | 'reward_received'
  title: string
  message: string

  // 퀴즈 관련
  quiz_id?: string
  reward_amount?: number

  // 상태
  is_read: boolean
  created_at: Date
}
```

**알림 전달 방법**:
1. **플랫폼 내 알림** (Phase 1 - 우선)
   - 학생 대시보드 상단에 알림 벨 아이콘
   - 새 퀴즈 시작 시 자동으로 알림 생성
   - 실시간 업데이트 (폴링 or WebSocket)

2. **이메일 알림** (Phase 2 - 선택)
   - Resend.com API 활용 (무료 티어: 3,000통/월)
   - 퀴즈 시작 10분 전 리마인더
   - 보상 지급 확인 이메일

```typescript
// 이메일 발송 예시
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

await resend.emails.send({
  from: 'RichStudent <quiz@richstudent.dev>',
  to: student.email,
  subject: '새로운 퀴즈가 시작되었습니다! 💰',
  html: `
    <h2>${quiz.title}</h2>
    <p>참여만 해도 ${quiz.participation_reward}원!</p>
    <a href="https://richstudent.dev/student/quiz/${quiz.id}">
      지금 풀러가기
    </a>
  `
})
```

### 2.2 보상 지급 자동화

```typescript
// app/api/cron/quiz-rewards/route.ts
export async function GET() {
  // 1. 완료되었지만 보상이 지급되지 않은 시도 찾기
  const { data: unpaidAttempts } = await supabase
    .from('quiz_attempts')
    .select('*, students(*), quizzes(*)')
    .eq('status', 'completed')
    .eq('reward_paid', false)

  for (const attempt of unpaidAttempts) {
    // 2. 학생 계좌 확인
    const { data: account } = await supabase
      .from('accounts')
      .select('balance')
      .eq('student_id', attempt.student_id)
      .eq('account_type', 'checking')
      .single()

    // 3. 보상 금액 계산
    const rewardAmount = calculateReward(attempt)

    // 4. 계좌 입금
    await supabase
      .from('accounts')
      .update({
        balance: account.balance + rewardAmount,
        updated_at: new Date().toISOString()
      })
      .eq('student_id', attempt.student_id)
      .eq('account_type', 'checking')

    // 5. 거래 기록 저장
    const { data: transaction } = await supabase
      .from('transactions')
      .insert({
        to_student_id: attempt.student_id,
        from_entity: 'system',
        transaction_type: 'quiz_reward',
        amount: rewardAmount,
        description: `퀴즈 보상: ${attempt.quiz.title}`,
        status: 'completed',
        to_account_type: 'checking'
      })
      .select()
      .single()

    // 6. 보상 지급 완료 표시
    await supabase
      .from('quiz_attempts')
      .update({
        reward_paid: true,
        reward_transaction_id: transaction.id
      })
      .eq('id', attempt.id)

    // 7. 알림 생성
    await supabase
      .from('notifications')
      .insert({
        student_id: attempt.student_id,
        type: 'reward_received',
        title: '퀴즈 보상 지급 완료! 💰',
        message: `${attempt.quiz.title} 참여 보상 ${rewardAmount}원이 입금되었습니다.`,
        quiz_id: attempt.quiz_id,
        reward_amount: rewardAmount,
        is_read: false
      })
  }

  return NextResponse.json({
    success: true,
    processed: unpaidAttempts.length
  })
}

function calculateReward(attempt: QuizAttempt): number {
  const quiz = attempt.quiz
  let reward = 0

  // 기본 참여 보상
  reward += quiz.participation_reward

  // 정답당 추가 보상
  const correctCount = attempt.answers.filter(a => a.is_correct).length
  reward += correctCount * quiz.correct_answer_reward

  // 만점 보너스
  if (attempt.score === attempt.max_score) {
    reward += quiz.perfect_score_bonus
  }

  return reward
}
```

### 2.3 퀴즈 문제 은행 (Question Bank)

```typescript
interface QuestionBank {
  id: string
  teacher_id: string
  category: 'english' | 'chinese' | 'idiom'
  sub_category?: string // 예: 'middle_school_level_1'

  questions: QuizQuestion[]

  is_shared: boolean // 다른 교사와 공유 여부
  created_at: Date
}

// 교사가 문제 은행에서 랜덤 선택
interface QuizFromBank {
  question_bank_id: string
  random_selection: boolean
  question_count: number
  difficulty_filter?: 'easy' | 'medium' | 'hard'
}
```

**문제 가져오기 기능**:
- CSV 업로드로 대량 문제 등록
- 기존 퀴즈에서 문제 복사
- 공유 문제 은행에서 가져오기

---

## 📊 Phase 3: 분석 및 통계

### 3.1 교사용 분석 대시보드

```typescript
interface QuizAnalytics {
  quiz_id: string

  // 참여 통계
  total_students: number
  participated_students: number
  participation_rate: number

  // 성적 통계
  average_score: number
  median_score: number
  highest_score: number
  lowest_score: number
  score_distribution: { range: string, count: number }[]

  // 문제별 통계
  question_stats: {
    question_id: string
    correct_rate: number
    average_time_seconds: number
    most_common_wrong_answer?: string
  }[]

  // 시간 통계
  average_completion_time: number
  fastest_completion_time: number

  // 보상 통계
  total_rewards_paid: number
  average_reward_per_student: number

  // 트렌드 (일별/주별)
  participation_trend: { date: string, count: number }[]
  score_trend: { date: string, average: number }[]
}
```

### 3.2 학생용 학습 리포트

```typescript
interface StudentQuizReport {
  student_id: string
  period: 'week' | 'month' | 'all_time'

  // 전체 통계
  total_quizzes_taken: number
  average_score: number
  total_rewards_earned: number

  // 과목별 통계
  by_subject: {
    subject: 'english' | 'chinese' | 'idiom'
    quizzes_taken: number
    average_score: number
    improvement_rate: number // 최근 vs 과거
  }[]

  // 강점/약점 분석
  strong_areas: string[]
  weak_areas: string[]

  // 순위 (선택적)
  class_rank?: number
  percentile?: number

  // 학습 패턴
  most_active_time: string
  average_study_duration: number
  consistency_score: number // 규칙적 참여도
}
```

---

## 🗄️ 데이터베이스 스키마

```sql
-- 퀴즈 테이블
CREATE TABLE quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES teachers(id),
  quiz_type VARCHAR(20) NOT NULL CHECK (quiz_type IN ('english', 'chinese', 'idiom')),
  title VARCHAR(200) NOT NULL,
  description TEXT,

  -- 일정
  schedule_type VARCHAR(20) NOT NULL CHECK (schedule_type IN ('one_time', 'daily', 'weekly')),
  scheduled_time TIME NOT NULL,
  scheduled_days INTEGER[], -- [1,2,3,4,5]
  start_date DATE NOT NULL,
  end_date DATE,

  -- 보상
  reward_type VARCHAR(20) NOT NULL,
  participation_reward DECIMAL(10,2) DEFAULT 0,
  correct_answer_reward DECIMAL(10,2) DEFAULT 0,
  perfect_score_bonus DECIMAL(10,2) DEFAULT 0,

  -- 제한
  time_limit_minutes INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 1,

  -- 상태
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 퀴즈 문제 테이블
CREATE TABLE quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  question_type VARCHAR(20) NOT NULL CHECK (question_type IN ('multiple_choice', 'short_answer')),

  question_text TEXT NOT NULL,
  question_image_url TEXT,

  -- 객관식
  choices JSONB, -- ["선택지1", "선택지2", ...]
  correct_choice_index INTEGER,

  -- 주관식
  correct_answer TEXT,
  accept_similar BOOLEAN DEFAULT false,

  difficulty VARCHAR(10) CHECK (difficulty IN ('easy', 'medium', 'hard')),
  explanation TEXT,
  order_index INTEGER NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 퀴즈 시도 테이블
CREATE TABLE quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id),
  quiz_id UUID NOT NULL REFERENCES quizzes(id),

  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  time_spent_seconds INTEGER,

  answers JSONB, -- [{question_id, student_answer, is_correct, time_spent}]
  score DECIMAL(5,2),
  max_score DECIMAL(5,2),
  percentage DECIMAL(5,2),

  reward_earned DECIMAL(10,2),
  reward_paid BOOLEAN DEFAULT false,
  reward_transaction_id UUID REFERENCES transactions(id),

  status VARCHAR(20) NOT NULL CHECK (status IN ('in_progress', 'completed', 'abandoned')),

  UNIQUE(student_id, quiz_id) -- 한 학생당 한 퀴즈에 1회만
);

-- 알림 테이블
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id),
  type VARCHAR(30) NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT,

  quiz_id UUID REFERENCES quizzes(id),
  reward_amount DECIMAL(10,2),

  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 문제 은행 테이블 (Phase 2)
CREATE TABLE question_banks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES teachers(id),
  category VARCHAR(20) NOT NULL,
  sub_category VARCHAR(50),
  title VARCHAR(200) NOT NULL,

  is_shared BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 문제 은행 문제들
CREATE TABLE question_bank_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_bank_id UUID NOT NULL REFERENCES question_banks(id) ON DELETE CASCADE,

  -- quiz_questions와 동일한 구조
  question_type VARCHAR(20) NOT NULL,
  question_text TEXT NOT NULL,
  question_image_url TEXT,
  choices JSONB,
  correct_choice_index INTEGER,
  correct_answer TEXT,
  accept_similar BOOLEAN DEFAULT false,
  difficulty VARCHAR(10),
  explanation TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX idx_quizzes_teacher ON quizzes(teacher_id);
CREATE INDEX idx_quizzes_active ON quizzes(is_active);
CREATE INDEX idx_quizzes_schedule ON quizzes(scheduled_time, scheduled_days);
CREATE INDEX idx_quiz_questions_quiz ON quiz_questions(quiz_id);
CREATE INDEX idx_quiz_attempts_student ON quiz_attempts(student_id);
CREATE INDEX idx_quiz_attempts_quiz ON quiz_attempts(quiz_id);
CREATE INDEX idx_quiz_attempts_unpaid ON quiz_attempts(reward_paid) WHERE reward_paid = false;
CREATE INDEX idx_notifications_student ON notifications(student_id);
CREATE INDEX idx_notifications_unread ON notifications(is_read) WHERE is_read = false;
```

---

## 🚀 구현 우선순위

### MVP (2-3주)
1. ✅ **주차 1**: 데이터베이스 스키마 생성 및 기본 API
   - 퀴즈 CRUD API
   - 퀴즈 문제 관리 API
   - 퀴즈 시도 기록 API

2. ✅ **주차 2**: 교사 UI 구현
   - 퀴즈 생성 페이지
   - 퀴즈 목록 및 관리
   - 기본 통계 대시보드

3. ✅ **주차 3**: 학생 UI 구현
   - 퀴즈 목록 페이지
   - 퀴즈 풀기 인터페이스
   - 결과 및 보상 화면

### Phase 2 (1-2주)
4. ✅ **주차 4**: 자동화 시스템
   - Vercel Cron 설정
   - 스케줄러 구현
   - 보상 자동 지급

5. ✅ **주차 5**: 알림 시스템
   - 플랫폼 내 알림
   - 이메일 알림 (선택)

### Phase 3 (1주)
6. ✅ **주차 6**: 고급 기능
   - 문제 은행
   - 상세 분석 대시보드
   - 학생 학습 리포트

---

## 💡 기술 스택 및 도구

### 필수 추가 패키지
```json
{
  "dependencies": {
    "resend": "^3.0.0",           // 이메일 발송 (선택)
    "date-fns": "^3.0.0",         // 날짜/시간 처리
    "recharts": "^2.10.0",        // 통계 차트
    "react-countdown": "^2.3.5"   // 타이머 UI
  }
}
```

### Vercel 설정
```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/quiz-scheduler",
      "schedule": "*/15 * * * *"
    },
    {
      "path": "/api/cron/quiz-rewards",
      "schedule": "0 */1 * * *"
    }
  ],
  "env": {
    "CRON_SECRET": "@cron-secret"
  }
}
```

### 환경 변수 추가
```env
# 이메일 알림 (선택)
RESEND_API_KEY=re_...

# Cron 작업 보안
CRON_SECRET=random_secret_key_here
```

---

## 🔒 보안 고려사항

### 1. Cron 작업 보안
```typescript
// app/api/cron/quiz-scheduler/route.ts
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  // ... 스케줄러 로직
}
```

### 2. 퀴즈 제출 검증
```typescript
// 중복 제출 방지
const { data: existingAttempt } = await supabase
  .from('quiz_attempts')
  .select('id')
  .eq('student_id', studentId)
  .eq('quiz_id', quizId)
  .single()

if (existingAttempt) {
  return NextResponse.json(
    { error: '이미 참여한 퀴즈입니다.' },
    { status: 400 }
  )
}

// 시간 제한 검증
if (quiz.time_limit_minutes > 0) {
  const timeSpent = (new Date() - attempt.started_at) / 1000 / 60
  if (timeSpent > quiz.time_limit_minutes) {
    return NextResponse.json(
      { error: '제한 시간을 초과했습니다.' },
      { status: 400 }
    )
  }
}
```

### 3. 보상 지급 검증
```typescript
// 이중 지급 방지
const { data: attempt } = await supabase
  .from('quiz_attempts')
  .select('reward_paid')
  .eq('id', attemptId)
  .single()

if (attempt.reward_paid) {
  console.warn('Reward already paid for attempt:', attemptId)
  return // 이미 지급됨
}
```

---

## 📈 확장 가능성

### Future Enhancements
1. **게임화 요소**
   - 리더보드 및 순위표
   - 배지/업적 시스템
   - 연속 참여 보너스 (스트릭)

2. **협력 학습**
   - 팀 퀴즈 (그룹 보상)
   - 친구 대결 모드
   - 학급 vs 학급 대항전

3. **AI 기능**
   - 자동 문제 생성 (Gemini API)
   - 개인 맞춤 난이도 조정
   - 약점 분석 및 추천 학습

4. **멀티미디어 문제**
   - 이미지 기반 문제
   - 오디오 듣기 문제
   - 비디오 시청 후 퀴즈

---

## ✅ 체크리스트

### MVP 출시 전 필수 사항
- [ ] 데이터베이스 스키마 마이그레이션
- [ ] 퀴즈 CRUD API 구현 및 테스트
- [ ] 교사 퀴즈 생성 UI
- [ ] 학생 퀴즈 참여 UI
- [ ] 보상 지급 로직 테스트
- [ ] 알림 시스템 구현
- [ ] Vercel Cron 설정 및 테스트
- [ ] 보안 취약점 점검
- [ ] 성능 테스트 (동시 접속 시뮬레이션)

### Phase 2 출시 전
- [ ] 이메일 알림 통합
- [ ] 문제 은행 기능
- [ ] 고급 통계 대시보드
- [ ] CSV 문제 업로드 기능

---

## 📝 결론

이 시스템은 **교육적 가치와 경제 시뮬레이션을 결합**하여 학생들의 학습 동기를 극대화하는 혁신적인 플랫폼입니다.

**핵심 장점**:
1. ✅ **자동화**: 교사의 수동 작업 최소화
2. ✅ **즉각적 보상**: 학습 동기 부여 강화
3. ✅ **데이터 기반**: 학습 성과 추적 및 분석
4. ✅ **확장 가능**: 다양한 과목 및 유형으로 확장 가능

**다음 단계**: MVP 개발 시작 (데이터베이스 스키마 생성부터)
