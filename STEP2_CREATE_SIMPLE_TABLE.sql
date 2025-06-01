-- ====================================================
-- 2단계: 완전히 독립적인 경제 주체 테이블 생성
-- 다른 테이블과 연결 없이 단독으로 작동하는 버전
-- ====================================================

-- 1. 경제 주체 테이블 생성 (완전 독립형)
CREATE TABLE IF NOT EXISTS economic_entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id TEXT NOT NULL, -- TEXT 타입으로 변경, 외래 키 없음
    entity_type TEXT NOT NULL CHECK (entity_type IN ('government', 'bank', 'securities')),
    name TEXT NOT NULL,
    balance NUMERIC(15,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_teacher_entity UNIQUE(teacher_id, entity_type)
);

-- 2. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_economic_entities_teacher_id ON economic_entities(teacher_id);
CREATE INDEX IF NOT EXISTS idx_economic_entities_entity_type ON economic_entities(entity_type);

-- 3. RLS 비활성화 (개발 단계에서 단순화)
ALTER TABLE economic_entities DISABLE ROW LEVEL SECURITY;

-- 4. 테이블 생성 확인
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'economic_entities' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 5. 테스트 데이터 삽입 (선택사항)
INSERT INTO economic_entities (teacher_id, entity_type, name, balance) 
VALUES 
    ('test-teacher-1', 'government', 'Test Government', 100000000),
    ('test-teacher-1', 'bank', 'Test Bank', 50000000),
    ('test-teacher-1', 'securities', 'Test Securities', 0)
ON CONFLICT (teacher_id, entity_type) DO NOTHING;

-- 6. 삽입된 데이터 확인
SELECT * FROM economic_entities ORDER BY entity_type;

-- 성공! 이제 경제 주체 테이블이 생성되었습니다.