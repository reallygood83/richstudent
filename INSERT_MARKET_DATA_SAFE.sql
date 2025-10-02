-- 시장 자산 데이터 안전 업데이트 (확장 버전 - 40개)
-- 기존 포트폴리오 데이터를 보존하면서 새로운 자산 추가
-- 스키마 제약: asset_type IN ('stock', 'crypto', 'commodity', 'index')

-- 1. 기존 자산 비활성화 (삭제하지 않음)
UPDATE market_assets SET is_active = false;

-- 2. 새로운 시장 자산 데이터 삽입 (INSERT ON CONFLICT로 안전하게 처리)
INSERT INTO market_assets (
    symbol, name, asset_type, category, currency, min_quantity, current_price, is_active
) VALUES
-- ========== 한국 주식 (10개) ==========
('005930', '삼성전자', 'stock', 'korean_stock', 'KRW', 1, 0, true),
('000660', 'SK하이닉스', 'stock', 'korean_stock', 'KRW', 1, 0, true),
('035420', 'NAVER', 'stock', 'korean_stock', 'KRW', 1, 0, true),
('051910', 'LG화학', 'stock', 'korean_stock', 'KRW', 1, 0, true),
('006400', '삼성SDI', 'stock', 'korean_stock', 'KRW', 1, 0, true),
('005380', '현대자동차', 'stock', 'korean_stock', 'KRW', 1, 0, true),
('035720', '카카오', 'stock', 'korean_stock', 'KRW', 1, 0, true),
('000270', '기아', 'stock', 'korean_stock', 'KRW', 1, 0, true),
('005490', '포스코홀딩스', 'stock', 'korean_stock', 'KRW', 1, 0, true),
('068270', '셀트리온', 'stock', 'korean_stock', 'KRW', 1, 0, true),

-- ========== 미국 주식 (10개) ==========
('AAPL', 'Apple', 'stock', 'us_stock', 'USD', 1, 0, true),
('GOOGL', 'Alphabet', 'stock', 'us_stock', 'USD', 1, 0, true),
('MSFT', 'Microsoft', 'stock', 'us_stock', 'USD', 1, 0, true),
('TSLA', 'Tesla', 'stock', 'us_stock', 'USD', 1, 0, true),
('NVDA', 'NVIDIA', 'stock', 'us_stock', 'USD', 1, 0, true),
('AMZN', 'Amazon', 'stock', 'us_stock', 'USD', 1, 0, true),
('META', 'Meta', 'stock', 'us_stock', 'USD', 1, 0, true),
('NFLX', 'Netflix', 'stock', 'us_stock', 'USD', 1, 0, true),
('AMD', 'AMD', 'stock', 'us_stock', 'USD', 1, 0, true),
('KO', 'Coca-Cola', 'stock', 'us_stock', 'USD', 1, 0, true),

-- ========== 암호화폐 (5개) ==========
('BTC-USD', '비트코인', 'crypto', 'cryptocurrency', 'USD', 0.0001, 0, true),
('ETH-USD', '이더리움', 'crypto', 'cryptocurrency', 'USD', 0.001, 0, true),
('BNB-USD', '바이낸스코인', 'crypto', 'cryptocurrency', 'USD', 0.01, 0, true),
('XRP-USD', '리플', 'crypto', 'cryptocurrency', 'USD', 1, 0, true),
('ADA-USD', '카르다노', 'crypto', 'cryptocurrency', 'USD', 1, 0, true),

-- ========== 환율 (5개) - asset_type을 'commodity'로 설정 (스키마 제약 준수) ==========
('USDKRW=X', '미국 달러', 'commodity', 'exchange_rate', 'KRW', 1, 0, true),
('EURKRW=X', '유로', 'commodity', 'exchange_rate', 'KRW', 1, 0, true),
('JPYKRW=X', '일본 엔', 'commodity', 'exchange_rate', 'KRW', 100, 0, true),
('CNYKRW=X', '중국 위안', 'commodity', 'exchange_rate', 'KRW', 1, 0, true),
('GBPKRW=X', '영국 파운드', 'commodity', 'exchange_rate', 'KRW', 1, 0, true),

-- ========== 원자재/ETF (10개) ==========
('GLD', '금 ETF', 'commodity', 'etf', 'USD', 0.1, 0, true),
('SLV', '은 ETF', 'commodity', 'etf', 'USD', 1, 0, true),
('USO', '석유 ETF', 'commodity', 'etf', 'USD', 1, 0, true),
('QQQ', '나스닥100 ETF', 'index', 'etf', 'USD', 1, 0, true),
('SPY', 'S&P500 ETF', 'index', 'etf', 'USD', 1, 0, true),
('IWM', '러셀2000 ETF', 'index', 'etf', 'USD', 1, 0, true),
('DIA', '다우존스 ETF', 'index', 'etf', 'USD', 1, 0, true),
('VTI', '미국전체 ETF', 'index', 'etf', 'USD', 1, 0, true),
('EEM', '신흥국 ETF', 'index', 'etf', 'USD', 1, 0, true),
('ARKK', 'ARK혁신 ETF', 'index', 'etf', 'USD', 1, 0, true)
ON CONFLICT (symbol)
DO UPDATE SET
    name = EXCLUDED.name,
    asset_type = EXCLUDED.asset_type,
    category = EXCLUDED.category,
    currency = EXCLUDED.currency,
    min_quantity = EXCLUDED.min_quantity,
    current_price = EXCLUDED.current_price,
    is_active = true;

-- 3. 삽입 결과 확인
SELECT COUNT(*) as total_assets FROM market_assets;
SELECT COUNT(*) as active_assets FROM market_assets WHERE is_active = true;
SELECT asset_type, category, COUNT(*) as count
FROM market_assets
WHERE is_active = true
GROUP BY asset_type, category
ORDER BY asset_type, category;
SELECT symbol, name, asset_type, category, currency, is_active
FROM market_assets
ORDER BY is_active DESC, asset_type, symbol;
