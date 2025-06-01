-- ====================================================
-- 빠른 진단: 투자 모니터링 문제 확인
-- ====================================================

-- 1. 교사 세션 테이블 확인
SELECT 'teacher_sessions 테이블 확인' AS check_name;
SELECT COUNT(*) as count FROM teacher_sessions;
SELECT session_token, teacher_id, expires_at FROM teacher_sessions ORDER BY created_at DESC LIMIT 3;

-- 2. 학생 테이블 확인  
SELECT '학생 테이블 확인' AS check_name;
SELECT COUNT(*) as student_count FROM students;
SELECT id, teacher_id, name, student_code FROM students LIMIT 5;

-- 3. 계좌 테이블 확인
SELECT '계좌 테이블 확인' AS check_name;
SELECT COUNT(*) as account_count FROM accounts;
SELECT student_id, account_type, balance FROM accounts LIMIT 10;

-- 4. 포트폴리오 테이블 확인
SELECT '포트폴리오 테이블 확인' AS check_name;
SELECT COUNT(*) as portfolio_count FROM portfolio;

-- 5. 시장 자산 테이블 확인
SELECT '시장 자산 테이블 확인' AS check_name;
SELECT COUNT(*) as asset_count FROM market_assets;
SELECT symbol, name, current_price FROM market_assets WHERE is_active = true LIMIT 5;

-- 6. 빠른 테스트 데이터 생성 (필요시)
-- 만약 데이터가 없다면 아래 주석을 해제하고 실행

/*
-- 테스트 교사 생성
INSERT INTO teachers (id, name, email, password_hash, session_code, plan, student_limit) 
VALUES (
  'test-teacher-id', 
  '김선생', 
  'test@teacher.com', 
  'hash123', 
  'TEST123', 
  'basic', 
  30
) ON CONFLICT (id) DO NOTHING;

-- 테스트 교사 세션 생성
INSERT INTO teacher_sessions (teacher_id, session_token, expires_at)
VALUES (
  'test-teacher-id',
  'test-session-token-123',
  NOW() + INTERVAL '24 hours'
) ON CONFLICT (session_token) DO NOTHING;

-- 테스트 학생 생성
INSERT INTO students (id, teacher_id, name, student_code, credit_score) 
VALUES 
  ('student-1', 'test-teacher-id', '김학생', 'S001', 700),
  ('student-2', 'test-teacher-id', '이학생', 'S002', 750)
ON CONFLICT (id) DO NOTHING;

-- 테스트 계좌 생성
INSERT INTO accounts (student_id, account_type, balance) 
VALUES 
  ('student-1', 'checking', 100000),
  ('student-1', 'savings', 50000),
  ('student-1', 'investment', 200000),
  ('student-2', 'checking', 80000),
  ('student-2', 'savings', 30000),
  ('student-2', 'investment', 150000)
ON CONFLICT (student_id, account_type) DO NOTHING;
*/