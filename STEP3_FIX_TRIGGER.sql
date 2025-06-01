-- STEP 3: 트리거 함수 오류 수정
-- 이 SQL을 Supabase SQL Editor에 복사해서 실행하세요

-- 1. 기존 트리거 삭제
DROP TRIGGER IF EXISTS update_market_assets_updated_at ON market_assets;

-- 2. 트리거 함수 재생성 (updated_at 컬럼 체크 포함)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    -- updated_at 컬럼이 존재하는지 확인
    IF TG_TABLE_NAME = 'market_assets' THEN
        -- market_assets 테이블에는 updated_at 컬럼이 있음
        NEW.updated_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 3. updated_at 컬럼이 있는지 확인하고 없으면 추가
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'market_assets' AND column_name = 'updated_at') THEN
        ALTER TABLE market_assets ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Added updated_at column to market_assets table';
    END IF;
END $$;

-- 4. 트리거 재생성
CREATE TRIGGER update_market_assets_updated_at 
    BEFORE UPDATE ON market_assets 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 5. 테이블 구조 확인
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'market_assets' 
AND column_name IN ('updated_at', 'last_updated');