-- 원/달러 환율 자산 추가
-- 이 SQL을 Supabase SQL Editor에 복사해서 실행하세요

INSERT INTO market_assets (
    symbol, name, asset_type, category, currency, min_quantity, 
    current_price, previous_price, price_change, price_change_percent, is_active
) VALUES
('USDKRW=X', '미국 달러/한국 원', 'currency', 'exchange_rate', 'KRW', 0.01, 1379.58, 1379.58, 0, 0, true)
ON CONFLICT (symbol) DO UPDATE SET
    name = EXCLUDED.name,
    asset_type = EXCLUDED.asset_type,
    category = EXCLUDED.category,
    currency = EXCLUDED.currency,
    min_quantity = EXCLUDED.min_quantity,
    is_active = EXCLUDED.is_active;

-- 결과 확인
SELECT symbol, name, asset_type, current_price FROM market_assets WHERE symbol = 'USDKRW=X';