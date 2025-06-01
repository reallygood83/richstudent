-- ====================================================
-- 교실 좌석 거래 시스템 데이터베이스 스키마
-- 6x5 = 30개 좌석 시스템
-- ====================================================

-- 1. 기존 테이블 삭제 (있는 경우)
DROP TABLE IF EXISTS seat_transactions CASCADE;
DROP TABLE IF EXISTS classroom_seats CASCADE;

-- 2. classroom_seats 테이블 생성
CREATE TABLE classroom_seats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seat_number INTEGER NOT NULL UNIQUE, -- 1-30번 좌석
  row_position INTEGER NOT NULL, -- 1-5행 (앞에서부터)
  column_position INTEGER NOT NULL, -- 1-6열 (왼쪽에서부터)
  current_price INTEGER NOT NULL DEFAULT 0, -- 현재 좌석 가격
  owner_id UUID, -- 소유자 student_id (NULL이면 미소유)
  purchase_price INTEGER DEFAULT 0, -- 구매 시 가격
  purchase_date TIMESTAMP WITH TIME ZONE,
  is_available BOOLEAN NOT NULL DEFAULT true, -- 거래 가능 여부
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. seat_transactions 테이블 생성
CREATE TABLE seat_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seat_id UUID NOT NULL REFERENCES classroom_seats(id),
  seat_number INTEGER NOT NULL,
  buyer_id UUID, -- 구매자 student_id
  seller_id UUID, -- 판매자 student_id (NULL이면 최초 구매)
  transaction_price INTEGER NOT NULL, -- 거래 가격
  transaction_type TEXT NOT NULL, -- 'buy', 'sell'
  transaction_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 30개 좌석 기본 데이터 삽입 (6x5 배치)
DO $$
DECLARE
  seat_num INTEGER;
  row_num INTEGER;
  col_num INTEGER;
BEGIN
  FOR seat_num IN 1..30 LOOP
    -- 좌석 번호를 행/열로 변환
    -- 1-6: 1행, 7-12: 2행, 13-18: 3행, 19-24: 4행, 25-30: 5행
    row_num := ((seat_num - 1) / 6) + 1;
    col_num := ((seat_num - 1) % 6) + 1;
    
    INSERT INTO classroom_seats (
      seat_number, 
      row_position, 
      column_position, 
      current_price,
      is_available
    ) VALUES (
      seat_num, 
      row_num, 
      col_num, 
      100000, -- 기본 가격 10만원
      true
    );
  END LOOP;
END $$;

-- 5. 인덱스 생성
CREATE INDEX idx_classroom_seats_number ON classroom_seats(seat_number);
CREATE INDEX idx_classroom_seats_owner ON classroom_seats(owner_id);
CREATE INDEX idx_classroom_seats_position ON classroom_seats(row_position, column_position);
CREATE INDEX idx_seat_transactions_seat ON seat_transactions(seat_id);
CREATE INDEX idx_seat_transactions_buyer ON seat_transactions(buyer_id);
CREATE INDEX idx_seat_transactions_seller ON seat_transactions(seller_id);
CREATE INDEX idx_seat_transactions_date ON seat_transactions(transaction_date);

-- 6. RLS (Row Level Security) 정책 설정
ALTER TABLE classroom_seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE seat_transactions ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 접근 가능하도록 정책 설정 (개발 단계)
CREATE POLICY "Allow all access to classroom_seats" ON classroom_seats FOR ALL USING (true);
CREATE POLICY "Allow all access to seat_transactions" ON seat_transactions FOR ALL USING (true);

-- 7. 좌석 가격 계산 함수
CREATE OR REPLACE FUNCTION calculate_seat_price()
RETURNS INTEGER AS $$
DECLARE
  total_student_assets BIGINT;
  student_count INTEGER;
  calculated_price INTEGER;
BEGIN
  -- 전체 학생 자산 계산 (경제 주체 제외)
  SELECT 
    COALESCE(SUM(a.balance), 0),
    COUNT(DISTINCT s.id)
  INTO total_student_assets, student_count
  FROM students s
  LEFT JOIN accounts a ON s.id = a.student_id
  WHERE s.id NOT IN (
    SELECT id FROM economic_entities 
    WHERE entity_type IN ('government', 'bank', 'securities')
  )
  AND a.account_type IN ('checking', 'savings', 'investment');
  
  -- 가격 계산: 총 학생 자산 / (학생 수 * 10)
  IF student_count > 0 AND total_student_assets > 0 THEN
    calculated_price := (total_student_assets / (student_count * 10))::INTEGER;
  ELSE
    calculated_price := 100000; -- 기본 가격 10만원
  END IF;
  
  -- 최소 가격 보장 (1만원)
  IF calculated_price < 10000 THEN
    calculated_price := 10000;
  END IF;
  
  RETURN calculated_price;
END;
$$ LANGUAGE plpgsql;

-- 8. 좌석 가격 업데이트 함수
CREATE OR REPLACE FUNCTION update_all_seat_prices()
RETURNS VOID AS $$
DECLARE
  new_price INTEGER;
BEGIN
  -- 새로운 가격 계산
  new_price := calculate_seat_price();
  
  -- 소유되지 않은 좌석들의 가격 업데이트
  UPDATE classroom_seats 
  SET 
    current_price = new_price,
    updated_at = NOW()
  WHERE owner_id IS NULL;
END;
$$ LANGUAGE plpgsql;

-- 9. 좌석 구매 함수
CREATE OR REPLACE FUNCTION buy_seat(
  p_student_id UUID,
  p_seat_number INTEGER,
  p_payment_amount INTEGER
) RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  seat_id UUID,
  final_price INTEGER
) AS $$
DECLARE
  v_seat_id UUID;
  v_current_price INTEGER;
  v_student_balance INTEGER;
BEGIN
  -- 좌석 정보 조회
  SELECT id, current_price INTO v_seat_id, v_current_price
  FROM classroom_seats 
  WHERE seat_number = p_seat_number AND owner_id IS NULL AND is_available = true;
  
  IF v_seat_id IS NULL THEN
    RETURN QUERY SELECT false, '해당 좌석을 구매할 수 없습니다.', NULL::UUID, 0;
    RETURN;
  END IF;
  
  -- 학생 잔액 확인 (당좌계좌)
  SELECT balance INTO v_student_balance
  FROM accounts 
  WHERE student_id = p_student_id AND account_type = 'checking';
  
  IF v_student_balance IS NULL OR v_student_balance < v_current_price THEN
    RETURN QUERY SELECT false, '잔액이 부족합니다.', v_seat_id, v_current_price;
    RETURN;
  END IF;
  
  -- 좌석 구매 처리
  UPDATE classroom_seats 
  SET 
    owner_id = p_student_id,
    purchase_price = v_current_price,
    purchase_date = NOW(),
    updated_at = NOW()
  WHERE id = v_seat_id;
  
  -- 학생 잔액 차감 (당좌계좌)
  UPDATE accounts 
  SET balance = balance - v_current_price
  WHERE student_id = p_student_id AND account_type = 'checking';
  
  -- 거래 기록 저장
  INSERT INTO seat_transactions (seat_id, seat_number, buyer_id, transaction_price, transaction_type)
  VALUES (v_seat_id, p_seat_number, p_student_id, v_current_price, 'buy');
  
  -- 모든 좌석 가격 업데이트
  PERFORM update_all_seat_prices();
  
  RETURN QUERY SELECT true, '좌석을 성공적으로 구매했습니다.', v_seat_id, v_current_price;
END;
$$ LANGUAGE plpgsql;

-- 10. 좌석 판매 함수
CREATE OR REPLACE FUNCTION sell_seat(
  p_student_id UUID,
  p_seat_number INTEGER
) RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  sale_price INTEGER
) AS $$
DECLARE
  v_seat_id UUID;
  v_current_price INTEGER;
  v_purchase_price INTEGER;
BEGIN
  -- 소유 좌석 확인
  SELECT id, current_price, purchase_price INTO v_seat_id, v_current_price, v_purchase_price
  FROM classroom_seats 
  WHERE seat_number = p_seat_number AND owner_id = p_student_id AND is_available = true;
  
  IF v_seat_id IS NULL THEN
    RETURN QUERY SELECT false, '소유하지 않은 좌석입니다.', 0;
    RETURN;
  END IF;
  
  -- 현재 시장 가격으로 판매
  v_current_price := calculate_seat_price();
  
  -- 좌석 판매 처리
  UPDATE classroom_seats 
  SET 
    owner_id = NULL,
    current_price = v_current_price,
    purchase_price = 0,
    purchase_date = NULL,
    updated_at = NOW()
  WHERE id = v_seat_id;
  
  -- 학생에게 판매 대금 지급 (당좌계좌)
  UPDATE accounts 
  SET balance = balance + v_current_price
  WHERE student_id = p_student_id AND account_type = 'checking';
  
  -- 거래 기록 저장
  INSERT INTO seat_transactions (seat_id, seat_number, seller_id, transaction_price, transaction_type)
  VALUES (v_seat_id, p_seat_number, p_student_id, v_current_price, 'sell');
  
  -- 모든 좌석 가격 업데이트
  PERFORM update_all_seat_prices();
  
  RETURN QUERY SELECT true, '좌석을 성공적으로 판매했습니다.', v_current_price;
END;
$$ LANGUAGE plpgsql;

-- 11. 초기 좌석 가격 업데이트
SELECT update_all_seat_prices();

-- 12. 테스트 쿼리
SELECT '좌석 배치 확인:' as info;
SELECT seat_number, row_position, column_position, current_price, owner_id IS NOT NULL as is_owned
FROM classroom_seats 
ORDER BY seat_number;

SELECT '좌석 가격 계산 테스트:' as info;
SELECT calculate_seat_price() as calculated_price;

SELECT '🎉 교실 좌석 거래 시스템이 성공적으로 설치되었습니다!' as message;