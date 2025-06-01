-- 가장 간단한 경제 주체 테이블 생성
-- 한 번에 복사해서 실행하세요

DROP TABLE IF EXISTS economic_entities CASCADE;

CREATE TABLE economic_entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    name TEXT NOT NULL,
    balance NUMERIC(15,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE economic_entities DISABLE ROW LEVEL SECURITY;

INSERT INTO economic_entities (teacher_id, entity_type, name, balance) VALUES 
('test-teacher-1', 'government', 'Test Government', 100000000),
('test-teacher-1', 'bank', 'Test Bank', 50000000),
('test-teacher-1', 'securities', 'Test Securities', 0);

SELECT * FROM economic_entities;