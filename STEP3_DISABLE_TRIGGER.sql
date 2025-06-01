-- STEP 3: 문제가 되는 트리거 비활성화
-- 이 SQL을 Supabase SQL Editor에 복사해서 실행하세요

-- 트리거 삭제
DROP TRIGGER IF EXISTS update_market_assets_updated_at ON market_assets;

-- 트리거 함수도 삭제 (다른 테이블에서 사용 중이 아니라면)
-- DROP FUNCTION IF EXISTS update_updated_at_column();

-- 확인
SELECT tgname FROM pg_trigger WHERE tgrelid = 'market_assets'::regclass;