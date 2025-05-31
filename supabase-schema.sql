-- RichStudent 웹 버전 데이터베이스 스키마
-- 생성일: 2025년 1월
-- Supabase PostgreSQL 기반

-- ====================
-- 1. 교사 테이블
-- ====================
CREATE TABLE IF NOT EXISTS teachers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    school VARCHAR(100),
    password_hash VARCHAR(255) NOT NULL,
    session_code VARCHAR(10) UNIQUE,
    plan VARCHAR(20) DEFAULT 'free' CHECK (plan IN ('free', 'basic', 'premium')),
    student_limit INTEGER DEFAULT 30,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 교사 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_teachers_email ON teachers(email);
CREATE INDEX IF NOT EXISTS idx_teachers_session_code ON teachers(session_code);

-- ====================
-- 2. 교사 세션 테이블
-- ====================
CREATE TABLE IF NOT EXISTS teacher_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 세션 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_teacher_sessions_token ON teacher_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_teacher_sessions_teacher_id ON teacher_sessions(teacher_id);

-- ====================
-- 3. 학생 테이블
-- ====================
CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
    student_code VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    password VARCHAR(100), -- 학생 비밀번호는 선택사항
    credit_score INTEGER DEFAULT 700 CHECK (credit_score >= 350 AND credit_score <= 850),
    weekly_allowance DECIMAL(15,2) DEFAULT 0,
    last_allowance_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(teacher_id, student_code)
);

-- 학생 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_students_teacher_id ON students(teacher_id);
CREATE INDEX IF NOT EXISTS idx_students_code ON students(teacher_id, student_code);

-- ====================
-- 4. 계좌 테이블
-- ====================
CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    account_type VARCHAR(20) NOT NULL CHECK (account_type IN ('checking', 'savings', 'investment')),
    balance DECIMAL(15,2) DEFAULT 0 CHECK (balance >= 0),
    interest_rate DECIMAL(5,4) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, account_type)
);

-- 계좌 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_accounts_student_id ON accounts(student_id);

-- ====================
-- 5. 시장 자산 테이블
-- ====================
CREATE TABLE IF NOT EXISTS market_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
    symbol VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    asset_type VARCHAR(20) NOT NULL CHECK (asset_type IN ('stock', 'crypto', 'commodity', 'real_estate')),
    current_price DECIMAL(15,2) NOT NULL CHECK (current_price > 0),
    previous_price DECIMAL(15,2),
    currency VARCHAR(3) DEFAULT 'KRW',
    min_quantity DECIMAL(10,4) DEFAULT 1,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(teacher_id, symbol)
);

-- 시장 자산 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_market_assets_teacher_id ON market_assets(teacher_id);
CREATE INDEX IF NOT EXISTS idx_market_assets_symbol ON market_assets(teacher_id, symbol);

-- ====================
-- 6. 포트폴리오 테이블
-- ====================
CREATE TABLE IF NOT EXISTS portfolio (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    asset_symbol VARCHAR(20) NOT NULL,
    quantity DECIMAL(15,4) NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    avg_price DECIMAL(15,2) NOT NULL DEFAULT 0 CHECK (avg_price >= 0),
    total_invested DECIMAL(15,2) NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, asset_symbol)
);

-- 포트폴리오 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_portfolio_student_id ON portfolio(student_id);

-- ====================
-- 7. 거래 내역 테이블
-- ====================
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    transaction_type VARCHAR(50) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    account_type VARCHAR(20),
    asset_symbol VARCHAR(20),
    quantity DECIMAL(15,4),
    price DECIMAL(15,2),
    description TEXT,
    reference_id UUID, -- 다른 학생 또는 거래 참조
    fees DECIMAL(15,2) DEFAULT 0, -- 거래 수수료
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 거래 내역 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_transactions_student_id ON transactions(student_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(transaction_type);

-- ====================
-- 8. 대출 테이블
-- ====================
CREATE TABLE IF NOT EXISTS loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    principal DECIMAL(15,2) NOT NULL CHECK (principal > 0),
    interest_rate DECIMAL(5,4) NOT NULL CHECK (interest_rate >= 0),
    remaining_balance DECIMAL(15,2) NOT NULL CHECK (remaining_balance >= 0),
    monthly_payment DECIMAL(15,2) NOT NULL CHECK (monthly_payment > 0),
    term_months INTEGER NOT NULL CHECK (term_months > 0),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paid_off', 'defaulted')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    due_date DATE NOT NULL
);

-- 대출 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_loans_student_id ON loans(student_id);
CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status);

-- ====================
-- 9. 경제 주체 테이블 (정부, 은행, 증권사)
-- ====================
CREATE TABLE IF NOT EXISTS economic_entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
    entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('government', 'bank', 'securities')),
    name VARCHAR(100) NOT NULL,
    balance DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(teacher_id, entity_type)
);

-- 경제 주체 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_economic_entities_teacher_id ON economic_entities(teacher_id);

-- ====================
-- 10. 부동산 테이블 (교실 자리)
-- ====================
CREATE TABLE IF NOT EXISTS real_estate (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
    seat_number VARCHAR(10) NOT NULL,
    owner_student_id UUID REFERENCES students(id) ON DELETE SET NULL,
    current_price DECIMAL(15,2) NOT NULL CHECK (current_price > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(teacher_id, seat_number)
);

-- 부동산 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_real_estate_teacher_id ON real_estate(teacher_id);
CREATE INDEX IF NOT EXISTS idx_real_estate_owner ON real_estate(owner_student_id);

-- ====================
-- 11. 트리거 함수들
-- ====================

-- updated_at 자동 업데이트 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- updated_at 트리거 적용
CREATE TRIGGER update_teachers_updated_at BEFORE UPDATE ON teachers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_portfolio_updated_at BEFORE UPDATE ON portfolio FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_economic_entities_updated_at BEFORE UPDATE ON economic_entities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_real_estate_updated_at BEFORE UPDATE ON real_estate FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ====================
-- 12. RLS (Row Level Security) 정책
-- ====================

-- 교사 테이블 RLS 활성화
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

-- 교사는 자신의 데이터만 접근 가능
CREATE POLICY "Teachers can only access their own data" ON teachers
    FOR ALL USING (auth.uid()::text = id::text);

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

-- ====================
-- 13. 초기 데이터 삽입
-- ====================

-- 기본 시장 자산 데이터는 각 교사별로 생성될 예정이므로 여기서는 생략

-- ====================
-- 14. 유틸리티 함수들
-- ====================

-- 교사의 총 학생 수 계산
CREATE OR REPLACE FUNCTION get_teacher_student_count(teacher_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (SELECT COUNT(*) FROM students WHERE teacher_id = teacher_uuid);
END;
$$ language 'plpgsql';

-- 학생의 총 자산 계산
CREATE OR REPLACE FUNCTION get_student_total_assets(student_uuid UUID)
RETURNS DECIMAL(15,2) AS $$
DECLARE
    total_cash DECIMAL(15,2) := 0;
    total_investments DECIMAL(15,2) := 0;
BEGIN
    -- 현금 계산
    SELECT COALESCE(SUM(balance), 0) INTO total_cash 
    FROM accounts WHERE student_id = student_uuid;
    
    -- 투자 자산 계산 (포트폴리오 * 현재 가격)
    SELECT COALESCE(SUM(p.quantity * COALESCE(ma.current_price, p.avg_price)), 0) INTO total_investments
    FROM portfolio p
    LEFT JOIN market_assets ma ON p.asset_symbol = ma.symbol
    WHERE p.student_id = student_uuid;
    
    RETURN total_cash + total_investments;
END;
$$ language 'plpgsql';

-- 세션 코드 생성 함수
CREATE OR REPLACE FUNCTION generate_session_code()
RETURNS VARCHAR(10) AS $$
DECLARE
    chars VARCHAR(36) := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    result VARCHAR(10) := '';
    i INTEGER;
BEGIN
    FOR i IN 1..6 LOOP
        result := result || substr(chars, ceil(random() * length(chars))::integer, 1);
    END LOOP;
    RETURN result;
END;
$$ language 'plpgsql';

-- 스키마 생성 완료
SELECT 'RichStudent 데이터베이스 스키마가 성공적으로 생성되었습니다!' as message;