-- ====================================================
-- 대출 시스템 마이그레이션 스크립트
-- 기존 테이블에 누락된 컬럼 추가 및 수정
-- ====================================================

-- 1. 기존 loans 테이블 구조 확인
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'loans' 
ORDER BY ordinal_position;

-- 2. loans 테이블에 누락된 컬럼들 추가
DO $$
BEGIN
    -- next_payment_due 컬럼 추가
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'loans' AND column_name = 'next_payment_due'
    ) THEN
        ALTER TABLE loans ADD COLUMN next_payment_due DATE;
        -- 기존 데이터에 대해 기본값 설정 (7일 후)
        UPDATE loans SET next_payment_due = CURRENT_DATE + INTERVAL '7 days' WHERE next_payment_due IS NULL;
        -- NOT NULL 제약조건 추가
        ALTER TABLE loans ALTER COLUMN next_payment_due SET NOT NULL;
    END IF;

    -- loan_duration_weeks 컬럼 확인 및 추가
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'loans' AND column_name = 'loan_duration_weeks'
    ) THEN
        ALTER TABLE loans ADD COLUMN loan_duration_weeks INTEGER;
        -- 기본값 설정
        UPDATE loans SET loan_duration_weeks = 12 WHERE loan_duration_weeks IS NULL;
        ALTER TABLE loans ALTER COLUMN loan_duration_weeks SET NOT NULL;
    END IF;

    -- weekly_payment 컬럼 확인 및 추가
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'loans' AND column_name = 'weekly_payment'
    ) THEN
        ALTER TABLE loans ADD COLUMN weekly_payment INTEGER;
        -- 기본값 설정 (loan_amount / 12주)
        UPDATE loans SET weekly_payment = COALESCE(loan_amount / 12, 0) WHERE weekly_payment IS NULL;
        ALTER TABLE loans ALTER COLUMN weekly_payment SET NOT NULL;
    END IF;

    -- total_payment 컬럼 확인 및 추가
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'loans' AND column_name = 'total_payment'
    ) THEN
        ALTER TABLE loans ADD COLUMN total_payment INTEGER;
        -- 기본값 설정
        UPDATE loans SET total_payment = COALESCE(weekly_payment * loan_duration_weeks, loan_amount) WHERE total_payment IS NULL;
        ALTER TABLE loans ALTER COLUMN total_payment SET NOT NULL;
    END IF;

    -- remaining_weeks 컬럼 확인 및 추가
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'loans' AND column_name = 'remaining_weeks'
    ) THEN
        ALTER TABLE loans ADD COLUMN remaining_weeks INTEGER;
        -- 기본값 설정
        UPDATE loans SET remaining_weeks = COALESCE(loan_duration_weeks, 12) WHERE remaining_weeks IS NULL;
        ALTER TABLE loans ALTER COLUMN remaining_weeks SET NOT NULL;
    END IF;

    -- status 컬럼 기본값 설정
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'loans' AND column_name = 'status'
    ) THEN
        UPDATE loans SET status = 'active' WHERE status IS NULL;
    ELSE
        ALTER TABLE loans ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
    END IF;

END $$;

-- 3. loan_payments 테이블 생성 (없는 경우)
CREATE TABLE IF NOT EXISTS loan_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID NOT NULL,
  student_id UUID NOT NULL,
  payment_amount INTEGER NOT NULL,
  interest_amount INTEGER NOT NULL,
  principal_amount INTEGER NOT NULL,
  payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  payment_week INTEGER NOT NULL,
  remaining_balance INTEGER NOT NULL,
  payment_type TEXT NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. credit_score_rates 테이블 생성 및 데이터 삽입
CREATE TABLE IF NOT EXISTS credit_score_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  min_credit_score INTEGER NOT NULL,
  max_credit_score INTEGER NOT NULL,
  annual_interest_rate DECIMAL(5,2) NOT NULL,
  max_loan_amount INTEGER NOT NULL,
  max_duration_weeks INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 신용점수별 이자율 데이터 삽입 (중복 방지)
INSERT INTO credit_score_rates (min_credit_score, max_credit_score, annual_interest_rate, max_loan_amount, max_duration_weeks, description) 
SELECT * FROM (VALUES
  (800, 850, 3.0, 10000000, 48, 'A+ 등급 - 최우수 신용'),
  (750, 799, 4.0, 8000000, 36, 'A 등급 - 우수 신용'),
  (700, 749, 6.0, 6000000, 24, 'B+ 등급 - 양호한 신용'),
  (650, 699, 8.0, 4000000, 18, 'B 등급 - 보통 신용'),
  (600, 649, 12.0, 2000000, 12, 'C+ 등급 - 주의 신용'),
  (550, 599, 15.0, 1000000, 6, 'C 등급 - 개선 필요'),
  (350, 549, 20.0, 500000, 3, 'D 등급 - 불량 신용')
) AS new_rates(min_credit_score, max_credit_score, annual_interest_rate, max_loan_amount, max_duration_weeks, description)
WHERE NOT EXISTS (
  SELECT 1 FROM credit_score_rates 
  WHERE credit_score_rates.min_credit_score = new_rates.min_credit_score 
  AND credit_score_rates.max_credit_score = new_rates.max_credit_score
);

-- 5. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_loans_student_id ON loans(student_id);
CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status);
CREATE INDEX IF NOT EXISTS idx_loans_next_payment_due ON loans(next_payment_due);
CREATE INDEX IF NOT EXISTS idx_loan_payments_loan_id ON loan_payments(loan_id);
CREATE INDEX IF NOT EXISTS idx_loan_payments_student_id ON loan_payments(student_id);
CREATE INDEX IF NOT EXISTS idx_loan_payments_payment_date ON loan_payments(payment_date);

-- 6. RLS 정책 설정
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_score_rates ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 후 재생성
DROP POLICY IF EXISTS "Allow all access to loans" ON loans;
DROP POLICY IF EXISTS "Allow all access to loan_payments" ON loan_payments;
DROP POLICY IF EXISTS "Allow all access to credit_score_rates" ON credit_score_rates;

CREATE POLICY "Allow all access to loans" ON loans FOR ALL USING (true);
CREATE POLICY "Allow all access to loan_payments" ON loan_payments FOR ALL USING (true);
CREATE POLICY "Allow all access to credit_score_rates" ON credit_score_rates FOR ALL USING (true);

-- 7. 대출 계산 함수들
CREATE OR REPLACE FUNCTION calculate_weekly_payment(
  principal INTEGER,
  annual_rate DECIMAL,
  duration_weeks INTEGER
) RETURNS INTEGER AS $$
DECLARE
  weekly_rate DECIMAL;
  payment INTEGER;
BEGIN
  weekly_rate := annual_rate / 100.0 / 12.0;
  
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
  SELECT COUNT(*), COALESCE(SUM(remaining_balance), 0)
  INTO active_loans_count, total_outstanding
  FROM loans
  WHERE student_id = student_uuid AND status = 'active';
  
  IF active_loans_count >= 3 THEN
    RETURN QUERY SELECT false, '최대 3개까지만 대출 가능합니다.', active_loans_count, total_outstanding;
  ELSIF total_outstanding >= 20000000 THEN
    RETURN QUERY SELECT false, '총 대출 한도(2,000만원)를 초과했습니다.', active_loans_count, total_outstanding;
  ELSE
    RETURN QUERY SELECT true, '대출 가능합니다.', active_loans_count, total_outstanding;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 8. 최종 테이블 구조 확인
SELECT 'loans 테이블 구조:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'loans' 
ORDER BY ordinal_position;

SELECT '대출 시스템 마이그레이션이 완료되었습니다!' as message;