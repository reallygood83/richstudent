-- ====================================================
-- 교실 좌석 테이블에 teacher_id 컬럼 추가 및 멀티테넌트 지원
-- classroom_seats.teacher_id 컬럼 누락 문제 해결
-- ====================================================

-- 1. classroom_seats 테이블에 teacher_id 컬럼 추가
ALTER TABLE classroom_seats 
ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES teachers(id);

-- 2. seat_transactions 테이블에도 teacher_id 컬럼 추가
ALTER TABLE seat_transactions 
ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES teachers(id);

-- 3. 기존 데이터에 teacher_id 설정 (첫 번째 교사 ID 사용)
DO $$
DECLARE
  first_teacher_id UUID;
BEGIN
  -- 첫 번째 교사 ID 가져오기
  SELECT id INTO first_teacher_id FROM teachers ORDER BY created_at LIMIT 1;
  
  IF first_teacher_id IS NOT NULL THEN
    -- 기존 좌석 데이터에 teacher_id 설정
    UPDATE classroom_seats 
    SET teacher_id = first_teacher_id 
    WHERE teacher_id IS NULL;
    
    -- 기존 거래 데이터에 teacher_id 설정
    UPDATE seat_transactions 
    SET teacher_id = first_teacher_id 
    WHERE teacher_id IS NULL;
    
    RAISE NOTICE 'Updated existing data with teacher_id: %', first_teacher_id;
  ELSE
    RAISE NOTICE 'No teachers found - please create a teacher first';
  END IF;
END $$;

-- 4. teacher_id를 NOT NULL로 설정 (향후 데이터 무결성 보장)
-- 주의: 기존 데이터가 모두 업데이트된 후에만 실행
-- ALTER TABLE classroom_seats ALTER COLUMN teacher_id SET NOT NULL;
-- ALTER TABLE seat_transactions ALTER COLUMN teacher_id SET NOT NULL;

-- 5. 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_classroom_seats_teacher ON classroom_seats(teacher_id);
CREATE INDEX IF NOT EXISTS idx_seat_transactions_teacher ON seat_transactions(teacher_id);

-- 6. RLS 정책 업데이트 (멀티테넌트 지원)
DROP POLICY IF EXISTS "Allow all access to classroom_seats" ON classroom_seats;
DROP POLICY IF EXISTS "Allow all access to seat_transactions" ON seat_transactions;

-- 새로운 RLS 정책 - 교사별 데이터 격리
CREATE POLICY "Teacher can access own classroom_seats" ON classroom_seats
  FOR ALL USING (true);  -- 개발 단계에서는 모든 접근 허용

CREATE POLICY "Teacher can access own seat_transactions" ON seat_transactions
  FOR ALL USING (true);  -- 개발 단계에서는 모든 접근 허용

-- 7. 좌석 가격 계산 함수 업데이트 (teacher_id 고려)
CREATE OR REPLACE FUNCTION calculate_seat_price(p_teacher_id UUID, manual_student_count INTEGER DEFAULT NULL)
RETURNS INTEGER AS $$
DECLARE
  total_student_assets BIGINT;
  student_count INTEGER;
  calculated_price INTEGER;
BEGIN
  -- 해당 교사의 학생 자산 계산 (경제 주체 제외)
  SELECT 
    COALESCE(SUM(a.balance), 0)
  INTO total_student_assets
  FROM students s
  LEFT JOIN accounts a ON s.id = a.student_id
  WHERE s.teacher_id = p_teacher_id
  AND s.id NOT IN (
    SELECT id FROM economic_entities 
    WHERE entity_type IN ('government', 'bank', 'securities')
    AND teacher_id = p_teacher_id
  )
  AND a.account_type IN ('checking', 'savings', 'investment');
  
  -- 학생 수 결정 (수동 입력값 우선, 없으면 실제 학생 수)
  IF manual_student_count IS NOT NULL AND manual_student_count > 0 THEN
    student_count := manual_student_count;
  ELSE
    SELECT COUNT(DISTINCT s.id)
    INTO student_count
    FROM students s
    WHERE s.teacher_id = p_teacher_id
    AND s.id NOT IN (
      SELECT id FROM economic_entities 
      WHERE entity_type IN ('government', 'bank', 'securities')
      AND teacher_id = p_teacher_id
    );
  END IF;
  
  -- 새로운 가격 계산: (총 학생 자산 * 0.6) / 학생 수
  IF student_count > 0 AND total_student_assets > 0 THEN
    calculated_price := ((total_student_assets * 0.6) / student_count)::INTEGER;
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

-- 8. 좌석 가격 업데이트 함수 업데이트 (teacher_id 고려)
CREATE OR REPLACE FUNCTION update_all_seat_prices(p_teacher_id UUID, manual_student_count INTEGER DEFAULT NULL)
RETURNS VOID AS $$
DECLARE
  new_price INTEGER;
BEGIN
  -- 새로운 가격 계산 (teacher_id와 수동 학생 수 전달)
  new_price := calculate_seat_price(p_teacher_id, manual_student_count);
  
  -- 해당 교사의 소유되지 않은 좌석들의 가격 업데이트
  UPDATE classroom_seats 
  SET 
    current_price = new_price,
    updated_at = NOW()
  WHERE teacher_id = p_teacher_id 
  AND owner_id IS NULL;
END;
$$ LANGUAGE plpgsql;

-- 9. 좌석 구매 함수 업데이트 (teacher_id 고려)
CREATE OR REPLACE FUNCTION buy_seat(
  p_teacher_id UUID,
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
  -- 해당 교사의 좌석 정보 조회
  SELECT id, current_price INTO v_seat_id, v_current_price
  FROM classroom_seats 
  WHERE teacher_id = p_teacher_id 
  AND seat_number = p_seat_number 
  AND owner_id IS NULL 
  AND is_available = true;
  
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
  INSERT INTO seat_transactions (teacher_id, seat_id, seat_number, buyer_id, transaction_price, transaction_type)
  VALUES (p_teacher_id, v_seat_id, p_seat_number, p_student_id, v_current_price, 'buy');
  
  -- 해당 교사의 모든 좌석 가격 업데이트
  PERFORM update_all_seat_prices(p_teacher_id, NULL);
  
  RETURN QUERY SELECT true, '좌석을 성공적으로 구매했습니다.', v_seat_id, v_current_price;
END;
$$ LANGUAGE plpgsql;

-- 10. 좌석 판매 함수 업데이트 (teacher_id 고려)
CREATE OR REPLACE FUNCTION sell_seat(
  p_teacher_id UUID,
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
  -- 해당 교사의 소유 좌석 확인
  SELECT id, current_price, purchase_price INTO v_seat_id, v_current_price, v_purchase_price
  FROM classroom_seats 
  WHERE teacher_id = p_teacher_id 
  AND seat_number = p_seat_number 
  AND owner_id = p_student_id 
  AND is_available = true;
  
  IF v_seat_id IS NULL THEN
    RETURN QUERY SELECT false, '소유하지 않은 좌석입니다.', 0;
    RETURN;
  END IF;
  
  -- 현재 시장 가격으로 판매
  v_current_price := calculate_seat_price(p_teacher_id, NULL);
  
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
  INSERT INTO seat_transactions (teacher_id, seat_id, seat_number, seller_id, transaction_price, transaction_type)
  VALUES (p_teacher_id, v_seat_id, p_seat_number, p_student_id, v_current_price, 'sell');
  
  -- 해당 교사의 모든 좌석 가격 업데이트
  PERFORM update_all_seat_prices(p_teacher_id, NULL);
  
  RETURN QUERY SELECT true, '좌석을 성공적으로 판매했습니다.', v_current_price;
END;
$$ LANGUAGE plpgsql;

-- 11. 각 교사별로 30개 좌석 생성하는 함수
CREATE OR REPLACE FUNCTION create_seats_for_teacher(p_teacher_id UUID)
RETURNS VOID AS $$
DECLARE
  seat_num INTEGER;
  row_num INTEGER;
  col_num INTEGER;
  existing_seats INTEGER;
BEGIN
  -- 기존 좌석 수 확인
  SELECT COUNT(*) INTO existing_seats
  FROM classroom_seats 
  WHERE teacher_id = p_teacher_id;
  
  -- 이미 좌석이 있으면 종료
  IF existing_seats > 0 THEN
    RAISE NOTICE 'Teacher % already has % seats', p_teacher_id, existing_seats;
    RETURN;
  END IF;
  
  -- 30개 좌석 생성 (6x5 배치)
  FOR seat_num IN 1..30 LOOP
    -- 좌석 번호를 행/열로 변환
    row_num := ((seat_num - 1) / 6) + 1;
    col_num := ((seat_num - 1) % 6) + 1;
    
    INSERT INTO classroom_seats (
      teacher_id,
      seat_number, 
      row_position, 
      column_position, 
      current_price,
      is_available
    ) VALUES (
      p_teacher_id,
      seat_num, 
      row_num, 
      col_num, 
      100000, -- 기본 가격 10만원
      true
    );
  END LOOP;
  
  RAISE NOTICE 'Created 30 seats for teacher %', p_teacher_id;
END;
$$ LANGUAGE plpgsql;

-- 12. 확인 쿼리
SELECT 'classroom_seats 테이블 구조 확인:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'classroom_seats' 
ORDER BY ordinal_position;

SELECT '🎉 classroom_seats 테이블에 teacher_id 컬럼이 성공적으로 추가되었습니다!' as message;