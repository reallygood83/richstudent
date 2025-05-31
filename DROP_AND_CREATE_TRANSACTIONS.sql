-- 기존 테이블 삭제 후 새로 생성
-- Supabase SQL Editor에서 실행하세요

-- 1. 기존 테이블들 삭제 (있다면)
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS economic_entities CASCADE;
DROP TABLE IF EXISTS loans CASCADE;
DROP TABLE IF EXISTS asset_transactions CASCADE;

-- 2. 새로운 거래 테이블 생성
CREATE TABLE transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- 거래 당사자
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

-- 3. 경제 주체 테이블
CREATE TABLE economic_entities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type VARCHAR(20) NOT NULL,
  name VARCHAR(100) NOT NULL,
  balance DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 대출 테이블
CREATE TABLE loans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  principal_amount DECIMAL(15,2) NOT NULL,
  current_balance DECIMAL(15,2) NOT NULL,
  interest_rate DECIMAL(5,4) NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. 인덱스 생성
CREATE INDEX idx_transactions_from_student ON transactions(from_student_id);
CREATE INDEX idx_transactions_to_student ON transactions(to_student_id);
CREATE INDEX idx_transactions_type ON transactions(transaction_type);
CREATE INDEX idx_transactions_date ON transactions(created_at);

-- 6. RLS 비활성화
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE economic_entities DISABLE ROW LEVEL SECURITY;
ALTER TABLE loans DISABLE ROW LEVEL SECURITY;

-- 7. 완료 확인
SELECT 'Transaction tables created successfully!' as status;