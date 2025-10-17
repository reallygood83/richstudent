# 간소화된 퀴즈 보상 시스템 설계 (AI 자동 생성)

## 🎯 핵심 개념

**교사 부담 최소화** + **AI 자동화** + **간단한 일일 퀴즈**

### 주요 특징
- ✅ AI(Gemini)가 매일 자동으로 퀴즈 생성
- ✅ 교사는 간단한 설정만 확인
- ✅ 학생은 하루 최대 10,000원 획득 가능
- ✅ 1문제 또는 5문제 중 선택

---

## 💰 보상 구조

### 옵션 1: 짧은 퀴즈 (1문제, 하루 여러 번)
```
참여 횟수: 하루 최대 5회
문제 개수: 1문제
정답 보상: 2,000원

시나리오:
- 1회차 정답: 2,000원 획득
- 2회차 정답: 2,000원 획득
- 3회차 정답: 2,000원 획득
- 4회차 정답: 2,000원 획득
- 5회차 정답: 2,000원 획득
= 총 10,000원 (하루 최대)
```

### 옵션 2: 긴 퀴즈 (5문제, 하루 1회)
```
참여 횟수: 하루 1회
문제 개수: 5문제
보상 구조:
- 참여 보상: 1,000원 (무조건)
- 정답 1개당: 1,500원
- 만점 보너스: 1,500원

시나리오:
- 5문제 중 3개 정답: 1,000 + (1,500 × 3) = 5,500원
- 5문제 중 4개 정답: 1,000 + (1,500 × 4) = 7,000원
- 5문제 전부 정답: 1,000 + (1,500 × 5) + 1,500 = 10,000원
```

---

## 🤖 AI 자동 퀴즈 생성

### Gemini API 프롬프트 예시

**영어 단어 퀴즈:**
```typescript
const prompt = `
초등학생을 위한 영어 단어 문제 ${questionCount}개를 생성해주세요.

요구사항:
1. 난이도: 쉬움 (초등 3-4학년 수준)
2. 형식: 객관식 4지선다
3. 주제: 일상생활 관련 영어 단어

응답 형식 (JSON):
{
  "questions": [
    {
      "question": "다음 중 '사과'를 영어로 옳게 쓴 것은?",
      "options": ["Apple", "Banana", "Orange", "Grape"],
      "correct_answer": "Apple",
      "explanation": "사과는 영어로 Apple입니다."
    }
  ]
}
`;
```

**한자 퀴즈:**
```typescript
const prompt = `
초등학생을 위한 한자 문제 ${questionCount}개를 생성해주세요.

요구사항:
1. 난이도: 8급 수준 (쉬운 한자)
2. 형식: 객관식 4지선다
3. 주제: 숫자, 방향, 가족 관련 한자

응답 형식 (JSON):
{
  "questions": [
    {
      "question": "다음 한자의 뜻으로 옳은 것은? 一",
      "options": ["하나", "둘", "셋", "넷"],
      "correct_answer": "하나",
      "explanation": "一(일)은 '하나'라는 뜻입니다."
    }
  ]
}
`;
```

**사자성어 퀴즈:**
```typescript
const prompt = `
초등학생을 위한 사자성어 문제 ${questionCount}개를 생성해주세요.

요구사항:
1. 난이도: 쉬움 (자주 쓰이는 사자성어)
2. 형식: 객관식 4지선다
3. 주제: 교훈, 생활 관련 사자성어

응답 형식 (JSON):
{
  "questions": [
    {
      "question": "'일석이조'의 뜻으로 옳은 것은?",
      "options": [
        "한 가지 일로 두 가지 이익을 얻음",
        "돌 하나로 새 두 마리를 잡음",
        "한 번에 두 가지를 얻음",
        "위 모두 정답"
      ],
      "correct_answer": "위 모두 정답",
      "explanation": "일석이조는 '돌 하나로 새 두 마리를 잡는다'는 뜻으로, 한 가지 일로 두 가지 이익을 얻는다는 의미입니다."
    }
  ]
}
`;
```

---

## 📊 간소화된 데이터베이스 스키마

### 필요한 테이블 (3개만)

```sql
-- 1. 퀴즈 설정 테이블 (교사별 설정)
CREATE TABLE quiz_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,

    -- 퀴즈 기본 설정
    quiz_type VARCHAR(20) NOT NULL CHECK (quiz_type IN ('english', 'chinese', 'idiom')),
    questions_per_quiz INTEGER DEFAULT 1 CHECK (questions_per_quiz IN (1, 5)),

    -- 스케줄
    daily_open_time TIME DEFAULT '08:00',
    max_attempts_per_day INTEGER DEFAULT 5,

    -- 보상 설정 (자동 계산)
    daily_max_reward DECIMAL(10,2) DEFAULT 10000,

    -- 상태
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(teacher_id) -- 교사당 하나의 설정
);

-- 2. 일일 퀴즈 테이블 (AI가 생성한 퀴즈)
CREATE TABLE daily_quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,

    -- 퀴즈 정보
    quiz_date DATE NOT NULL,
    quiz_type VARCHAR(20) NOT NULL,
    questions JSONB NOT NULL, -- AI가 생성한 문제들 (JSON 배열)

    -- 메타
    generated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(teacher_id, quiz_date) -- 하루에 하나만
);

-- 3. 학생 퀴즈 응시 기록 (간소화)
CREATE TABLE student_quiz_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    daily_quiz_id UUID NOT NULL REFERENCES daily_quizzes(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,

    -- 응시 정보
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,

    -- 점수
    total_questions INTEGER NOT NULL,
    correct_answers INTEGER DEFAULT 0,

    -- 보상
    reward_amount DECIMAL(10,2) DEFAULT 0,
    reward_paid BOOLEAN DEFAULT false,
    reward_paid_at TIMESTAMPTZ,

    -- 응답 (JSON으로 저장)
    answers JSONB, -- [{"question_index": 0, "student_answer": "Apple", "is_correct": true}]

    -- 상태
    attempt_number INTEGER DEFAULT 1, -- 오늘의 몇 번째 시도인지

    UNIQUE(daily_quiz_id, student_id, attempt_number)
);

-- 인덱스
CREATE INDEX idx_daily_quizzes_teacher_date ON daily_quizzes(teacher_id, quiz_date);
CREATE INDEX idx_student_attempts_student_date ON student_quiz_attempts(student_id, started_at);
CREATE INDEX idx_student_attempts_reward ON student_quiz_attempts(reward_paid) WHERE reward_paid = false;
```

---

## 🔄 자동화 프로세스

### 1. 매일 퀴즈 자동 생성 (Cron Job)

**Vercel Cron: `/api/cron/generate-daily-quiz`**
- 실행 시간: 매일 오전 7시
- 작업: 모든 활성 교사의 설정을 읽고 AI로 퀴즈 생성

```typescript
// /src/app/api/cron/generate-daily-quiz/route.ts
export async function GET(request: Request) {
  // 1. 활성 교사 설정 조회
  const { data: settings } = await supabase
    .from('quiz_settings')
    .select('*')
    .eq('is_active', true)

  for (const setting of settings) {
    // 2. 오늘 이미 생성되었는지 체크
    const today = new Date().toISOString().split('T')[0]
    const { data: existing } = await supabase
      .from('daily_quizzes')
      .select('id')
      .eq('teacher_id', setting.teacher_id)
      .eq('quiz_date', today)
      .single()

    if (existing) continue // 이미 생성됨

    // 3. Gemini API로 문제 생성
    const questions = await generateQuizWithGemini(
      setting.quiz_type,
      setting.questions_per_quiz
    )

    // 4. 데이터베이스에 저장
    await supabase
      .from('daily_quizzes')
      .insert({
        teacher_id: setting.teacher_id,
        quiz_date: today,
        quiz_type: setting.quiz_type,
        questions: questions
      })
  }

  return Response.json({ success: true })
}
```

### 2. 보상 자동 지급 (Cron Job)

**Vercel Cron: `/api/cron/pay-quiz-rewards`**
- 실행 시간: 매시간 (또는 15분마다)
- 작업: 완료된 퀴즈의 보상 자동 지급

```typescript
// /src/app/api/cron/pay-quiz-rewards/route.ts
export async function GET(request: Request) {
  // 1. 보상 미지급 응시 기록 조회
  const { data: unpaidAttempts } = await supabase
    .from('student_quiz_attempts')
    .select(`
      id,
      student_id,
      reward_amount,
      students!inner(teacher_id, student_code, name)
    `)
    .eq('reward_paid', false)
    .not('completed_at', 'is', null)

  for (const attempt of unpaidAttempts) {
    // 2. 학생 계좌 업데이트
    await supabase.rpc('update_account_balance', {
      p_student_id: attempt.student_id,
      p_account_type: 'checking',
      p_amount: attempt.reward_amount
    })

    // 3. 거래 기록 생성
    await supabase
      .from('transactions')
      .insert({
        from_entity: 'system',
        to_student_id: attempt.student_id,
        transaction_type: 'quiz_reward',
        amount: attempt.reward_amount,
        to_account_type: 'checking',
        description: '퀴즈 보상',
        status: 'completed'
      })

    // 4. 보상 지급 완료 표시
    await supabase
      .from('student_quiz_attempts')
      .update({
        reward_paid: true,
        reward_paid_at: new Date().toISOString()
      })
      .eq('id', attempt.id)
  }

  return Response.json({ success: true })
}
```

---

## 🎮 사용자 인터페이스

### 교사 설정 페이지 (초간단)

**`/teacher/quiz-settings`**

```tsx
// 간단한 4가지 설정만
<form>
  <select name="quiz_type">
    <option value="english">영어 단어</option>
    <option value="chinese">한자</option>
    <option value="idiom">사자성어</option>
  </select>

  <select name="questions_per_quiz">
    <option value="1">1문제 (하루 5회)</option>
    <option value="5">5문제 (하루 1회)</option>
  </select>

  <input type="time" name="daily_open_time" defaultValue="08:00" />

  <input type="number" name="daily_max_reward" defaultValue={10000} />

  <button type="submit">설정 저장</button>
</form>

// 설정 저장 후 자동으로 매일 퀴즈가 생성됨!
```

### 학생 퀴즈 페이지 (자동 표시)

**`/student/daily-quiz`**

```tsx
// 오늘의 퀴즈 자동 로드
function DailyQuizPage() {
  // 1. 오늘의 퀴즈 가져오기
  const { data: todayQuiz } = await supabase
    .from('daily_quizzes')
    .select('*')
    .eq('teacher_id', student.teacher_id)
    .eq('quiz_date', today)
    .single()

  // 2. 이미 응시했는지 체크
  const { data: attempts, count } = await supabase
    .from('student_quiz_attempts')
    .select('*', { count: 'exact' })
    .eq('daily_quiz_id', todayQuiz.id)
    .eq('student_id', student.id)

  // 3. 오늘 획득한 총 보상 계산
  const todayEarnings = attempts?.reduce((sum, a) => sum + a.reward_amount, 0) || 0

  return (
    <div>
      <h1>오늘의 퀴즈 🎯</h1>
      <p>오늘 획득한 금액: {todayEarnings.toLocaleString()}원 / 10,000원</p>
      <p>남은 기회: {maxAttempts - count}회</p>

      {/* 퀴즈 문제 표시 */}
      <QuizQuestions questions={todayQuiz.questions} />

      {/* 제출 버튼 */}
      <button onClick={handleSubmit}>제출하기</button>
    </div>
  )
}
```

---

## 📊 보상 계산 로직

### 자동 계산 함수

```typescript
// 보상 자동 계산
function calculateReward(
  questionCount: number,
  correctAnswers: number,
  maxDailyReward: number
): number {
  if (questionCount === 1) {
    // 1문제 퀴즈: 정답이면 2,000원
    return correctAnswers === 1 ? 2000 : 0
  } else {
    // 5문제 퀴즈
    const participationReward = 1000
    const perCorrectReward = 1500
    const perfectBonus = 1500

    let total = participationReward
    total += correctAnswers * perCorrectReward

    if (correctAnswers === questionCount) {
      total += perfectBonus
    }

    return total
  }
}

// 일일 한도 체크
async function checkDailyLimit(studentId: string, newReward: number): Promise<boolean> {
  const today = new Date().toISOString().split('T')[0]

  // 오늘 이미 받은 보상 합계
  const { data: attempts } = await supabase
    .from('student_quiz_attempts')
    .select('reward_amount')
    .eq('student_id', studentId)
    .gte('started_at', today)

  const todayTotal = attempts?.reduce((sum, a) => sum + a.reward_amount, 0) || 0

  // 10,000원 초과 방지
  return (todayTotal + newReward) <= 10000
}
```

---

## 🚀 구현 순서

### Phase 1 (1주) - 기본 시스템
- [ ] 데이터베이스 스키마 적용
- [ ] Gemini API 연동 (퀴즈 생성)
- [ ] 교사 설정 페이지 (간단)
- [ ] 학생 퀴즈 응시 페이지

### Phase 2 (1주) - 자동화
- [ ] Vercel Cron Jobs 설정
- [ ] 매일 퀴즈 자동 생성 (`/api/cron/generate-daily-quiz`)
- [ ] 보상 자동 지급 (`/api/cron/pay-quiz-rewards`)
- [ ] 일일 한도 체크 로직

### Phase 3 (선택) - 개선
- [ ] 퀴즈 결과 통계 대시보드
- [ ] 학생별 성적 추이 그래프
- [ ] 이메일 알림 (선택적)

---

## 💡 핵심 장점

1. **교사 부담 제로**: 설정 한 번만 하면 끝
2. **AI 자동화**: 매일 새로운 문제 자동 생성
3. **간단한 구조**: 테이블 3개, API 4개로 완성
4. **명확한 보상**: 하루 최대 10,000원
5. **즉시 지급**: 퀴즈 완료 후 자동 입금

---

## 🔧 필요한 환경 변수

```env
# .env.local
GEMINI_API_KEY=your_gemini_api_key_here
```

---

## ✅ 체크리스트

- [x] 문제 은행 제거 (교사 부담 감소)
- [x] AI 자동 문제 생성 (Gemini API)
- [x] 간단한 퀴즈 (1문제 또는 5문제)
- [x] 일일 최대 보상 10,000원
- [x] 자동화 프로세스 (Cron Jobs)
- [x] 간소화된 데이터베이스 (3개 테이블)
