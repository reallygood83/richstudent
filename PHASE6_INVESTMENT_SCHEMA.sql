-- Phase 6: 투자 시스템 데이터베이스 스키마
-- 이 SQL을 Supabase SQL Editor에 복사해서 실행하세요

-- 1. 포트폴리오 테이블 (학생별 보유 자산)
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

-- 2. 자산 거래 테이블 (투자 거래 기록) - 기존 확장
DO $$ 
BEGIN
    -- asset_transactions 테이블이 없으면 생성
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'asset_transactions') THEN
        CREATE TABLE asset_transactions (
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
    ELSE
        -- 기존 테이블에 필요한 컬럼 추가
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'asset_transactions' AND column_name = 'fee') THEN
            ALTER TABLE asset_transactions ADD COLUMN fee DECIMAL(15,2) DEFAULT 0;
            RAISE NOTICE 'Added fee column to asset_transactions table';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'asset_transactions' AND column_name = 'status') THEN
            ALTER TABLE asset_transactions ADD COLUMN status VARCHAR(20) DEFAULT 'completed';
            RAISE NOTICE 'Added status column to asset_transactions table';
        END IF;
    END IF;
END $$;

-- 3. 인덱스 생성
DO $$ 
BEGIN
    -- 포트폴리오 인덱스
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_portfolio_student') THEN
        CREATE INDEX idx_portfolio_student ON portfolio(student_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_portfolio_asset') THEN
        CREATE INDEX idx_portfolio_asset ON portfolio(asset_id);
    END IF;
    
    -- 자산 거래 인덱스
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_asset_transactions_student') THEN
        CREATE INDEX idx_asset_transactions_student ON asset_transactions(student_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_asset_transactions_asset') THEN
        CREATE INDEX idx_asset_transactions_asset ON asset_transactions(asset_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_asset_transactions_created') THEN
        CREATE INDEX idx_asset_transactions_created ON asset_transactions(created_at DESC);
    END IF;
END $$;

-- 4. 트리거 함수 (포트폴리오 자동 업데이트)
CREATE OR REPLACE FUNCTION update_portfolio_on_transaction()
RETURNS TRIGGER AS $$
DECLARE
    current_portfolio RECORD;
    new_quantity DECIMAL(15,4);
    new_average_price DECIMAL(15,2);
    new_total_invested DECIMAL(15,2);
    current_asset_price DECIMAL(15,2);
BEGIN
    -- 현재 자산 가격 조회
    SELECT current_price INTO current_asset_price 
    FROM market_assets 
    WHERE id = NEW.asset_id;
    
    -- 기존 포트폴리오 조회
    SELECT * INTO current_portfolio 
    FROM portfolio 
    WHERE student_id = NEW.student_id AND asset_id = NEW.asset_id;
    
    IF NEW.transaction_type = 'buy' THEN
        -- 매수 처리
        IF current_portfolio IS NULL THEN
            -- 새로운 자산 매수
            INSERT INTO portfolio (
                student_id, asset_id, quantity, average_price, total_invested,
                current_value, profit_loss, profit_loss_percent
            ) VALUES (
                NEW.student_id, NEW.asset_id, NEW.quantity, NEW.price, NEW.total_amount,
                NEW.quantity * current_asset_price,
                (NEW.quantity * current_asset_price) - NEW.total_amount,
                CASE WHEN NEW.total_amount > 0 THEN 
                    ((NEW.quantity * current_asset_price) - NEW.total_amount) / NEW.total_amount * 100 
                ELSE 0 END
            );
        ELSE
            -- 기존 자산 추가 매수
            new_quantity := current_portfolio.quantity + NEW.quantity;
            new_total_invested := current_portfolio.total_invested + NEW.total_amount;
            new_average_price := new_total_invested / new_quantity;
            
            UPDATE portfolio SET
                quantity = new_quantity,
                average_price = new_average_price,
                total_invested = new_total_invested,
                current_value = new_quantity * current_asset_price,
                profit_loss = (new_quantity * current_asset_price) - new_total_invested,
                profit_loss_percent = CASE WHEN new_total_invested > 0 THEN 
                    ((new_quantity * current_asset_price) - new_total_invested) / new_total_invested * 100 
                ELSE 0 END,
                updated_at = NOW()
            WHERE student_id = NEW.student_id AND asset_id = NEW.asset_id;
        END IF;
        
    ELSIF NEW.transaction_type = 'sell' THEN
        -- 매도 처리
        IF current_portfolio IS NOT NULL THEN
            new_quantity := current_portfolio.quantity - NEW.quantity;
            
            IF new_quantity <= 0 THEN
                -- 전량 매도 - 포트폴리오에서 제거
                DELETE FROM portfolio 
                WHERE student_id = NEW.student_id AND asset_id = NEW.asset_id;
            ELSE
                -- 부분 매도
                new_total_invested := current_portfolio.average_price * new_quantity;
                
                UPDATE portfolio SET
                    quantity = new_quantity,
                    total_invested = new_total_invested,
                    current_value = new_quantity * current_asset_price,
                    profit_loss = (new_quantity * current_asset_price) - new_total_invested,
                    profit_loss_percent = CASE WHEN new_total_invested > 0 THEN 
                        ((new_quantity * current_asset_price) - new_total_invested) / new_total_invested * 100 
                    ELSE 0 END,
                    updated_at = NOW()
                WHERE student_id = NEW.student_id AND asset_id = NEW.asset_id;
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. 트리거 생성 (포트폴리오 자동 업데이트)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_portfolio') THEN
        CREATE TRIGGER trigger_update_portfolio
            AFTER INSERT ON asset_transactions
            FOR EACH ROW
            EXECUTE FUNCTION update_portfolio_on_transaction();
        RAISE NOTICE 'Created portfolio update trigger';
    END IF;
END $$;

-- 6. 포트폴리오 현재 가치 업데이트 함수
CREATE OR REPLACE FUNCTION update_portfolio_current_values()
RETURNS void AS $$
BEGIN
    UPDATE portfolio 
    SET 
        current_value = portfolio.quantity * market_assets.current_price,
        profit_loss = (portfolio.quantity * market_assets.current_price) - portfolio.total_invested,
        profit_loss_percent = CASE 
            WHEN portfolio.total_invested > 0 THEN 
                ((portfolio.quantity * market_assets.current_price) - portfolio.total_invested) / portfolio.total_invested * 100 
            ELSE 0 
        END,
        updated_at = NOW()
    FROM market_assets 
    WHERE portfolio.asset_id = market_assets.id;
END;
$$ LANGUAGE plpgsql;

-- 7. 테이블 생성 완료 확인
SELECT 
    tablename, 
    schemaname 
FROM pg_tables 
WHERE tablename IN ('portfolio', 'asset_transactions', 'market_assets') 
ORDER BY tablename;