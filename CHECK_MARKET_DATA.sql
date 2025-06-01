-- 시장 데이터 테이블 상태 확인

-- 1. market_assets 테이블 존재 확인
SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'market_assets'
) AS table_exists;

-- 2. market_assets 테이블 구조 확인
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'market_assets' 
ORDER BY ordinal_position;

-- 3. 현재 market_assets 데이터 확인
SELECT COUNT(*) as total_assets FROM market_assets;

-- 4. 자산별 데이터 확인
SELECT symbol, name, asset_type, current_price, is_active, created_at 
FROM market_assets 
ORDER BY symbol;

-- 5. 제약 조건 확인
SELECT constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'market_assets';

-- 6. 인덱스 확인
SELECT indexname, tablename 
FROM pg_indexes 
WHERE tablename = 'market_assets';