-- Phase 3: 거래 및 전송 시스템 데이터베이스 스키마
-- Supabase SQL Editor에서 실행하세요

-- 1. 거래 기록 테이블
CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
  
  -- 거래 당사자
  from_student_id UUID REFERENCES students(id) ON DELETE SET NULL,
  to_student_id UUID REFERENCES students(id) ON DELETE SET NULL,
  from_entity VARCHAR(50), -- 'government', 'bank', 'securities', 'teacher'
  to_entity VARCHAR(50),
  
  -- 거래 정보
  transaction_type VARCHAR(30) NOT NULL, -- 'transfer', 'allowance', 'tax', 'loan', 'fee', 'adjustment'
  amount DECIMAL(15,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'KRW',
  
  -- 계좌 정보
  from_account_type VARCHAR(20), -- 'checking', 'savings', 'investment'
  to_account_type VARCHAR(20),
  
  -- 거래 세부사항
  description TEXT,
  reference_id VARCHAR(100), -- 관련 거래 참조 ID
  fee_amount DECIMAL(15,2) DEFAULT 0,
  
  -- 메타데이터
  status VARCHAR(20) DEFAULT 'completed', -- 'pending', 'completed', 'failed', 'cancelled'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 인덱스를 위한 제약조건
  CONSTRAINT valid_participants CHECK (
    (from_student_id IS NOT NULL OR from_entity IS NOT NULL) AND
    (to_student_id IS NOT NULL OR to_entity IS NOT NULL)
  )
);

-- 2. 경제 주체 테이블 (정부, 은행, 증권사)
CREATE TABLE IF NOT EXISTS economic_entities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
  entity_type VARCHAR(20) NOT NULL, -- 'government', 'bank', 'securities'
  name VARCHAR(100) NOT NULL,
  balance DECIMAL(15,2) DEFAULT 0,
  settings JSONB DEFAULT '{}', -- 각 주체별 설정 (금리, 수수료율 등)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(teacher_id, entity_type)
);

-- 3. 대출 기록 테이블
CREATE TABLE IF NOT EXISTS loans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  
  -- 대출 정보
  principal_amount DECIMAL(15,2) NOT NULL, -- 원금
  current_balance DECIMAL(15,2) NOT NULL, -- 현재 잔액
  interest_rate DECIMAL(5,4) NOT NULL, -- 연이율 (0.0500 = 5%)
  term_months INTEGER NOT NULL, -- 대출 기간 (월)
  
  -- 상태 정보
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'paid_off', 'defaulted'
  credit_score_at_origination INTEGER, -- 대출 당시 신용점수
  
  -- 날짜 정보
  originated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  due_date TIMESTAMP WITH TIME ZONE,
  paid_off_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 자산 거래 기록 테이블 (향후 주식/암호화폐 거래용)
CREATE TABLE IF NOT EXISTS asset_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  
  -- 자산 정보
  asset_symbol VARCHAR(20) NOT NULL, -- 'AAPL', 'BTC-USD', '005930.KS'
  asset_name VARCHAR(100),
  asset_type VARCHAR(20) NOT NULL, -- 'stock', 'crypto', 'commodity', 'real_estate'
  
  -- 거래 정보
  transaction_type VARCHAR(10) NOT NULL, -- 'buy', 'sell'
  quantity DECIMAL(15,8) NOT NULL, -- 거래 수량 (소수점 지원)
  price_per_unit DECIMAL(15,2) NOT NULL, -- 단가
  total_amount DECIMAL(15,2) NOT NULL, -- 총 거래금액
  fee_amount DECIMAL(15,2) DEFAULT 0, -- 거래 수수료
  
  -- 메타데이터
  market_data JSONB DEFAULT '{}', -- 시장 데이터 스냅샷
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_transactions_teacher_id ON transactions(teacher_id);
CREATE INDEX IF NOT EXISTS idx_transactions_from_student ON transactions(from_student_id);
CREATE INDEX IF NOT EXISTS idx_transactions_to_student ON transactions(to_student_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(created_at);

CREATE INDEX IF NOT EXISTS idx_economic_entities_teacher ON economic_entities(teacher_id);
CREATE INDEX IF NOT EXISTS idx_economic_entities_type ON economic_entities(entity_type);

CREATE INDEX IF NOT EXISTS idx_loans_teacher_id ON loans(teacher_id);
CREATE INDEX IF NOT EXISTS idx_loans_student_id ON loans(student_id);
CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status);

CREATE INDEX IF NOT EXISTS idx_asset_transactions_teacher ON asset_transactions(teacher_id);
CREATE INDEX IF NOT EXISTS idx_asset_transactions_student ON asset_transactions(student_id);
CREATE INDEX IF NOT EXISTS idx_asset_transactions_symbol ON asset_transactions(asset_symbol);

-- 6. RLS 비활성화 (개발 중)
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE economic_entities DISABLE ROW LEVEL SECURITY;
ALTER TABLE loans DISABLE ROW LEVEL SECURITY;
ALTER TABLE asset_transactions DISABLE ROW LEVEL SECURITY;

-- 7. 완료 확인
SELECT 'Phase 3 transaction system database schema created successfully!' as status;