-- ====================================================
-- 포트폴리오 문제 디버깅용 SQL
-- Supabase SQL 에디터에서 실행하여 데이터 확인
-- ====================================================

-- 1. 학생 테이블 확인
SELECT '=== 학생 정보 ===' AS info;
SELECT id, name, student_code, teacher_id, created_at 
FROM students 
ORDER BY created_at DESC 
LIMIT 5;

-- 2. 자산 거래 내역 확인
SELECT '=== 자산 거래 내역 ===' AS info;
SELECT 
    at.id,
    at.student_id,
    at.asset_id,
    at.transaction_type,
    at.quantity,
    at.price,
    at.total_amount,
    at.fee,
    at.status,
    at.created_at,
    ma.symbol,
    ma.name
FROM asset_transactions at
LEFT JOIN market_assets ma ON at.asset_id = ma.id
ORDER BY at.created_at DESC
LIMIT 10;

-- 3. 포트폴리오 테이블 확인
SELECT '=== 포트폴리오 정보 ===' AS info;
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
    ma.symbol,
    ma.name
FROM portfolio p
LEFT JOIN market_assets ma ON p.asset_id = ma.id
ORDER BY p.created_at DESC
LIMIT 10;

-- 4. 시장 자산 확인
SELECT '=== 시장 자산 ===' AS info;
SELECT id, symbol, name, current_price, asset_type, is_active
FROM market_assets
WHERE is_active = true
ORDER BY symbol
LIMIT 10;

-- 5. 계좌 정보 확인
SELECT '=== 계좌 정보 ===' AS info;
SELECT 
    student_id,
    account_type,
    balance,
    updated_at
FROM accounts
WHERE account_type = 'investment'
ORDER BY updated_at DESC
LIMIT 5;

-- 6. 테이블 존재 여부 확인
SELECT '=== 테이블 존재 확인 ===' AS info;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('students', 'portfolio', 'asset_transactions', 'market_assets', 'accounts')
ORDER BY table_name;

-- 7. 포트폴리오 테이블 구조 확인
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