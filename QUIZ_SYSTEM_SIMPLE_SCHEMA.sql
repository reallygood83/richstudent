-- 간소화된 퀴즈 보상 시스템 - 데이터베이스 스키마
-- AI 자동 생성 기반, 하루 1회 5문제 퀴즈, 최대 10,000원 보상
-- ⭐ Gemini API 키는 news_settings 테이블에서 가져옴 (재활용) ⭐

-- ============================================
-- 1. 퀴즈 설정 테이블 (교사별 간단한 설정)
-- ============================================
CREATE TABLE IF NOT EXISTS quiz_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,

    -- 퀴즈 기본 설정
    quiz_type VARCHAR(20) NOT NULL CHECK (quiz_type IN ('english', 'chinese', 'idiom')),
    questions_per_quiz INTEGER DEFAULT 5 CHECK (questions_per_quiz = 5), -- 항상 5문제

    -- 스케줄 설정
    daily_open_time TIME DEFAULT '08:00', -- 매일 퀴즈 오픈 시간
    max_attempts_per_day INTEGER DEFAULT 1, -- 하루 최대 응시 횟수 (항상 1)

    -- 보상 설정
    participation_reward DECIMAL(10,2) DEFAULT 1000, -- 참여 보상
    correct_answer_reward DECIMAL(10,2) DEFAULT 1500, -- 정답당 보상
    perfect_score_bonus DECIMAL(10,2) DEFAULT 1500, -- 만점 보너스
    daily_max_reward DECIMAL(10,2) DEFAULT 10000, -- 일일 최대 보상

    -- 상태
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(teacher_id) -- 교사당 하나의 설정만
);

-- ============================================
-- 2. 일일 퀴즈 테이블 (AI가 생성한 문제)
-- ============================================
CREATE TABLE IF NOT EXISTS daily_quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,

    -- 퀴즈 메타데이터
    quiz_date DATE NOT NULL, -- 퀴즈 날짜
    quiz_type VARCHAR(20) NOT NULL CHECK (quiz_type IN ('english', 'chinese', 'idiom')),

    -- AI 생성 문제 (JSON 배열)
    questions JSONB NOT NULL, -- [{question, options[], correct_answer, explanation}]

    -- 생성 정보
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    generated_by VARCHAR(50) DEFAULT 'gemini-ai', -- AI 모델 이름

    UNIQUE(teacher_id, quiz_date) -- 하루에 하나만
);

-- questions JSONB 구조 예시:
-- [
--   {
--     "question": "다음 중 '사과'를 영어로 옳게 쓴 것은?",
--     "options": ["Apple", "Banana", "Orange", "Grape"],
--     "correct_answer": "Apple",
--     "explanation": "사과는 영어로 Apple입니다."
--   },
--   {
--     "question": "...",
--     "options": [...],
--     "correct_answer": "...",
--     "explanation": "..."
--   }
-- ]

-- ============================================
-- 3. 학생 퀴즈 응시 기록 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS student_quiz_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    daily_quiz_id UUID NOT NULL REFERENCES daily_quizzes(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,

    -- 응시 시간
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    time_spent_seconds INTEGER, -- 실제 소요 시간

    -- 점수 정보
    total_questions INTEGER NOT NULL DEFAULT 5,
    correct_answers INTEGER DEFAULT 0, -- 맞춘 개수

    -- 보상 정보
    participation_reward DECIMAL(10,2) DEFAULT 0, -- 참여 보상
    score_reward DECIMAL(10,2) DEFAULT 0, -- 정답 보상 합계
    bonus_reward DECIMAL(10,2) DEFAULT 0, -- 만점 보너스
    total_reward DECIMAL(10,2) DEFAULT 0, -- 총 보상액

    reward_paid BOOLEAN DEFAULT false, -- 보상 지급 여부
    reward_paid_at TIMESTAMPTZ, -- 보상 지급 시간

    -- 학생 응답 (JSON 배열)
    answers JSONB, -- [{"question_index": 0, "student_answer": "Apple", "is_correct": true, "points": 1500}]

    -- 상태
    status VARCHAR(20) DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
    attempt_number INTEGER DEFAULT 1, -- 오늘의 몇 번째 시도 (항상 1)

    UNIQUE(daily_quiz_id, student_id, attempt_number)
);

-- answers JSONB 구조 예시:
-- [
--   {
--     "question_index": 0,
--     "question": "다음 중 '사과'를 영어로 옳게 쓴 것은?",
--     "student_answer": "Apple",
--     "correct_answer": "Apple",
--     "is_correct": true,
--     "points_earned": 1500
--   },
--   {
--     "question_index": 1,
--     "question": "...",
--     "student_answer": "...",
--     "correct_answer": "...",
--     "is_correct": false,
--     "points_earned": 0
--   }
-- ]

-- ============================================
-- 인덱스 (성능 최적화)
-- ============================================

-- 퀴즈 설정 조회
CREATE INDEX IF NOT EXISTS idx_quiz_settings_teacher ON quiz_settings(teacher_id);
CREATE INDEX IF NOT EXISTS idx_quiz_settings_active ON quiz_settings(is_active) WHERE is_active = true;

-- 일일 퀴즈 조회
CREATE INDEX IF NOT EXISTS idx_daily_quizzes_teacher_date ON daily_quizzes(teacher_id, quiz_date);
CREATE INDEX IF NOT EXISTS idx_daily_quizzes_date ON daily_quizzes(quiz_date);

-- 학생 응시 기록 조회
CREATE INDEX IF NOT EXISTS idx_student_attempts_quiz ON student_quiz_attempts(daily_quiz_id);
CREATE INDEX IF NOT EXISTS idx_student_attempts_student ON student_quiz_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_student_attempts_student_date ON student_quiz_attempts(student_id, started_at);
CREATE INDEX IF NOT EXISTS idx_student_attempts_unpaid ON student_quiz_attempts(reward_paid, completed_at) WHERE reward_paid = false;

-- ============================================
-- 트리거 함수
-- ============================================

-- 퀴즈 설정 수정 시 updated_at 자동 업데이트
CREATE OR REPLACE FUNCTION update_quiz_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER quiz_settings_updated_at_trigger
    BEFORE UPDATE ON quiz_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_quiz_settings_timestamp();

-- ============================================
-- 보상 계산 함수 (PostgreSQL 함수)
-- ============================================

-- 퀴즈 보상 자동 계산
CREATE OR REPLACE FUNCTION calculate_quiz_reward(
    p_correct_answers INTEGER,
    p_total_questions INTEGER,
    p_participation_reward DECIMAL,
    p_correct_answer_reward DECIMAL,
    p_perfect_score_bonus DECIMAL
)
RETURNS TABLE (
    participation DECIMAL,
    score DECIMAL,
    bonus DECIMAL,
    total DECIMAL
) AS $$
DECLARE
    v_participation DECIMAL := p_participation_reward;
    v_score DECIMAL := p_correct_answers * p_correct_answer_reward;
    v_bonus DECIMAL := 0;
    v_total DECIMAL;
BEGIN
    -- 만점이면 보너스 추가
    IF p_correct_answers = p_total_questions THEN
        v_bonus := p_perfect_score_bonus;
    END IF;

    v_total := v_participation + v_score + v_bonus;

    RETURN QUERY SELECT v_participation, v_score, v_bonus, v_total;
END;
$$ LANGUAGE plpgsql;

-- 사용 예시:
-- SELECT * FROM calculate_quiz_reward(5, 5, 1000, 1500, 1500);
-- => participation: 1000, score: 7500, bonus: 1500, total: 10000

-- ============================================
-- 일일 보상 한도 체크 함수
-- ============================================

CREATE OR REPLACE FUNCTION check_daily_reward_limit(
    p_student_id UUID,
    p_quiz_date DATE,
    p_max_reward DECIMAL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_today_total DECIMAL;
BEGIN
    -- 오늘 이미 받은 보상 합계
    SELECT COALESCE(SUM(total_reward), 0)
    INTO v_today_total
    FROM student_quiz_attempts
    WHERE student_id = p_student_id
      AND DATE(started_at) = p_quiz_date;

    -- 한도 내인지 확인
    RETURN v_today_total < p_max_reward;
END;
$$ LANGUAGE plpgsql;

-- 사용 예시:
-- SELECT check_daily_reward_limit('student-uuid', '2025-01-24', 10000);
-- => true (아직 한도 안 넘음) / false (이미 한도 넘음)

-- ============================================
-- 초기 데이터 (선택적)
-- ============================================

-- 샘플 퀴즈 설정 (실제 teacher_id로 교체 필요)
-- INSERT INTO quiz_settings (teacher_id, quiz_type, is_active)
-- VALUES
--     ('교사-UUID-1', 'english', true),
--     ('교사-UUID-2', 'chinese', true),
--     ('교사-UUID-3', 'idiom', true);

-- ============================================
-- 설명 주석
-- ============================================

COMMENT ON TABLE quiz_settings IS '교사별 퀴즈 설정 (간단한 4가지 설정만)';
COMMENT ON TABLE daily_quizzes IS 'AI가 매일 자동 생성하는 퀴즈 문제 (JSON 형태로 저장)';
COMMENT ON TABLE student_quiz_attempts IS '학생의 퀴즈 응시 기록 및 보상 내역';

COMMENT ON COLUMN quiz_settings.quiz_type IS '퀴즈 종류: english(영어), chinese(한자), idiom(사자성어)';
COMMENT ON COLUMN quiz_settings.daily_open_time IS '매일 퀴즈가 자동 오픈되는 시간';
COMMENT ON COLUMN quiz_settings.participation_reward IS '퀴즈 참여만 해도 주는 기본 보상 (기본값: 1,000원)';
COMMENT ON COLUMN quiz_settings.correct_answer_reward IS '정답 1개당 보상 (기본값: 1,500원)';
COMMENT ON COLUMN quiz_settings.perfect_score_bonus IS '만점 시 추가 보너스 (기본값: 1,500원)';

COMMENT ON COLUMN daily_quizzes.questions IS 'AI가 생성한 5개 문제 (JSONB 배열)';
COMMENT ON COLUMN student_quiz_attempts.answers IS '학생이 제출한 답안 (JSONB 배열)';
COMMENT ON COLUMN student_quiz_attempts.total_reward IS '총 보상액 = 참여보상 + 정답보상 + 보너스 (최대 10,000원)';
