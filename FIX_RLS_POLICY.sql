-- RLS 정책 문제 해결
-- 기존 정책을 삭제하고 새로운 개발용 정책 적용

-- 1. 기존 정책 모두 삭제
DROP POLICY IF EXISTS "Allow all for development" ON teachers;
DROP POLICY IF EXISTS "Allow all for development" ON teacher_sessions;
DROP POLICY IF EXISTS "Allow all for development" ON students;
DROP POLICY IF EXISTS "Allow all for development" ON accounts;

-- 기존에 있을 수 있는 다른 정책들도 삭제
DROP POLICY IF EXISTS "Users can view own data" ON teachers;
DROP POLICY IF EXISTS "Users can insert own data" ON teachers;
DROP POLICY IF EXISTS "Users can update own data" ON teachers;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON teachers;
DROP POLICY IF EXISTS "Enable select for authenticated users only" ON teachers;

-- 2. RLS 비활성화 (개발 중)
ALTER TABLE teachers DISABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE students DISABLE ROW LEVEL SECURITY;
ALTER TABLE accounts DISABLE ROW LEVEL SECURITY;

-- 3. 개발 완료 후에는 다시 RLS 활성화하고 적절한 정책 설정 예정
-- ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE teacher_sessions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE students ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

-- 4. 확인 메시지
SELECT 'RLS policies fixed! All tables now allow unrestricted access for development.' as status;