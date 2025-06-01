-- ====================================================
-- 학생 투자 모니터링 디버깅용 SQL
-- Supabase SQL 에디터에서 실행하여 데이터 확인
-- ====================================================

-- 1. 교사 세션 테이블 확인
SELECT '=== 교사 세션 정보 ===' AS info;
SELECT session_token, teacher_id, created_at, expires_at 
FROM teacher_sessions 
ORDER BY created_at DESC 
LIMIT 5;

-- 2. 학생 테이블 확인
SELECT '=== 학생 정보 ===' AS info;
SELECT id, teacher_id, name, student_code, credit_score 
FROM students 
ORDER BY created_at DESC 
LIMIT 10;

-- 3. 계좌 테이블 확인
SELECT '=== 학생 계좌 정보 ===' AS info;
SELECT 
    s.name as student_name,
    a.account_type,
    a.balance,
    a.updated_at
FROM accounts a
JOIN students s ON a.student_id = s.id
ORDER BY s.name, a.account_type
LIMIT 10;

-- 4. 포트폴리오 테이블 확인
SELECT '=== 포트폴리오 정보 ===' AS info;
SELECT 
    s.name as student_name,
    p.quantity,
    p.average_price,
    p.total_invested,
    p.current_value,
    p.profit_loss,
    ma.symbol,
    ma.name as asset_name
FROM portfolio p
JOIN students s ON p.student_id = s.id
JOIN market_assets ma ON p.asset_id = ma.id
ORDER BY s.name
LIMIT 10;

-- 5. 자산 거래 내역 확인
SELECT '=== 자산 거래 내역 ===' AS info;
SELECT 
    s.name as student_name,
    at.transaction_type,
    at.quantity,
    at.price,
    at.total_amount,
    at.created_at,
    ma.symbol
FROM asset_transactions at
JOIN students s ON at.student_id = s.id
JOIN market_assets ma ON at.asset_id = ma.id
ORDER BY at.created_at DESC
LIMIT 10;

-- 6. 시장 자산 확인
SELECT '=== 시장 자산 확인 ===' AS info;
SELECT id, symbol, name, current_price, asset_type, is_active
FROM market_assets
WHERE is_active = true
ORDER BY symbol
LIMIT 10;

-- 7. 테이블 존재 여부 확인
SELECT '=== 필수 테이블 존재 확인 ===' AS info;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'teacher_sessions', 'students', 'accounts', 
    'portfolio', 'asset_transactions', 'market_assets'
)
ORDER BY table_name;

-- 8. 투자 모니터링 API가 필요한 데이터 시뮬레이션
SELECT '=== API 응답 시뮬레이션 ===' AS info;
WITH student_data AS (
    SELECT 
        s.id,
        s.name,
        s.student_code,
        s.credit_score,
        COALESCE(SUM(CASE WHEN a.account_type = 'checking' THEN a.balance ELSE 0 END), 0) as checking_balance,
        COALESCE(SUM(CASE WHEN a.account_type = 'savings' THEN a.balance ELSE 0 END), 0) as savings_balance,
        COALESCE(SUM(CASE WHEN a.account_type = 'investment' THEN a.balance ELSE 0 END), 0) as investment_balance,
        COALESCE(SUM(p.current_value), 0) as portfolio_value,
        COALESCE(SUM(p.total_invested), 0) as total_invested,
        COUNT(p.id) as holdings_count
    FROM students s
    LEFT JOIN accounts a ON s.id = a.student_id
    LEFT JOIN portfolio p ON s.id = p.student_id
    GROUP BY s.id, s.name, s.student_code, s.credit_score
)
SELECT 
    name,
    student_code,
    credit_score,
    checking_balance,
    savings_balance,
    investment_balance,
    portfolio_value,
    total_invested,
    portfolio_value - total_invested as profit_loss,
    CASE 
        WHEN total_invested > 0 THEN ROUND(((portfolio_value - total_invested) / total_invested * 100)::numeric, 2)
        ELSE 0 
    END as profit_loss_percent,
    holdings_count,
    checking_balance + savings_balance + investment_balance + portfolio_value as total_assets
FROM student_data
ORDER BY name;