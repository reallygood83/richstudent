-- ====================================================
-- 누락된 테이블들 생성 SQL
-- Supabase SQL 에디터에서 실행하세요
-- ====================================================

-- 1. 경제 주체 테이블 (정부, 은행, 증권사)
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

-- 2. 대출 테이블
CREATE TABLE IF NOT EXISTS loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
    bank_entity_id UUID REFERENCES economic_entities(id) ON DELETE CASCADE,
    amount DECIMAL(15,2) NOT NULL,
    interest_rate DECIMAL(5,2) NOT NULL,
    credit_score INTEGER NOT NULL CHECK (credit_score >= 350 AND credit_score <= 850),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paid_off', 'defaulted')),
    monthly_payment DECIMAL(15,2),
    remaining_balance DECIMAL(15,2) NOT NULL,
    due_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 부동산 테이블 (교실 자리)
CREATE TABLE IF NOT EXISTS real_estate (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
    owner_student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    seat_number INTEGER NOT NULL,
    price DECIMAL(15,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'owned' CHECK (status IN ('owned', 'for_sale')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(teacher_id, seat_number)
);

-- 4. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_economic_entities_teacher_id ON economic_entities(teacher_id);
CREATE INDEX IF NOT EXISTS idx_economic_entities_entity_type ON economic_entities(entity_type);
CREATE INDEX IF NOT EXISTS idx_loans_student_id ON loans(student_id);
CREATE INDEX IF NOT EXISTS idx_loans_teacher_id ON loans(teacher_id);
CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status);
CREATE INDEX IF NOT EXISTS idx_real_estate_teacher_id ON real_estate(teacher_id);
CREATE INDEX IF NOT EXISTS idx_real_estate_owner ON real_estate(owner_student_id);

-- 5. RLS (Row Level Security) 설정
ALTER TABLE economic_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE real_estate ENABLE ROW LEVEL SECURITY;

-- 6. RLS 정책 생성 (모든 접근 허용 - API에서 권한 관리)
CREATE POLICY "Allow all access to economic_entities" ON economic_entities FOR ALL USING (true);
CREATE POLICY "Allow all access to loans" ON loans FOR ALL USING (true);
CREATE POLICY "Allow all access to real_estate" ON real_estate FOR ALL USING (true);

-- 7. 생성된 테이블 확인
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('economic_entities', 'loans', 'real_estate')
ORDER BY table_name;

-- 실행 완료 후 모든 경제 주체 기능을 사용할 수 있습니다!