-- ====================================================
-- 최종 해결책: 기존 테이블 삭제 후 새로 생성
-- Supabase SQL 에디터에서 이 스크립트를 실행하세요
-- ====================================================

-- 1. 기존 테이블이 있는지 확인
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'economic_entities' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. 기존 테이블 완전 삭제 (있다면)
DROP TABLE IF EXISTS economic_entities CASCADE;

-- 3. 새로운 테이블 생성 (완전 독립형)
CREATE TABLE economic_entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id TEXT NOT NULL,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('government', 'bank', 'securities')),
    name TEXT NOT NULL,
    balance NUMERIC(15,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_teacher_entity UNIQUE(teacher_id, entity_type)
);

-- 4. 인덱스 생성
CREATE INDEX idx_economic_entities_teacher_id ON economic_entities(teacher_id);
CREATE INDEX idx_economic_entities_entity_type ON economic_entities(entity_type);

-- 5. RLS 비활성화
ALTER TABLE economic_entities DISABLE ROW LEVEL SECURITY;

-- 6. 테이블 생성 확인
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'economic_entities' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 7. 테스트 데이터 삽입
INSERT INTO economic_entities (teacher_id, entity_type, name, balance) 
VALUES 
    ('test-teacher-1', 'government', 'Test Government', 100000000),
    ('test-teacher-1', 'bank', 'Test Bank', 50000000),
    ('test-teacher-1', 'securities', 'Test Securities', 0);

-- 8. 삽입된 데이터 확인
SELECT 
    id,
    teacher_id,
    entity_type,
    name,
    balance,
    created_at
FROM economic_entities 
ORDER BY entity_type;

-- 9. 최종 확인 메시지
SELECT 'economic_entities 테이블이 성공적으로 생성되었습니다!' AS result;