-- RichStudent RLS (Row Level Security) 정책 설정
-- 데이터 보안을 위한 접근 제어

-- ====================
-- 1. RLS 활성화
-- ====================

ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE economic_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE real_estate ENABLE ROW LEVEL SECURITY;

-- ====================
-- 2. 기존 정책 제거 (오류 방지)
-- ====================

DROP POLICY IF EXISTS "Teachers can only access their own data" ON teachers;
DROP POLICY IF EXISTS "Teacher sessions are accessible by owner" ON teacher_sessions;
DROP POLICY IF EXISTS "Students can only access their teacher's data" ON students;
DROP POLICY IF EXISTS "Accounts are accessible by student owner" ON accounts;
DROP POLICY IF EXISTS "Market assets are accessible by teacher" ON market_assets;
DROP POLICY IF EXISTS "Portfolio is accessible by student owner" ON portfolio;
DROP POLICY IF EXISTS "Transactions are accessible by student owner" ON transactions;
DROP POLICY IF EXISTS "Loans are accessible by student owner" ON loans;
DROP POLICY IF EXISTS "Economic entities are accessible by teacher" ON economic_entities;
DROP POLICY IF EXISTS "Real estate is accessible by teacher" ON real_estate;

-- ====================
-- 3. 새로운 RLS 정책 생성
-- ====================

-- 교사는 자신의 데이터만 접근 가능
CREATE POLICY "Teachers can only access their own data" ON teachers
    FOR ALL USING (auth.uid()::text = id::text);

-- 교사 세션은 소유자만 접근 가능
CREATE POLICY "Teacher sessions are accessible by owner" ON teacher_sessions
    FOR ALL USING (teacher_id IN (
        SELECT id FROM teachers WHERE auth.uid()::text = id::text
    ));

-- 학생은 해당 교사의 데이터만 접근 가능
CREATE POLICY "Students can only access their teacher's data" ON students
    FOR ALL USING (teacher_id IN (
        SELECT id FROM teachers WHERE auth.uid()::text = id::text
    ));

-- 계좌는 해당 학생의 데이터만 접근 가능
CREATE POLICY "Accounts are accessible by student owner" ON accounts
    FOR ALL USING (student_id IN (
        SELECT id FROM students WHERE teacher_id IN (
            SELECT id FROM teachers WHERE auth.uid()::text = id::text
        )
    ));

-- 시장 자산은 해당 교사의 데이터만 접근 가능
CREATE POLICY "Market assets are accessible by teacher" ON market_assets
    FOR ALL USING (teacher_id IN (
        SELECT id FROM teachers WHERE auth.uid()::text = id::text
    ));

-- 포트폴리오는 해당 학생의 데이터만 접근 가능
CREATE POLICY "Portfolio is accessible by student owner" ON portfolio
    FOR ALL USING (student_id IN (
        SELECT id FROM students WHERE teacher_id IN (
            SELECT id FROM teachers WHERE auth.uid()::text = id::text
        )
    ));

-- 거래 내역은 해당 학생의 데이터만 접근 가능
CREATE POLICY "Transactions are accessible by student owner" ON transactions
    FOR ALL USING (student_id IN (
        SELECT id FROM students WHERE teacher_id IN (
            SELECT id FROM teachers WHERE auth.uid()::text = id::text
        )
    ));

-- 대출은 해당 학생의 데이터만 접근 가능
CREATE POLICY "Loans are accessible by student owner" ON loans
    FOR ALL USING (student_id IN (
        SELECT id FROM students WHERE teacher_id IN (
            SELECT id FROM teachers WHERE auth.uid()::text = id::text
        )
    ));

-- 경제 주체는 해당 교사의 데이터만 접근 가능
CREATE POLICY "Economic entities are accessible by teacher" ON economic_entities
    FOR ALL USING (teacher_id IN (
        SELECT id FROM teachers WHERE auth.uid()::text = id::text
    ));

-- 부동산은 해당 교사의 데이터만 접근 가능
CREATE POLICY "Real estate is accessible by teacher" ON real_estate
    FOR ALL USING (teacher_id IN (
        SELECT id FROM teachers WHERE auth.uid()::text = id::text
    ));

-- RLS 정책 설정 완료
SELECT 'RichStudent RLS 정책이 성공적으로 설정되었습니다!' as message;