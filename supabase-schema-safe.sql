-- RichStudent 웹 버전 데이터베이스 스키마 (안전 업데이트)
-- 기존 데이터를 보존하면서 스키마 완성

-- ====================
-- 1. 트리거 제거 후 재생성 (IF EXISTS 사용)
-- ====================

-- 기존 트리거 제거
DROP TRIGGER IF EXISTS update_teachers_updated_at ON teachers;
DROP TRIGGER IF EXISTS update_students_updated_at ON students;
DROP TRIGGER IF EXISTS update_accounts_updated_at ON accounts;
DROP TRIGGER IF EXISTS update_portfolio_updated_at ON portfolio;
DROP TRIGGER IF EXISTS update_economic_entities_updated_at ON economic_entities;
DROP TRIGGER IF EXISTS update_real_estate_updated_at ON real_estate;

-- updated_at 자동 업데이트 함수 (재정의)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ====================
-- 2. 누락된 테이블들 생성
-- ====================

-- 학생 테이블
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

-- 계좌 테이블
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

-- 시장 자산 테이블
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

-- 포트폴리오 테이블
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

-- 거래 내역 테이블
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

-- 대출 테이블
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

-- 경제 주체 테이블
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

-- 부동산 테이블
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

-- ====================
-- 3. 인덱스 생성 (IF NOT EXISTS)
-- ====================

CREATE INDEX IF NOT EXISTS idx_students_teacher_id ON students(teacher_id);
CREATE INDEX IF NOT EXISTS idx_students_code ON students(teacher_id, student_code);
CREATE INDEX IF NOT EXISTS idx_accounts_student_id ON accounts(student_id);
CREATE INDEX IF NOT EXISTS idx_market_assets_teacher_id ON market_assets(teacher_id);
CREATE INDEX IF NOT EXISTS idx_market_assets_symbol ON market_assets(teacher_id, symbol);
CREATE INDEX IF NOT EXISTS idx_portfolio_student_id ON portfolio(student_id);
CREATE INDEX IF NOT EXISTS idx_transactions_student_id ON transactions(student_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_loans_student_id ON loans(student_id);
CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status);
CREATE INDEX IF NOT EXISTS idx_economic_entities_teacher_id ON economic_entities(teacher_id);
CREATE INDEX IF NOT EXISTS idx_real_estate_teacher_id ON real_estate(teacher_id);
CREATE INDEX IF NOT EXISTS idx_real_estate_owner ON real_estate(owner_student_id);

-- ====================
-- 4. 트리거 재생성
-- ====================

CREATE TRIGGER update_teachers_updated_at BEFORE UPDATE ON teachers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_portfolio_updated_at BEFORE UPDATE ON portfolio FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_economic_entities_updated_at BEFORE UPDATE ON economic_entities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_real_estate_updated_at BEFORE UPDATE ON real_estate FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ====================
-- 5. 유틸리티 함수들
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
    
    -- 투자 자산 계산
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

-- 스키마 업데이트 완료
SELECT 'RichStudent 데이터베이스 스키마가 안전하게 업데이트되었습니다!' as message;