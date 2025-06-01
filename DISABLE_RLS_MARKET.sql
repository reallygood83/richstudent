-- 시장 데이터 테이블의 RLS 정책 비활성화

-- 1. market_assets 테이블 RLS 비활성화
ALTER TABLE market_assets DISABLE ROW LEVEL SECURITY;

-- 2. price_history 테이블 RLS 비활성화
ALTER TABLE price_history DISABLE ROW LEVEL SECURITY;

-- 3. asset_transactions 테이블 RLS 비활성화 (존재하는 경우)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'asset_transactions') THEN
        ALTER TABLE asset_transactions DISABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Disabled RLS for asset_transactions table';
    END IF;
END $$;

-- 4. portfolio 테이블 RLS 비활성화 (존재하는 경우)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'portfolio') THEN
        ALTER TABLE portfolio DISABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Disabled RLS for portfolio table';
    END IF;
END $$;

-- 5. 현재 RLS 상태 확인
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('market_assets', 'price_history', 'asset_transactions', 'portfolio');