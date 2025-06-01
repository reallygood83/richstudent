-- 환율 자산 추가 스크립트
-- 주요 환율들을 market_assets 테이블에 추가

-- 기존 환율 데이터 삭제 (있다면)
DELETE FROM market_assets WHERE asset_type = 'currency';

-- 주요 환율 데이터 삽입
INSERT INTO market_assets (
    symbol, name, asset_type, category, currency, min_quantity, 
    current_price, previous_price, price_change, price_change_percent, is_active
) VALUES
-- 미국 달러
('USDKRW=X', '미국 달러/한국 원', 'currency', 'exchange_rate', 'KRW', 0.01, 1379.50, 1377.20, 2.30, 0.17, true),
-- 일본 엔
('JPYKRW=X', '일본 엔/한국 원', 'currency', 'exchange_rate', 'KRW', 0.01, 8.95, 8.92, 0.03, 0.34, true),
-- 유로
('EURKRW=X', '유로/한국 원', 'currency', 'exchange_rate', 'KRW', 0.01, 1420.85, 1418.90, 1.95, 0.14, true),
-- 영국 파운드
('GBPKRW=X', '영국 파운드/한국 원', 'currency', 'exchange_rate', 'KRW', 0.01, 1699.20, 1695.80, 3.40, 0.20, true),
-- 중국 위안
('CNYKRW=X', '중국 위안/한국 원', 'currency', 'exchange_rate', 'KRW', 0.01, 188.45, 188.12, 0.33, 0.18, true);

-- 결과 확인
SELECT 
    symbol, 
    name, 
    current_price,
    CONCAT(
        CASE 
            WHEN price_change > 0 THEN '+' 
            ELSE '' 
        END,
        price_change, 
        ' (', 
        CASE 
            WHEN price_change_percent > 0 THEN '+' 
            ELSE '' 
        END,
        price_change_percent, 
        '%)'
    ) as change_info
FROM market_assets 
WHERE asset_type = 'currency' 
ORDER BY symbol;

-- 전체 자산 개수 확인
SELECT 
    asset_type,
    COUNT(*) as count
FROM market_assets 
WHERE is_active = true
GROUP BY asset_type
ORDER BY asset_type;