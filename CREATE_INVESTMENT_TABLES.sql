-- ====================================================
-- 투자 시스템 필수 테이블 생성 SQL
-- Supabase SQL 에디터에서 실행하세요
-- ====================================================

-- 1. 기존 테이블 삭제 (있다면)
DROP TABLE IF EXISTS asset_transactions CASCADE;
DROP TABLE IF EXISTS portfolio CASCADE;

-- 2. 포트폴리오 테이블 생성
CREATE TABLE portfolio (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL,
    asset_id UUID NOT NULL,
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

-- 3. 자산 거래 내역 테이블 생성
CREATE TABLE asset_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL,
    asset_id UUID NOT NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('buy', 'sell')),
    quantity NUMERIC(15,4) NOT NULL,
    price NUMERIC(15,2) NOT NULL,
    total_amount NUMERIC(15,2) NOT NULL,
    fee NUMERIC(15,2) DEFAULT 0,
    status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 인덱스 생성
CREATE INDEX idx_portfolio_student_id ON portfolio(student_id);
CREATE INDEX idx_portfolio_asset_id ON portfolio(asset_id);
CREATE INDEX idx_asset_transactions_student_id ON asset_transactions(student_id);
CREATE INDEX idx_asset_transactions_asset_id ON asset_transactions(asset_id);
CREATE INDEX idx_asset_transactions_type ON asset_transactions(transaction_type);
CREATE INDEX idx_asset_transactions_created_at ON asset_transactions(created_at);

-- 5. RLS 비활성화 (개발 단계)
ALTER TABLE portfolio DISABLE ROW LEVEL SECURITY;
ALTER TABLE asset_transactions DISABLE ROW LEVEL SECURITY;

-- 6. 테이블 생성 확인
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('portfolio', 'asset_transactions')
AND table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- 7. 테스트 데이터 삽입 (선택사항)
-- 먼저 market_assets 테이블에 테스트 자산이 있는지 확인
INSERT INTO portfolio (student_id, asset_id, quantity, average_price, total_invested, current_value) 
VALUES 
    ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 10, 50000, 500000, 520000)
ON CONFLICT (student_id, asset_id) DO NOTHING;

INSERT INTO asset_transactions (student_id, asset_id, transaction_type, quantity, price, total_amount, fee) 
VALUES 
    ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'buy', 10, 50000, 500000, 500)
ON CONFLICT DO NOTHING;

-- 8. 삽입된 데이터 확인
SELECT 'portfolio 테이블:' AS table_info;
SELECT COUNT(*) AS portfolio_count FROM portfolio;

SELECT 'asset_transactions 테이블:' AS table_info;
SELECT COUNT(*) AS transactions_count FROM asset_transactions;

-- 성공! 투자 시스템 테이블이 생성되었습니다.