-- 기존 portfolio 테이블 구조 확인 및 필요시 컬럼 추가

-- 1. 현재 portfolio 테이블 구조 확인
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'portfolio' 
ORDER BY ordinal_position;

-- 2. portfolio 테이블이 없으면 생성, 있으면 필요한 컬럼 추가
DO $$ 
BEGIN
    -- portfolio 테이블이 없으면 전체 생성
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'portfolio') THEN
        CREATE TABLE portfolio (
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
        
        -- 인덱스 생성
        CREATE INDEX idx_portfolio_student ON portfolio(student_id);
        
        RAISE NOTICE 'Portfolio table created successfully';
    ELSE
        -- 기존 테이블이 있으면 필요한 컬럼들 확인 후 추가
        
        -- asset_id 컬럼 확인 및 추가
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'portfolio' AND column_name = 'asset_id') THEN
            ALTER TABLE portfolio ADD COLUMN asset_id UUID REFERENCES market_assets(id) ON DELETE CASCADE;
            RAISE NOTICE 'Added asset_id column to portfolio table';
        END IF;
        
        -- quantity 컬럼 확인 및 추가
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'portfolio' AND column_name = 'quantity') THEN
            ALTER TABLE portfolio ADD COLUMN quantity DECIMAL(15,4) NOT NULL DEFAULT 0;
            RAISE NOTICE 'Added quantity column to portfolio table';
        END IF;
        
        -- average_price 컬럼 확인 및 추가
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'portfolio' AND column_name = 'average_price') THEN
            ALTER TABLE portfolio ADD COLUMN average_price DECIMAL(15,2) NOT NULL DEFAULT 0;
            RAISE NOTICE 'Added average_price column to portfolio table';
        END IF;
        
        -- total_invested 컬럼 확인 및 추가
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'portfolio' AND column_name = 'total_invested') THEN
            ALTER TABLE portfolio ADD COLUMN total_invested DECIMAL(15,2) NOT NULL DEFAULT 0;
            RAISE NOTICE 'Added total_invested column to portfolio table';
        END IF;
        
        -- current_value 컬럼 확인 및 추가
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'portfolio' AND column_name = 'current_value') THEN
            ALTER TABLE portfolio ADD COLUMN current_value DECIMAL(15,2) NOT NULL DEFAULT 0;
            RAISE NOTICE 'Added current_value column to portfolio table';
        END IF;
        
        -- profit_loss 컬럼 확인 및 추가
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'portfolio' AND column_name = 'profit_loss') THEN
            ALTER TABLE portfolio ADD COLUMN profit_loss DECIMAL(15,2) NOT NULL DEFAULT 0;
            RAISE NOTICE 'Added profit_loss column to portfolio table';
        END IF;
        
        -- profit_loss_percent 컬럼 확인 및 추가
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'portfolio' AND column_name = 'profit_loss_percent') THEN
            ALTER TABLE portfolio ADD COLUMN profit_loss_percent DECIMAL(5,2) NOT NULL DEFAULT 0;
            RAISE NOTICE 'Added profit_loss_percent column to portfolio table';
        END IF;
        
        RAISE NOTICE 'Portfolio table structure updated successfully';
    END IF;
    
    -- 트리거 추가 (이미 존재하지 않는 경우만)
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_portfolio_updated_at') THEN
        CREATE TRIGGER update_portfolio_updated_at 
            BEFORE UPDATE ON portfolio 
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column();
        RAISE NOTICE 'Portfolio update trigger created successfully';
    ELSE
        RAISE NOTICE 'Portfolio update trigger already exists';
    END IF;
END $$;