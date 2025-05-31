-- RLS 정책 수정 스크립트
-- Supabase Auth 대신 일반적인 접근 정책으로 변경

-- 기존 RLS 정책 모두 삭제
DROP POLICY IF EXISTS "Teachers can only access their own data" ON teachers;
DROP POLICY IF EXISTS "Students can only access their teacher's data" ON students;
DROP POLICY IF EXISTS "Accounts are accessible by student owner" ON accounts;
DROP POLICY IF EXISTS "Market assets are accessible by teacher" ON market_assets;
DROP POLICY IF EXISTS "Portfolio is accessible by student owner" ON portfolio;
DROP POLICY IF EXISTS "Transactions are accessible by student owner" ON transactions;
DROP POLICY IF EXISTS "Loans are accessible by student owner" ON loans;
DROP POLICY IF EXISTS "Economic entities are accessible by teacher" ON economic_entities;
DROP POLICY IF EXISTS "Real estate is accessible by teacher" ON real_estate;

-- RLS 비활성화 (일단 개발 단계에서는 비활성화)
ALTER TABLE teachers DISABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE students DISABLE ROW LEVEL SECURITY;
ALTER TABLE accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE market_assets DISABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE loans DISABLE ROW LEVEL SECURITY;
ALTER TABLE economic_entities DISABLE ROW LEVEL SECURITY;
ALTER TABLE real_estate DISABLE ROW LEVEL SECURITY;

-- 개발 완료 후 다시 활성화할 예정
SELECT 'RLS 정책이 임시로 비활성화되었습니다. 개발 완료 후 다시 활성화할 예정입니다.' as message;