-- STEP 2: 시장 자산 데이터 삽입
-- 이 SQL을 Supabase SQL Editor에 복사해서 실행하세요

-- 기존 데이터 정리 (있다면)
DELETE FROM market_assets;

-- 시장 자산 데이터 삽입
INSERT INTO market_assets (
    symbol, name, asset_type, category, currency, min_quantity, 
    current_price, previous_price, price_change, price_change_percent, is_active
) VALUES
-- 한국 주식
('005930', '삼성전자', 'stock', 'technology', 'KRW', 1, 0, 0, 0, 0, true),
('000660', 'SK하이닉스', 'stock', 'technology', 'KRW', 1, 0, 0, 0, 0, true),
('035420', 'NAVER', 'stock', 'technology', 'KRW', 1, 0, 0, 0, 0, true),
('051910', 'LG화학', 'stock', 'chemical', 'KRW', 1, 0, 0, 0, 0, true),
('006400', '삼성SDI', 'stock', 'battery', 'KRW', 1, 0, 0, 0, 0, true),

-- 미국 주식
('AAPL', 'Apple Inc.', 'stock', 'technology', 'USD', 1, 0, 0, 0, 0, true),
('GOOGL', 'Alphabet Inc.', 'stock', 'technology', 'USD', 1, 0, 0, 0, 0, true),
('MSFT', 'Microsoft Corp.', 'stock', 'technology', 'USD', 1, 0, 0, 0, 0, true),
('TSLA', 'Tesla Inc.', 'stock', 'automotive', 'USD', 1, 0, 0, 0, 0, true),
('NVDA', 'NVIDIA Corp.', 'stock', 'technology', 'USD', 1, 0, 0, 0, 0, true),

-- 암호화폐
('BTC-USD', '비트코인', 'crypto', 'cryptocurrency', 'USD', 0.0001, 0, 0, 0, 0, true),
('ETH-USD', '이더리움', 'crypto', 'cryptocurrency', 'USD', 0.001, 0, 0, 0, 0, true),
('BNB-USD', '바이낸스 코인', 'crypto', 'cryptocurrency', 'USD', 0.01, 0, 0, 0, 0, true),

-- 원자재
('GLD', '금 ETF', 'commodity', 'precious_metals', 'USD', 0.1, 0, 0, 0, 0, true),
('SLV', '은 ETF', 'commodity', 'precious_metals', 'USD', 1, 0, 0, 0, 0, true),
('USO', '석유 ETF', 'commodity', 'energy', 'USD', 1, 0, 0, 0, 0, true);

-- 삽입 결과 확인
SELECT COUNT(*) as total_assets FROM market_assets;
SELECT symbol, name, asset_type, currency FROM market_assets ORDER BY symbol;