-- 베타 테스트 분석을 위한 추가 테이블들

-- 1. 교사 세션 추적 테이블
CREATE TABLE IF NOT EXISTS teacher_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  session_token VARCHAR(255) NOT NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expired_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true
);

-- 2. 학생 활동 로그 테이블
CREATE TABLE IF NOT EXISTS student_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  activity_type VARCHAR(50) NOT NULL, -- 'login', 'transaction', 'investment', 'logout'
  activity_details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 시스템 성능 로그 테이블
CREATE TABLE IF NOT EXISTS system_performance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint VARCHAR(255) NOT NULL,
  method VARCHAR(10) NOT NULL,
  response_time_ms INTEGER NOT NULL,
  status_code INTEGER NOT NULL,
  error_message TEXT,
  user_type VARCHAR(20), -- 'teacher' or 'student'
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 일간 통계 집계 테이블 (성능 향상을 위한 미리 계산된 통계)
CREATE TABLE IF NOT EXISTS daily_statistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  total_teachers INTEGER NOT NULL DEFAULT 0,
  total_students INTEGER NOT NULL DEFAULT 0,
  new_teachers INTEGER NOT NULL DEFAULT 0,
  new_students INTEGER NOT NULL DEFAULT 0,
  active_teachers INTEGER NOT NULL DEFAULT 0,
  active_students INTEGER NOT NULL DEFAULT 0,
  total_transactions INTEGER NOT NULL DEFAULT 0,
  transaction_volume BIGINT NOT NULL DEFAULT 0,
  avg_response_time_ms NUMERIC(10,2),
  error_rate NUMERIC(5,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. 베타 테스트 피드백 테이블
CREATE TABLE IF NOT EXISTS beta_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
  feedback_type VARCHAR(50) NOT NULL, -- 'bug', 'feature_request', 'improvement', 'positive'
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  status VARCHAR(20) DEFAULT 'open', -- 'open', 'in_progress', 'resolved', 'closed'
  browser_info JSONB,
  attachments JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_teacher_sessions_teacher_id ON teacher_sessions(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_sessions_last_activity ON teacher_sessions(last_activity);
CREATE INDEX IF NOT EXISTS idx_teacher_sessions_is_active ON teacher_sessions(is_active);

CREATE INDEX IF NOT EXISTS idx_student_activity_logs_student_id ON student_activity_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_student_activity_logs_teacher_id ON student_activity_logs(teacher_id);
CREATE INDEX IF NOT EXISTS idx_student_activity_logs_activity_type ON student_activity_logs(activity_type);
CREATE INDEX IF NOT EXISTS idx_student_activity_logs_created_at ON student_activity_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_system_performance_logs_endpoint ON system_performance_logs(endpoint);
CREATE INDEX IF NOT EXISTS idx_system_performance_logs_created_at ON system_performance_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_system_performance_logs_status_code ON system_performance_logs(status_code);

CREATE INDEX IF NOT EXISTS idx_daily_statistics_date ON daily_statistics(date);

CREATE INDEX IF NOT EXISTS idx_beta_feedback_teacher_id ON beta_feedback(teacher_id);
CREATE INDEX IF NOT EXISTS idx_beta_feedback_status ON beta_feedback(status);
CREATE INDEX IF NOT EXISTS idx_beta_feedback_priority ON beta_feedback(priority);

-- 일간 통계 자동 계산 함수
CREATE OR REPLACE FUNCTION calculate_daily_statistics(target_date DATE DEFAULT CURRENT_DATE)
RETURNS VOID AS $$
BEGIN
  INSERT INTO daily_statistics (
    date,
    total_teachers,
    total_students,
    new_teachers,
    new_students,
    active_teachers,
    active_students,
    total_transactions,
    transaction_volume,
    avg_response_time_ms,
    error_rate
  )
  SELECT
    target_date,
    (SELECT COUNT(*) FROM teachers WHERE DATE(created_at) <= target_date),
    (SELECT COUNT(*) FROM students WHERE DATE(created_at) <= target_date),
    (SELECT COUNT(*) FROM teachers WHERE DATE(created_at) = target_date),
    (SELECT COUNT(*) FROM students WHERE DATE(created_at) = target_date),
    (SELECT COUNT(DISTINCT teacher_id) FROM teacher_sessions WHERE DATE(last_activity) = target_date),
    (SELECT COUNT(DISTINCT student_id) FROM student_activity_logs WHERE DATE(created_at) = target_date),
    (SELECT COUNT(*) FROM transactions WHERE DATE(created_at) = target_date),
    (SELECT COALESCE(SUM(ABS(amount)), 0) FROM transactions WHERE DATE(created_at) = target_date),
    (SELECT AVG(response_time_ms) FROM system_performance_logs WHERE DATE(created_at) = target_date),
    (SELECT 
      CASE 
        WHEN COUNT(*) > 0 THEN (COUNT(*) FILTER (WHERE status_code >= 400)::NUMERIC / COUNT(*) * 100)
        ELSE 0 
      END
      FROM system_performance_logs WHERE DATE(created_at) = target_date
    )
  ON CONFLICT (date) DO UPDATE SET
    total_teachers = EXCLUDED.total_teachers,
    total_students = EXCLUDED.total_students,
    new_teachers = EXCLUDED.new_teachers,
    new_students = EXCLUDED.new_students,
    active_teachers = EXCLUDED.active_teachers,
    active_students = EXCLUDED.active_students,
    total_transactions = EXCLUDED.total_transactions,
    transaction_volume = EXCLUDED.transaction_volume,
    avg_response_time_ms = EXCLUDED.avg_response_time_ms,
    error_rate = EXCLUDED.error_rate,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- 매일 자동으로 통계 계산하는 트리거 함수 (실제로는 cron job으로 실행 권장)
-- SELECT calculate_daily_statistics(); -- 오늘 통계 계산
-- SELECT calculate_daily_statistics('2024-12-01'); -- 특정 날짜 통계 계산