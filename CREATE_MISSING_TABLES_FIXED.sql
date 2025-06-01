-- ====================================================
-- 누락된 테이블들 생성 SQL (수정된 버전)
-- Supabase SQL 에디터에서 실행하세요
-- ====================================================

-- 먼저 현재 테이블 구조를 확인하세요
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;

-- teachers 테이블의 컬럼 구조 확인
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'teachers' AND table_schema = 'public'
ORDER BY ordinal_position;

-- students 테이블의 컬럼 구조 확인  
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'students' AND table_schema = 'public'
ORDER BY ordinal_position;

-- =============================================================================
-- 옵션 1: teachers 테이블에 id 컬럼이 있는 경우
-- =============================================================================

-- 1. 경제 주체 테이블 (정부, 은행, 증권사)
CREATE TABLE IF NOT EXISTS economic_entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID, -- 외래 키는 나중에 추가
    entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('government', 'bank', 'securities')),
    name VARCHAR(100) NOT NULL,
    balance DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 대출 테이블
CREATE TABLE IF NOT EXISTS loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID, -- 외래 키는 나중에 추가
    teacher_id UUID, -- 외래 키는 나중에 추가
    bank_entity_id UUID, -- 외래 키는 나중에 추가
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
    teacher_id UUID, -- 외래 키는 나중에 추가
    owner_student_id UUID, -- 외래 키는 나중에 추가
    seat_number INTEGER NOT NULL,
    price DECIMAL(15,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'owned' CHECK (status IN ('owned', 'for_sale')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_economic_entities_teacher_id ON economic_entities(teacher_id);
CREATE INDEX IF NOT EXISTS idx_economic_entities_entity_type ON economic_entities(entity_type);
CREATE INDEX IF NOT EXISTS idx_loans_student_id ON loans(student_id);
CREATE INDEX IF NOT EXISTS idx_loans_teacher_id ON loans(teacher_id);
CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status);
CREATE INDEX IF NOT EXISTS idx_real_estate_teacher_id ON real_estate(teacher_id);
CREATE INDEX IF NOT EXISTS idx_real_estate_owner ON real_estate(owner_student_id);

-- 5. UNIQUE 제약 조건 추가 (경제 주체는 교사당 각 타입별로 하나씩만)
ALTER TABLE economic_entities ADD CONSTRAINT unique_teacher_entity_type 
UNIQUE(teacher_id, entity_type);

-- 6. UNIQUE 제약 조건 추가 (부동산은 교사당 좌석 번호별로 하나씩만)
ALTER TABLE real_estate ADD CONSTRAINT unique_teacher_seat_number 
UNIQUE(teacher_id, seat_number);

-- 7. RLS (Row Level Security) 설정
ALTER TABLE economic_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE real_estate ENABLE ROW LEVEL SECURITY;

-- 8. RLS 정책 생성 (모든 접근 허용 - API에서 권한 관리)
DO $$
BEGIN
    -- economic_entities 정책
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'economic_entities' AND policyname = 'Allow all access to economic_entities') THEN
        CREATE POLICY "Allow all access to economic_entities" ON economic_entities FOR ALL USING (true);
    END IF;
    
    -- loans 정책
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'loans' AND policyname = 'Allow all access to loans') THEN
        CREATE POLICY "Allow all access to loans" ON loans FOR ALL USING (true);
    END IF;
    
    -- real_estate 정책  
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'real_estate' AND policyname = 'Allow all access to real_estate') THEN
        CREATE POLICY "Allow all access to real_estate" ON real_estate FOR ALL USING (true);
    END IF;
END $$;

-- 9. 생성된 테이블 확인
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('economic_entities', 'loans', 'real_estate')
ORDER BY table_name;

-- 10. 외래 키 추가 (수동으로 실행하세요 - 실제 테이블 구조에 맞춰 수정)
-- 아래 명령어들은 teachers와 students 테이블에 'id' 컬럼이 있을 때만 실행하세요

/*
-- teachers 테이블에 id 컬럼이 있는 경우
ALTER TABLE economic_entities ADD CONSTRAINT fk_economic_entities_teacher 
FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE;

ALTER TABLE loans ADD CONSTRAINT fk_loans_teacher 
FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE;

ALTER TABLE real_estate ADD CONSTRAINT fk_real_estate_teacher 
FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE;

-- students 테이블에 id 컬럼이 있는 경우
ALTER TABLE loans ADD CONSTRAINT fk_loans_student 
FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;

ALTER TABLE real_estate ADD CONSTRAINT fk_real_estate_owner 
FOREIGN KEY (owner_student_id) REFERENCES students(id) ON DELETE CASCADE;

-- economic_entities 자체 참조
ALTER TABLE loans ADD CONSTRAINT fk_loans_bank_entity 
FOREIGN KEY (bank_entity_id) REFERENCES economic_entities(id) ON DELETE CASCADE;
*/

-- 실행 완료 후 경제 주체 기능을 사용할 수 있습니다!