-- RichStudent 데이터베이스 스키마 생성
-- Supabase SQL Editor에서 실행하세요

-- 1. teachers 테이블 생성
CREATE TABLE IF NOT EXISTS teachers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  school VARCHAR(255),
  password_hash VARCHAR(255),
  session_code VARCHAR(10) UNIQUE,
  plan VARCHAR(20) DEFAULT 'free',
  student_limit INTEGER DEFAULT 30,
  auth_provider VARCHAR(20) DEFAULT 'email',
  google_id VARCHAR(255),
  profile_image_url TEXT,
  email_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. teacher_sessions 테이블 생성
CREATE TABLE IF NOT EXISTS teacher_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
  session_token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. students 테이블 생성
CREATE TABLE IF NOT EXISTS students (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  student_code VARCHAR(50) NOT NULL,
  password VARCHAR(255),
  credit_score INTEGER DEFAULT 700,
  weekly_allowance INTEGER DEFAULT 10000,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(teacher_id, student_code)
);

-- 4. accounts 테이블 생성
CREATE TABLE IF NOT EXISTS accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  account_type VARCHAR(20) NOT NULL, -- 'checking', 'savings', 'investment'
  balance DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(student_id, account_type)
);

-- 5. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_teachers_email ON teachers(email);
CREATE INDEX IF NOT EXISTS idx_teachers_session_code ON teachers(session_code);
CREATE INDEX IF NOT EXISTS idx_teacher_sessions_token ON teacher_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_teacher_sessions_teacher_id ON teacher_sessions(teacher_id);
CREATE INDEX IF NOT EXISTS idx_students_teacher_id ON students(teacher_id);
CREATE INDEX IF NOT EXISTS idx_students_code ON students(student_code);
CREATE INDEX IF NOT EXISTS idx_accounts_student_id ON accounts(student_id);

-- 6. RLS (Row Level Security) 정책 설정
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

-- 개발 중에는 모든 접근 허용 (나중에 수정 필요)
CREATE POLICY "Allow all for development" ON teachers FOR ALL USING (true);
CREATE POLICY "Allow all for development" ON teacher_sessions FOR ALL USING (true);
CREATE POLICY "Allow all for development" ON students FOR ALL USING (true);
CREATE POLICY "Allow all for development" ON accounts FOR ALL USING (true);

-- 완료 확인
SELECT 'Database schema created successfully!' as status;