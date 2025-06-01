-- ====================================================
-- 포트폴리오 문제 구체적 진단
-- ====================================================

-- 1. 거래 내역 vs 포트폴리오 비교
SELECT '=== 거래 내역 있지만 포트폴리오 없는 문제 진단 ===' AS info;

-- 2. 자산 거래 내역 확인 (최근 거래들)
SELECT 'asset_transactions 테이블 내용' AS check_name;
SELECT 
    at.id,
    at.student_id,
    at.asset_id,
    at.transaction_type,
    at.quantity,
    at.price,
    at.total_amount,
    at.created_at,
    s.name as student_name,
    ma.symbol,
    ma.name as asset_name
FROM asset_transactions at
LEFT JOIN students s ON at.student_id = s.id
LEFT JOIN market_assets ma ON at.asset_id = ma.id
ORDER BY at.created_at DESC
LIMIT 10;

-- 3. 포트폴리오 테이블 내용 확인
SELECT 'portfolio 테이블 내용' AS check_name;
SELECT 
    p.id,
    p.student_id,
    p.asset_id,
    p.quantity,
    p.average_price,
    p.total_invested,
    p.current_value,
    p.profit_loss,
    p.created_at,
    p.updated_at,
    s.name as student_name,
    ma.symbol,
    ma.name as asset_name
FROM portfolio p
LEFT JOIN students s ON p.student_id = s.id
LEFT JOIN market_assets ma ON p.asset_id = ma.id
ORDER BY p.created_at DESC;

-- 4. 매수 거래가 있는데 포트폴리오에 없는 케이스 찾기
SELECT '=== 매수했지만 포트폴리오에 없는 자산들 ===' AS info;
SELECT DISTINCT
    at.student_id,
    at.asset_id,
    s.name as student_name,
    ma.symbol,
    SUM(CASE WHEN at.transaction_type = 'buy' THEN at.quantity ELSE -at.quantity END) as net_quantity,
    SUM(CASE WHEN at.transaction_type = 'buy' THEN at.total_amount ELSE -at.total_amount END) as net_invested
FROM asset_transactions at
LEFT JOIN students s ON at.student_id = s.id
LEFT JOIN market_assets ma ON at.asset_id = ma.id
LEFT JOIN portfolio p ON at.student_id = p.student_id AND at.asset_id = p.asset_id
WHERE p.id IS NULL  -- 포트폴리오에 없는 경우
GROUP BY at.student_id, at.asset_id, s.name, ma.symbol
HAVING SUM(CASE WHEN at.transaction_type = 'buy' THEN at.quantity ELSE -at.quantity END) > 0;

-- 5. 포트폴리오 수동 생성 스크립트 (위에서 찾은 누락된 데이터 기반)
SELECT '=== 누락된 포트폴리오 데이터 수동 생성 스크립트 ===' AS info;

-- 실제 실행할 INSERT 문 생성
WITH missing_portfolios AS (
    SELECT 
        at.student_id,
        at.asset_id,
        SUM(CASE WHEN at.transaction_type = 'buy' THEN at.quantity ELSE -at.quantity END) as total_quantity,
        SUM(CASE WHEN at.transaction_type = 'buy' THEN at.total_amount ELSE 0 END) / 
        NULLIF(SUM(CASE WHEN at.transaction_type = 'buy' THEN at.quantity ELSE 0 END), 0) as avg_price,
        SUM(CASE WHEN at.transaction_type = 'buy' THEN at.total_amount ELSE -at.total_amount END) as total_invested
    FROM asset_transactions at
    LEFT JOIN portfolio p ON at.student_id = p.student_id AND at.asset_id = p.asset_id
    WHERE p.id IS NULL
    GROUP BY at.student_id, at.asset_id
    HAVING SUM(CASE WHEN at.transaction_type = 'buy' THEN at.quantity ELSE -at.quantity END) > 0
)
SELECT 
    'INSERT INTO portfolio (student_id, asset_id, quantity, average_price, total_invested, current_value, profit_loss, profit_loss_percent) VALUES' ||
    E'\n(''' || mp.student_id || ''', ''' || mp.asset_id || ''', ' || mp.total_quantity || ', ' || 
    COALESCE(mp.avg_price, 0) || ', ' || mp.total_invested || ', ' || 
    (mp.total_quantity * ma.current_price) || ', ' || 
    ((mp.total_quantity * ma.current_price) - mp.total_invested) || ', ' ||
    CASE WHEN mp.total_invested > 0 THEN 
        (((mp.total_quantity * ma.current_price) - mp.total_invested) / mp.total_invested * 100)
    ELSE 0 END || ');' as insert_statement
FROM missing_portfolios mp
JOIN market_assets ma ON mp.asset_id = ma.id;

-- 6. 포트폴리오 테이블 구조 확인
SELECT '=== 포트폴리오 테이블 구조 ===' AS info;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'portfolio' 
AND table_schema = 'public'
ORDER BY ordinal_position;