-- ====================================================
-- 경제 주체 테이블만 생성 (단순 버전)
-- Supabase SQL 에디터에서 실행하세요
-- ====================================================

-- 1. 경제 주체 테이블 생성 (외래 키 없이)
CREATE TABLE IF NOT EXISTS economic_entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL, -- 교사 ID (외래 키는 나중에 추가)
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

-- 4. RLS 정책 생성 (모든 접근 허용)
CREATE POLICY "Allow all access to economic_entities" ON economic_entities FOR ALL USING (true);

-- 5. 테이블 생성 확인
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'economic_entities' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 6. 테스트 데이터 삽입 (선택사항)
-- INSERT INTO economic_entities (teacher_id, entity_type, name, balance) VALUES 
-- ('00000000-0000-0000-0000-000000000001', 'government', '테스트 정부', 100000000),
-- ('00000000-0000-0000-0000-000000000001', 'bank', '테스트 은행', 50000000),
-- ('00000000-0000-0000-0000-000000000001', 'securities', '테스트 증권', 0);

-- 실행 완료! 이제 경제 주체 관리 기능을 사용할 수 있습니다.