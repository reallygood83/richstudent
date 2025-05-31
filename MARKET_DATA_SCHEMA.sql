-- 시장 데이터 시스템을 위한 테이블 스키마

-- 시장 자산 테이블
CREATE TABLE IF NOT EXISTS market_assets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    symbol VARCHAR(10) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    asset_type VARCHAR(20) NOT NULL, -- 'stock', 'crypto', 'commodity', 'real_estate'
    category VARCHAR(50),
    current_price DECIMAL(15,2) DEFAULT 0,
    previous_price DECIMAL(15,2) DEFAULT 0,
    price_change DECIMAL(15,2) DEFAULT 0,
    price_change_percent DECIMAL(5,2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'KRW',
    min_quantity DECIMAL(10,4) DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 가격 히스토리 테이블
CREATE TABLE IF NOT EXISTS price_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    asset_id UUID REFERENCES market_assets(id) ON DELETE CASCADE,
    price DECIMAL(15,2) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    source VARCHAR(50) DEFAULT 'yahoo_finance'
);

-- 학생 포트폴리오 테이블
CREATE TABLE IF NOT EXISTS portfolio (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    asset_id UUID REFERENCES market_assets(id) ON DELETE CASCADE,
    quantity DECIMAL(15,4) NOT NULL DEFAULT 0,
    average_price DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_invested DECIMAL(15,2) NOT NULL DEFAULT 0,
    current_value DECIMAL(15,2) NOT NULL DEFAULT 0,
    profit_loss DECIMAL(15,2) NOT NULL DEFAULT 0,
    profit_loss_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, asset_id)
);

-- 자산 거래 테이블
CREATE TABLE IF NOT EXISTS asset_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    asset_id UUID REFERENCES market_assets(id) ON DELETE CASCADE,
    transaction_type VARCHAR(10) NOT NULL, -- 'buy', 'sell'
    quantity DECIMAL(15,4) NOT NULL,
    price DECIMAL(15,2) NOT NULL,
    total_amount DECIMAL(15,2) NOT NULL,
    fee DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'completed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_market_assets_symbol ON market_assets(symbol);
CREATE INDEX IF NOT EXISTS idx_market_assets_type ON market_assets(asset_type);
CREATE INDEX IF NOT EXISTS idx_price_history_asset_timestamp ON price_history(asset_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_portfolio_student ON portfolio(student_id);
CREATE INDEX IF NOT EXISTS idx_asset_transactions_student ON asset_transactions(student_id);

-- 자동 업데이트 트리거
CREATE TRIGGER update_market_assets_updated_at 
    BEFORE UPDATE ON market_assets 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_portfolio_updated_at 
    BEFORE UPDATE ON portfolio 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 기본 시장 자산 데이터 삽입
INSERT INTO market_assets (symbol, name, asset_type, category, currency, min_quantity) VALUES
-- 한국 주식
('005930', '삼성전자', 'stock', 'technology', 'KRW', 1),
('000660', 'SK하이닉스', 'stock', 'technology', 'KRW', 1),
('035420', 'NAVER', 'stock', 'technology', 'KRW', 1),
('051910', 'LG화학', 'stock', 'chemical', 'KRW', 1),
('006400', '삼성SDI', 'stock', 'battery', 'KRW', 1),

-- 미국 주식 (원화 환산)
('AAPL', 'Apple Inc.', 'stock', 'technology', 'USD', 1),
('GOOGL', 'Alphabet Inc.', 'stock', 'technology', 'USD', 1),
('MSFT', 'Microsoft Corp.', 'stock', 'technology', 'USD', 1),
('TSLA', 'Tesla Inc.', 'stock', 'automotive', 'USD', 1),
('NVDA', 'NVIDIA Corp.', 'stock', 'technology', 'USD', 1),

-- 암호화폐
('BTC-USD', '비트코인', 'crypto', 'cryptocurrency', 'USD', 0.0001),
('ETH-USD', '이더리움', 'crypto', 'cryptocurrency', 'USD', 0.001),
('BNB-USD', '바이낸스 코인', 'crypto', 'cryptocurrency', 'USD', 0.01),

-- 원자재
('GLD', '금 ETF', 'commodity', 'precious_metals', 'USD', 0.1),
('SLV', '은 ETF', 'commodity', 'precious_metals', 'USD', 1),
('USO', '석유 ETF', 'commodity', 'energy', 'USD', 1)

ON CONFLICT (symbol) DO NOTHING;