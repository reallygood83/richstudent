-- 원/달러 환율 자산 추가 (간단한 방법)
-- 이 SQL을 Supabase SQL Editor에 복사해서 실행하세요

-- 1. 기존 환율 데이터가 있다면 삭제
DELETE FROM market_assets WHERE symbol = 'USDKRW=X';

-- 2. 새로운 환율 데이터 삽입
INSERT INTO market_assets (
    symbol, name, asset_type, category, currency, min_quantity, 
    current_price, previous_price, price_change, price_change_percent, is_active
) VALUES
('USDKRW=X', '미국 달러/한국 원', 'currency', 'exchange_rate', 'KRW', 0.01, 1379.58, 1379.58, 0, 0, true);

-- 3. 결과 확인
SELECT symbol, name, asset_type, current_price FROM market_assets WHERE symbol = 'USDKRW=X';

-- 4. 전체 자산 개수 확인
SELECT COUNT(*) as total_assets FROM market_assets;