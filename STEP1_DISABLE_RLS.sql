-- STEP 1: RLS 정책 비활성화
-- 이 SQL을 Supabase SQL Editor에 복사해서 실행하세요

-- market_assets 테이블 RLS 비활성화
ALTER TABLE market_assets DISABLE ROW LEVEL SECURITY;

-- price_history 테이블 RLS 비활성화  
ALTER TABLE price_history DISABLE ROW LEVEL SECURITY;

-- 결과 확인
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('market_assets', 'price_history');