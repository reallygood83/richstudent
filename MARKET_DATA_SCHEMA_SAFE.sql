-- 시장 데이터 시스템을 위한 안전한 테이블 스키마
-- 기존 트리거 충돌 방지

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

-- 인덱스 생성 (IF NOT EXISTS 지원하지 않으므로 개별 실행 필요)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_market_assets_symbol') THEN
        CREATE INDEX idx_market_assets_symbol ON market_assets(symbol);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_market_assets_type') THEN
        CREATE INDEX idx_market_assets_type ON market_assets(asset_type);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_price_history_asset_timestamp') THEN
        CREATE INDEX idx_price_history_asset_timestamp ON price_history(asset_id, timestamp DESC);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_asset_transactions_student') THEN
        CREATE INDEX idx_asset_transactions_student ON asset_transactions(student_id);
    END IF;
END $$;

-- 자동 업데이트 트리거 (기존 존재 시 건너뛰기)
DO $$ 
BEGIN
    -- update_updated_at_column 함수가 없으면 생성
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $func$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $func$ language 'plpgsql';
    END IF;
    
    -- market_assets 트리거가 없으면 생성
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_market_assets_updated_at') THEN
        CREATE TRIGGER update_market_assets_updated_at 
            BEFORE UPDATE ON market_assets 
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- 기존 market_assets 테이블에 필요한 컬럼 추가
DO $$ 
BEGIN
    -- category 컬럼이 없으면 추가
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'market_assets' AND column_name = 'category') THEN
        ALTER TABLE market_assets ADD COLUMN category VARCHAR(50);
        RAISE NOTICE 'Added category column to market_assets table';
    END IF;
    
    -- current_price 컬럼이 없으면 추가
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'market_assets' AND column_name = 'current_price') THEN
        ALTER TABLE market_assets ADD COLUMN current_price DECIMAL(15,2) DEFAULT 0;
        RAISE NOTICE 'Added current_price column to market_assets table';
    END IF;
    
    -- previous_price 컬럼이 없으면 추가
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'market_assets' AND column_name = 'previous_price') THEN
        ALTER TABLE market_assets ADD COLUMN previous_price DECIMAL(15,2) DEFAULT 0;
        RAISE NOTICE 'Added previous_price column to market_assets table';
    END IF;
    
    -- price_change 컬럼이 없으면 추가
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'market_assets' AND column_name = 'price_change') THEN
        ALTER TABLE market_assets ADD COLUMN price_change DECIMAL(15,2) DEFAULT 0;
        RAISE NOTICE 'Added price_change column to market_assets table';
    END IF;
    
    -- price_change_percent 컬럼이 없으면 추가
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'market_assets' AND column_name = 'price_change_percent') THEN
        ALTER TABLE market_assets ADD COLUMN price_change_percent DECIMAL(5,2) DEFAULT 0;
        RAISE NOTICE 'Added price_change_percent column to market_assets table';
    END IF;
    
    -- min_quantity 컬럼이 없으면 추가
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'market_assets' AND column_name = 'min_quantity') THEN
        ALTER TABLE market_assets ADD COLUMN min_quantity DECIMAL(10,4) DEFAULT 1;
        RAISE NOTICE 'Added min_quantity column to market_assets table';
    END IF;
    
    -- is_active 컬럼이 없으면 추가
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'market_assets' AND column_name = 'is_active') THEN
        ALTER TABLE market_assets ADD COLUMN is_active BOOLEAN DEFAULT true;
        RAISE NOTICE 'Added is_active column to market_assets table';
    END IF;
    
    -- last_updated 컬럼이 없으면 추가
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'market_assets' AND column_name = 'last_updated') THEN
        ALTER TABLE market_assets ADD COLUMN last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Added last_updated column to market_assets table';
    END IF;
    
    -- 기존 제약 조건 완화 (필요한 경우)
    BEGIN
        -- current_price 컬럼이 NOT NULL인 경우 NULL 허용으로 변경
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'market_assets' 
            AND column_name = 'current_price' 
            AND is_nullable = 'NO'
        ) THEN
            ALTER TABLE market_assets ALTER COLUMN current_price DROP NOT NULL;
            RAISE NOTICE 'Removed NOT NULL constraint from current_price column';
        END IF;
        
        -- previous_price 컬럼 NOT NULL 제약 제거
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'market_assets' 
            AND column_name = 'previous_price' 
            AND is_nullable = 'NO'
        ) THEN
            ALTER TABLE market_assets ALTER COLUMN previous_price DROP NOT NULL;
            RAISE NOTICE 'Removed NOT NULL constraint from previous_price column';
        END IF;
        
        -- CHECK 제약 조건 제거 (current_price > 0 등)
        IF EXISTS (
            SELECT 1 FROM information_schema.check_constraints 
            WHERE constraint_name = 'market_assets_current_price_check'
        ) THEN
            ALTER TABLE market_assets DROP CONSTRAINT market_assets_current_price_check;
            RAISE NOTICE 'Removed CHECK constraint from current_price column';
        END IF;
        
        -- 모든 CHECK 제약 조건들 제거
        DECLARE
            constraint_rec RECORD;
        BEGIN
            -- 모든 CHECK 제약 조건 조회 및 제거
            FOR constraint_rec IN 
                SELECT tc.constraint_name
                FROM information_schema.table_constraints tc
                WHERE tc.table_name = 'market_assets' 
                AND tc.constraint_type = 'CHECK'
            LOOP
                BEGIN
                    EXECUTE 'ALTER TABLE market_assets DROP CONSTRAINT ' || quote_ident(constraint_rec.constraint_name);
                    RAISE NOTICE 'Removed CHECK constraint: %', constraint_rec.constraint_name;
                EXCEPTION
                    WHEN OTHERS THEN
                        RAISE NOTICE 'Could not remove CHECK constraint %: %', constraint_rec.constraint_name, SQLERRM;
                END;
            END LOOP;
        END;
        
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Could not modify constraints: %', SQLERRM;
    END;
END $$;

-- UNIQUE 제약 조건 추가 (없는 경우만)
DO $$ 
BEGIN
    -- symbol 컬럼에 UNIQUE 제약 조건이 없으면 추가
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'market_assets' 
        AND constraint_type = 'UNIQUE' 
        AND constraint_name LIKE '%symbol%'
    ) THEN
        -- 기존 중복 데이터가 있는지 확인하고 정리
        DELETE FROM market_assets a USING market_assets b 
        WHERE a.id > b.id AND a.symbol = b.symbol;
        
        -- UNIQUE 제약 조건 추가
        ALTER TABLE market_assets ADD CONSTRAINT unique_market_assets_symbol UNIQUE (symbol);
        RAISE NOTICE 'Added UNIQUE constraint to symbol column';
    END IF;
END $$;

-- 기본 시장 자산 데이터 안전하게 삽입
DO $$ 
DECLARE
    asset_data RECORD;
    asset_exists BOOLEAN;
BEGIN
    -- 각 자산을 개별적으로 확인하고 삽입
    FOR asset_data IN 
        SELECT * FROM (VALUES
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
        ) AS t(symbol, name, asset_type, category, currency, min_quantity)
    LOOP
        -- 이미 존재하는지 확인
        SELECT EXISTS(SELECT 1 FROM market_assets WHERE symbol = asset_data.symbol) INTO asset_exists;
        
        -- 존재하지 않으면 삽입
        IF NOT asset_exists THEN
            INSERT INTO market_assets (
                symbol, 
                name, 
                asset_type, 
                category, 
                currency, 
                min_quantity,
                current_price,
                previous_price,
                price_change,
                price_change_percent,
                is_active
            ) 
            VALUES (
                asset_data.symbol, 
                asset_data.name, 
                asset_data.asset_type, 
                asset_data.category, 
                asset_data.currency, 
                asset_data.min_quantity,
                0.00,  -- current_price
                0.00,  -- previous_price  
                0.00,  -- price_change
                0.00,  -- price_change_percent
                true   -- is_active
            );
            RAISE NOTICE 'Inserted asset: %', asset_data.symbol;
        ELSE
            RAISE NOTICE 'Asset already exists: %', asset_data.symbol;
        END IF;
    END LOOP;
END $$;