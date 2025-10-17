-- Quiz Reward System Database Schema
-- Phase 1: MVP Implementation
-- 학생 퀴즈 학습 및 보상 시스템

-- 1. 퀴즈 메타데이터 테이블
CREATE TABLE IF NOT EXISTS quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,

    -- 퀴즈 기본 정보
    quiz_type VARCHAR(20) NOT NULL CHECK (quiz_type IN ('english', 'chinese', 'idiom')),
    title VARCHAR(200) NOT NULL,
    description TEXT,

    -- 스케줄링 정보
    schedule_type VARCHAR(20) NOT NULL CHECK (schedule_type IN ('one_time', 'daily', 'weekly')),
    scheduled_time TIME NOT NULL, -- 예: '09:00'
    scheduled_days INTEGER[], -- 요일 배열 [1,2,3,4,5] (월~금)
    start_date DATE,
    end_date DATE,

    -- 보상 설정
    participation_reward DECIMAL(10,2) DEFAULT 0, -- 참여만 해도 주는 보상
    correct_answer_reward DECIMAL(10,2) DEFAULT 0, -- 정답 1개당 보상
    perfect_score_bonus DECIMAL(10,2) DEFAULT 0, -- 만점 보너스

    -- 퀴즈 제한 사항
    time_limit_minutes INTEGER DEFAULT 10,
    max_attempts INTEGER DEFAULT 1,

    -- 상태 관리
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 퀴즈 문제 테이블
CREATE TABLE IF NOT EXISTS quiz_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,

    -- 문제 정보
    question_type VARCHAR(20) NOT NULL CHECK (question_type IN ('multiple_choice', 'short_answer')),
    question_text TEXT NOT NULL,

    -- 선택지 (객관식인 경우)
    option_a TEXT,
    option_b TEXT,
    option_c TEXT,
    option_d TEXT,

    -- 정답
    correct_answer TEXT NOT NULL,

    -- 추가 정보
    explanation TEXT, -- 해설
    difficulty VARCHAR(20) DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
    points INTEGER DEFAULT 10,

    -- 순서 및 메타
    order_number INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 퀴즈 응시 기록 테이블
CREATE TABLE IF NOT EXISTS quiz_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,

    -- 응시 정보
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    time_spent_seconds INTEGER,

    -- 점수 정보
    total_questions INTEGER NOT NULL,
    correct_answers INTEGER DEFAULT 0,
    score DECIMAL(5,2), -- 100점 만점 기준
    max_score DECIMAL(5,2), -- 만점 기준

    -- 보상 정보
    participation_reward_paid DECIMAL(10,2) DEFAULT 0,
    score_reward_paid DECIMAL(10,2) DEFAULT 0,
    bonus_reward_paid DECIMAL(10,2) DEFAULT 0,
    total_reward_paid DECIMAL(10,2) DEFAULT 0,
    reward_paid_at TIMESTAMPTZ,

    -- 상태
    status VARCHAR(20) DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
    attempt_number INTEGER DEFAULT 1
);

-- 4. 퀴즈 응답 상세 테이블
CREATE TABLE IF NOT EXISTS quiz_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID NOT NULL REFERENCES quiz_attempts(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,

    -- 응답 정보
    student_answer TEXT,
    is_correct BOOLEAN,
    points_earned INTEGER DEFAULT 0,

    -- 시간 정보
    answered_at TIMESTAMPTZ DEFAULT NOW(),
    time_spent_seconds INTEGER
);

-- 5. 알림 테이블
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,

    -- 알림 정보
    notification_type VARCHAR(30) NOT NULL CHECK (notification_type IN ('quiz_available', 'quiz_reminder', 'reward_paid', 'quiz_result')),
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,

    -- 관련 데이터
    quiz_id UUID REFERENCES quizzes(id) ON DELETE SET NULL,
    attempt_id UUID REFERENCES quiz_attempts(id) ON DELETE SET NULL,

    -- 상태
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. 문제 은행 테이블 (재사용 가능한 문제 라이브러리)
CREATE TABLE IF NOT EXISTS question_banks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,

    -- 은행 정보
    name VARCHAR(200) NOT NULL,
    description TEXT,
    question_type VARCHAR(20) NOT NULL CHECK (question_type IN ('english', 'chinese', 'idiom')),

    -- 메타데이터
    total_questions INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. 문제 은행 아이템 테이블
CREATE TABLE IF NOT EXISTS question_bank_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_id UUID NOT NULL REFERENCES question_banks(id) ON DELETE CASCADE,

    -- 문제 정보 (quiz_questions와 동일한 구조)
    question_type VARCHAR(20) NOT NULL CHECK (question_type IN ('multiple_choice', 'short_answer')),
    question_text TEXT NOT NULL,

    -- 선택지
    option_a TEXT,
    option_b TEXT,
    option_c TEXT,
    option_d TEXT,

    -- 정답 및 해설
    correct_answer TEXT NOT NULL,
    explanation TEXT,
    difficulty VARCHAR(20) DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),

    -- 통계 (선택적)
    times_used INTEGER DEFAULT 0,
    average_score DECIMAL(5,2),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_quizzes_teacher_id ON quizzes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_schedule ON quizzes(schedule_type, scheduled_time) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz_id ON quiz_questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_student ON quiz_attempts(quiz_id, student_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_status ON quiz_attempts(status);
CREATE INDEX IF NOT EXISTS idx_quiz_answers_attempt_id ON quiz_answers(attempt_id);
CREATE INDEX IF NOT EXISTS idx_notifications_student_id ON notifications(student_id, is_read);
CREATE INDEX IF NOT EXISTS idx_question_banks_teacher_id ON question_banks(teacher_id);
CREATE INDEX IF NOT EXISTS idx_question_bank_items_bank_id ON question_bank_items(bank_id);

-- 트리거: 퀴즈 수정 시 updated_at 자동 업데이트
CREATE OR REPLACE FUNCTION update_quiz_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER quiz_updated_at_trigger
    BEFORE UPDATE ON quizzes
    FOR EACH ROW
    EXECUTE FUNCTION update_quiz_updated_at();

-- 트리거: 문제 은행 아이템 수 자동 업데이트
CREATE OR REPLACE FUNCTION update_question_bank_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE question_banks
        SET total_questions = total_questions + 1,
            updated_at = NOW()
        WHERE id = NEW.bank_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE question_banks
        SET total_questions = total_questions - 1,
            updated_at = NOW()
        WHERE id = OLD.bank_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER question_bank_count_trigger
    AFTER INSERT OR DELETE ON question_bank_items
    FOR EACH ROW
    EXECUTE FUNCTION update_question_bank_count();

-- 샘플 데이터 (개발/테스트용)
-- 실제 운영에서는 주석 처리하거나 별도 파일로 분리

-- COMMENT: 샘플 교사 ID는 실제 teachers 테이블의 ID로 교체 필요
-- COMMENT: 샘플 학생 ID는 실제 students 테이블의 ID로 교체 필요
