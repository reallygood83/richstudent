-- 매우 간단한 거래 테이블 생성 (문제 해결용)
-- Supabase SQL Editor에서 실행하세요

-- 1. 간단한 거래 기록 테이블
CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- 거래 당사자 (UUID 문자열로 저장)
  from_student_id UUID,
  to_student_id UUID,
  from_entity VARCHAR(50),
  to_entity VARCHAR(50),
  
  -- 거래 정보
  transaction_type VARCHAR(30) NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  
  -- 계좌 정보
  from_account_type VARCHAR(20) DEFAULT 'checking',
  to_account_type VARCHAR(20) DEFAULT 'checking',
  
  -- 기타
  description TEXT,
  status VARCHAR(20) DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 경제 주체 테이블 (간단 버전)
CREATE TABLE IF NOT EXISTS economic_entities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type VARCHAR(20) NOT NULL,
  name VARCHAR(100) NOT NULL,
  balance DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 대출 테이블 (간단 버전)
CREATE TABLE IF NOT EXISTS loans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  principal_amount DECIMAL(15,2) NOT NULL,
  current_balance DECIMAL(15,2) NOT NULL,
  interest_rate DECIMAL(5,4) NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_transactions_from_student ON transactions(from_student_id);
CREATE INDEX IF NOT EXISTS idx_transactions_to_student ON transactions(to_student_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(created_at);

-- 5. RLS 비활성화
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE economic_entities DISABLE ROW LEVEL SECURITY;
ALTER TABLE loans DISABLE ROW LEVEL SECURITY;

-- 6. 완료 확인
SELECT 'Simple transaction tables created successfully!' as status;