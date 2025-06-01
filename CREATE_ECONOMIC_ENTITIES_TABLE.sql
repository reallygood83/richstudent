-- ====================================================
-- 경제 주체 테이블 생성 SQL
-- Supabase SQL 에디터에서 실행하세요
-- ====================================================

-- 1. 경제 주체 테이블 생성
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

-- 2. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_economic_entities_teacher_id ON economic_entities(teacher_id);
CREATE INDEX IF NOT EXISTS idx_economic_entities_entity_type ON economic_entities(entity_type);

-- 3. RLS (Row Level Security) 설정
ALTER TABLE economic_entities ENABLE ROW LEVEL SECURITY;

-- 4. RLS 정책 생성 (모든 접근 허용 - API에서 권한 관리)
CREATE POLICY "Allow all access to economic_entities" ON economic_entities
    FOR ALL USING (true);

-- 5. 테이블 생성 확인
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'economic_entities' 
ORDER BY ordinal_position;

-- 6. 제약 조건 확인
SELECT 
    constraint_name, 
    constraint_type, 
    table_name
FROM information_schema.table_constraints 
WHERE table_name = 'economic_entities';

-- 실행 후 경제 주체 관리 기능을 사용할 수 있습니다!