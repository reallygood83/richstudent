-- ====================================================
-- RichStudent 완전한 데이터베이스 설정 SQL
-- 모든 투자 시스템 필요 테이블을 한 번에 생성
-- Supabase SQL 에디터에서 실행하세요
-- ====================================================

-- 1. 기존 테이블 삭제 (있다면)
DROP TABLE IF EXISTS asset_transactions CASCADE;
DROP TABLE IF EXISTS portfolio CASCADE;
DROP TABLE IF EXISTS market_assets CASCADE;

-- 2. 시장 자산 테이블 생성 (필수)
CREATE TABLE market_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    asset_type TEXT NOT NULL CHECK (asset_type IN ('stock', 'crypto', 'commodity', 'index')),
    category TEXT,
    currency TEXT DEFAULT 'KRW',
    current_price NUMERIC(15,2) DEFAULT 0,
    min_quantity NUMERIC(15,4) DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 포트폴리오 테이블 생성
CREATE TABLE portfolio (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL,
    asset_id UUID NOT NULL REFERENCES market_assets(id),
    quantity NUMERIC(15,4) DEFAULT 0,
    average_price NUMERIC(15,2) DEFAULT 0,
    total_invested NUMERIC(15,2) DEFAULT 0,
    current_value NUMERIC(15,2) DEFAULT 0,
    profit_loss NUMERIC(15,2) DEFAULT 0,
    profit_loss_percent NUMERIC(5,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, asset_id)
);

-- 4. 자산 거래 내역 테이블 생성
CREATE TABLE asset_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL,
    asset_id UUID NOT NULL REFERENCES market_assets(id),
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('buy', 'sell')),
    quantity NUMERIC(15,4) NOT NULL,
    price NUMERIC(15,2) NOT NULL,
    total_amount NUMERIC(15,2) NOT NULL,
    fee NUMERIC(15,2) DEFAULT 0,
    status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. 인덱스 생성
CREATE INDEX idx_market_assets_symbol ON market_assets(symbol);
CREATE INDEX idx_market_assets_type ON market_assets(asset_type);
CREATE INDEX idx_portfolio_student_id ON portfolio(student_id);
CREATE INDEX idx_portfolio_asset_id ON portfolio(asset_id);
CREATE INDEX idx_asset_transactions_student_id ON asset_transactions(student_id);
CREATE INDEX idx_asset_transactions_asset_id ON asset_transactions(asset_id);
CREATE INDEX idx_asset_transactions_type ON asset_transactions(transaction_type);
CREATE INDEX idx_asset_transactions_created_at ON asset_transactions(created_at);

-- 6. RLS 비활성화 (개발 단계)
ALTER TABLE market_assets DISABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio DISABLE ROW LEVEL SECURITY;
ALTER TABLE asset_transactions DISABLE ROW LEVEL SECURITY;

-- 7. 테스트 시장 자산 데이터 삽입
INSERT INTO market_assets (symbol, name, asset_type, category, current_price, min_quantity) VALUES
-- 한국 주식
('005930', '삼성전자', 'stock', 'korean_stock', 75000, 1),
('000660', 'SK하이닉스', 'stock', 'korean_stock', 135000, 1),
('035420', 'NAVER', 'stock', 'korean_stock', 210000, 1),
('051910', 'LG화학', 'stock', 'korean_stock', 420000, 1),
('006400', '삼성SDI', 'stock', 'korean_stock', 380000, 1),

-- 미국 주식
('AAPL', 'Apple Inc.', 'stock', 'us_stock', 195000, 1),
('MSFT', 'Microsoft Corp.', 'stock', 'us_stock', 420000, 1),
('GOOGL', 'Alphabet Inc.', 'stock', 'us_stock', 170000, 1),
('TSLA', 'Tesla Inc.', 'stock', 'us_stock', 250000, 1),
('NVDA', 'NVIDIA Corp.', 'stock', 'us_stock', 140000, 1),

-- 암호화폐
('BTC-USD', 'Bitcoin', 'crypto', 'cryptocurrency', 135000000, 0.0001),
('ETH-USD', 'Ethereum', 'crypto', 'cryptocurrency', 4200000, 0.001),
('XRP-USD', 'Ripple', 'crypto', 'cryptocurrency', 800, 1),

-- 원자재
('GLD', 'Gold ETF', 'commodity', 'precious_metal', 270000, 0.1),
('SLV', 'Silver ETF', 'commodity', 'precious_metal', 29000, 1),

-- 지수
('SPY', 'S&P 500 ETF', 'index', 'us_index', 580000, 1),
('QQQ', 'NASDAQ-100 ETF', 'index', 'us_index', 520000, 1)
ON CONFLICT (symbol) DO NOTHING;

-- 8. 포트폴리오 업데이트 함수 생성
CREATE OR REPLACE FUNCTION update_portfolio_current_values()
RETURNS void AS $$
BEGIN
    UPDATE portfolio 
    SET 
        current_value = quantity * (
            SELECT current_price 
            FROM market_assets 
            WHERE id = portfolio.asset_id
        ),
        profit_loss = (quantity * (
            SELECT current_price 
            FROM market_assets 
            WHERE id = portfolio.asset_id
        )) - total_invested,
        profit_loss_percent = CASE 
            WHEN total_invested > 0 THEN 
                ((quantity * (
                    SELECT current_price 
                    FROM market_assets 
                    WHERE id = portfolio.asset_id
                )) - total_invested) / total_invested * 100
            ELSE 0 
        END,
        updated_at = NOW()
    WHERE quantity > 0;
END;
$$ LANGUAGE plpgsql;

-- 9. 테이블 생성 확인
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('market_assets', 'portfolio', 'asset_transactions')
AND table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- 10. 삽입된 데이터 확인
SELECT 'market_assets 테이블:' AS table_info;
SELECT COUNT(*) AS assets_count, asset_type FROM market_assets GROUP BY asset_type;

SELECT 'portfolio 테이블:' AS table_info;
SELECT COUNT(*) AS portfolio_count FROM portfolio;

SELECT 'asset_transactions 테이블:' AS table_info;
SELECT COUNT(*) AS transactions_count FROM asset_transactions;

-- 11. 함수 확인
SELECT 'update_portfolio_current_values 함수:' AS function_info;
SELECT routine_name FROM information_schema.routines 
WHERE routine_name = 'update_portfolio_current_values';

-- ✅ 성공! 투자 시스템 데이터베이스가 완전히 설정되었습니다!
SELECT '🎉 투자 시스템 데이터베이스 설정 완료!' AS result;