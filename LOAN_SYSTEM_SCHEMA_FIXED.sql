-- ====================================================
-- 대출 시스템 데이터베이스 스키마 (Supabase 호환)
-- 1주 = 1달, 12주 = 1년 시스템
-- ====================================================

-- 대출 테이블 생성
CREATE TABLE IF NOT EXISTS loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  loan_amount INTEGER NOT NULL, -- 대출 원금
  interest_rate DECIMAL(5,2) NOT NULL, -- 연이자율 (%)
  loan_duration_weeks INTEGER NOT NULL, -- 대출 기간 (주 단위, 1주=1달)
  weekly_payment INTEGER NOT NULL, -- 주간 상환금 (1주=1달)
  total_payment INTEGER NOT NULL, -- 총 상환금액
  remaining_balance INTEGER NOT NULL, -- 남은 잔액
  remaining_weeks INTEGER NOT NULL, -- 남은 상환 기간 (주)
  status TEXT NOT NULL DEFAULT 'active', -- 대출 상태: active, completed, overdue, defaulted
  next_payment_due DATE NOT NULL, -- 다음 상환일
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 대출 상환 내역 테이블
CREATE TABLE IF NOT EXISTS loan_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID NOT NULL,
  student_id UUID NOT NULL,
  payment_amount INTEGER NOT NULL, -- 상환 금액
  interest_amount INTEGER NOT NULL, -- 이자 금액
  principal_amount INTEGER NOT NULL, -- 원금 금액
  payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  payment_week INTEGER NOT NULL, -- 상환 차수 (몇 번째 상환인지)
  remaining_balance INTEGER NOT NULL, -- 상환 후 남은 잔액
  payment_type TEXT NOT NULL DEFAULT 'scheduled', -- 상환 유형: scheduled, early, penalty
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 신용점수별 이자율 테이블 (참고용)
CREATE TABLE IF NOT EXISTS credit_score_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  min_credit_score INTEGER NOT NULL,
  max_credit_score INTEGER NOT NULL,
  annual_interest_rate DECIMAL(5,2) NOT NULL, -- 연이자율 (%)
  max_loan_amount INTEGER NOT NULL, -- 최대 대출 가능 금액
  max_duration_weeks INTEGER NOT NULL, -- 최대 대출 기간 (주)
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 기본 신용점수별 이자율 데이터 삽입
INSERT INTO credit_score_rates (min_credit_score, max_credit_score, annual_interest_rate, max_loan_amount, max_duration_weeks, description) VALUES
(800, 850, 3.0, 10000000, 48, 'A+ 등급 - 최우수 신용'),
(750, 799, 4.0, 8000000, 36, 'A 등급 - 우수 신용'),
(700, 749, 6.0, 6000000, 24, 'B+ 등급 - 양호한 신용'),
(650, 699, 8.0, 4000000, 18, 'B 등급 - 보통 신용'),
(600, 649, 12.0, 2000000, 12, 'C+ 등급 - 주의 신용'),
(550, 599, 15.0, 1000000, 6, 'C 등급 - 개선 필요'),
(350, 549, 20.0, 500000, 3, 'D 등급 - 불량 신용')
ON CONFLICT DO NOTHING;

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_loans_student_id ON loans(student_id);
CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status);
CREATE INDEX IF NOT EXISTS idx_loans_next_payment_due ON loans(next_payment_due);
CREATE INDEX IF NOT EXISTS idx_loan_payments_loan_id ON loan_payments(loan_id);
CREATE INDEX IF NOT EXISTS idx_loan_payments_student_id ON loan_payments(student_id);
CREATE INDEX IF NOT EXISTS idx_loan_payments_payment_date ON loan_payments(payment_date);

-- RLS (Row Level Security) 정책 생성
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_score_rates ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 (있는 경우)
DROP POLICY IF EXISTS "Allow all access to loans" ON loans;
DROP POLICY IF EXISTS "Allow all access to loan_payments" ON loan_payments;
DROP POLICY IF EXISTS "Allow all access to credit_score_rates" ON credit_score_rates;

-- 모든 사용자가 접근 가능하도록 정책 설정 (개발 단계)
CREATE POLICY "Allow all access to loans" ON loans FOR ALL USING (true);
CREATE POLICY "Allow all access to loan_payments" ON loan_payments FOR ALL USING (true);
CREATE POLICY "Allow all access to credit_score_rates" ON credit_score_rates FOR ALL USING (true);

-- 대출 계산 함수들

-- 1. 주간 상환금 계산 함수 (복리 계산)
CREATE OR REPLACE FUNCTION calculate_weekly_payment(
  principal INTEGER,
  annual_rate DECIMAL,
  duration_weeks INTEGER
) RETURNS INTEGER AS $$
DECLARE
  weekly_rate DECIMAL;
  payment INTEGER;
BEGIN
  -- 연이자율을 주간 이자율로 변환 (1년 = 12주)
  weekly_rate := annual_rate / 100.0 / 12.0;
  
  -- 복리 계산 공식: PMT = P * (r * (1+r)^n) / ((1+r)^n - 1)
  IF weekly_rate = 0 THEN
    payment := principal / duration_weeks;
  ELSE
    payment := ROUND(
      principal * (weekly_rate * POWER(1 + weekly_rate, duration_weeks)) / 
      (POWER(1 + weekly_rate, duration_weeks) - 1)
    );
  END IF;
  
  RETURN payment;
END;
$$ LANGUAGE plpgsql;

-- 2. 신용점수에 따른 이자율 조회 함수
CREATE OR REPLACE FUNCTION get_interest_rate_by_credit_score(credit_score INTEGER)
RETURNS TABLE(
  annual_rate DECIMAL,
  max_amount INTEGER,
  max_weeks INTEGER,
  grade_description TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    csr.annual_interest_rate,
    csr.max_loan_amount,
    csr.max_duration_weeks,
    csr.description
  FROM credit_score_rates csr
  WHERE credit_score >= csr.min_credit_score 
    AND credit_score <= csr.max_credit_score
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- 3. 대출 가능 여부 확인 함수
CREATE OR REPLACE FUNCTION check_loan_eligibility(student_uuid UUID)
RETURNS TABLE(
  eligible BOOLEAN,
  reason TEXT,
  current_loans_count INTEGER,
  total_outstanding_amount INTEGER
) AS $$
DECLARE
  active_loans_count INTEGER;
  total_outstanding INTEGER;
BEGIN
  -- 활성 대출 개수 확인
  SELECT COUNT(*), COALESCE(SUM(remaining_balance), 0)
  INTO active_loans_count, total_outstanding
  FROM loans
  WHERE student_id = student_uuid AND status = 'active';
  
  -- 대출 가능 여부 판단
  IF active_loans_count >= 3 THEN
    RETURN QUERY SELECT false, '최대 3개까지만 대출 가능합니다.', active_loans_count, total_outstanding;
  ELSIF total_outstanding >= 20000000 THEN
    RETURN QUERY SELECT false, '총 대출 한도(2,000만원)를 초과했습니다.', active_loans_count, total_outstanding;
  ELSE
    RETURN QUERY SELECT true, '대출 가능합니다.', active_loans_count, total_outstanding;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 완료 메시지
SELECT '대출 시스템 스키마가 성공적으로 생성되었습니다!' as message;