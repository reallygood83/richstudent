-- ====================================================
-- 교실 좌석 거래 시스템 완벽한 멀티테넌트 설치 스크립트
-- 각 교사(학급)별 완전히 독립적인 좌석 시스템
-- ====================================================

-- 1. 기존 데이터 완전 정리
DROP TABLE IF EXISTS seat_transactions CASCADE;
DROP TABLE IF EXISTS classroom_seats CASCADE;

-- 기존 함수들 모두 삭제
DROP FUNCTION IF EXISTS calculate_seat_price(UUID, INTEGER);
DROP FUNCTION IF EXISTS calculate_seat_price(INTEGER);
DROP FUNCTION IF EXISTS calculate_seat_price();
DROP FUNCTION IF EXISTS update_all_seat_prices(UUID, INTEGER);
DROP FUNCTION IF EXISTS update_all_seat_prices(INTEGER);
DROP FUNCTION IF EXISTS update_all_seat_prices();
DROP FUNCTION IF EXISTS buy_seat(UUID, UUID, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS buy_seat(UUID, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS sell_seat(UUID, UUID, INTEGER);
DROP FUNCTION IF EXISTS sell_seat(UUID, INTEGER);
DROP FUNCTION IF EXISTS create_seats_for_teacher(UUID);

-- 2. classroom_seats 테이블 생성 (teacher_id 필수)
CREATE TABLE classroom_seats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  seat_number INTEGER NOT NULL, -- 1-30번 좌석
  row_position INTEGER NOT NULL, -- 1-5행
  column_position INTEGER NOT NULL, -- 1-6열
  current_price INTEGER NOT NULL DEFAULT 100000,
  owner_id UUID REFERENCES students(id) ON DELETE SET NULL,
  purchase_price INTEGER DEFAULT 0,
  purchase_date TIMESTAMP WITH TIME ZONE,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- 각 교사별로 좌석 번호 유일성 보장
  UNIQUE(teacher_id, seat_number)
);

-- 3. seat_transactions 테이블 생성 (teacher_id 필수)
CREATE TABLE seat_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  seat_id UUID NOT NULL REFERENCES classroom_seats(id) ON DELETE CASCADE,
  seat_number INTEGER NOT NULL,
  buyer_id UUID REFERENCES students(id) ON DELETE SET NULL,
  seller_id UUID REFERENCES students(id) ON DELETE SET NULL,
  transaction_price INTEGER NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('buy', 'sell')),
  transaction_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 인덱스 생성
CREATE INDEX idx_classroom_seats_teacher ON classroom_seats(teacher_id);
CREATE INDEX idx_classroom_seats_number ON classroom_seats(seat_number);
CREATE INDEX idx_classroom_seats_owner ON classroom_seats(owner_id);
CREATE INDEX idx_classroom_seats_teacher_number ON classroom_seats(teacher_id, seat_number);
CREATE INDEX idx_seat_transactions_teacher ON seat_transactions(teacher_id);
CREATE INDEX idx_seat_transactions_seat ON seat_transactions(seat_id);
CREATE INDEX idx_seat_transactions_buyer ON seat_transactions(buyer_id);
CREATE INDEX idx_seat_transactions_seller ON seat_transactions(seller_id);

-- 5. RLS 정책 (개발 단계에서는 모두 허용)
ALTER TABLE classroom_seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE seat_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to classroom_seats" ON classroom_seats FOR ALL USING (true);
CREATE POLICY "Allow all access to seat_transactions" ON seat_transactions FOR ALL USING (true);

-- 6. 좌석 가격 계산 함수 (teacher_id 필수)
CREATE OR REPLACE FUNCTION calculate_seat_price(p_teacher_id UUID, manual_student_count INTEGER DEFAULT NULL)
RETURNS INTEGER AS $$
DECLARE
  total_student_assets BIGINT;
  student_count INTEGER;
  calculated_price INTEGER;
BEGIN
  -- 해당 교사의 학생 자산만 계산 (경제 주체 제외)
  SELECT
    COALESCE(SUM(a.balance), 0)
  INTO total_student_assets
  FROM students s
  LEFT JOIN accounts a ON s.id = a.student_id
  WHERE s.teacher_id = p_teacher_id
  AND s.id NOT IN (
    SELECT student_id FROM economic_entities
    WHERE teacher_id = p_teacher_id
    AND entity_type IN ('government', 'bank', 'securities')
  )
  AND a.account_type IN ('checking', 'savings', 'investment');

  -- 해당 교사의 학생 수 계산
  IF manual_student_count IS NOT NULL AND manual_student_count > 0 THEN
    student_count := manual_student_count;
  ELSE
    SELECT COUNT(DISTINCT s.id)
    INTO student_count
    FROM students s
    WHERE s.teacher_id = p_teacher_id
    AND s.id NOT IN (
      SELECT student_id FROM economic_entities
      WHERE teacher_id = p_teacher_id
      AND entity_type IN ('government', 'bank', 'securities')
    );
  END IF;

  -- 가격 계산: (총 학생 자산 × 60%) ÷ 학생 수
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

-- 7. 모든 좌석 가격 업데이트 함수 (teacher_id 필수)
CREATE OR REPLACE FUNCTION update_all_seat_prices(p_teacher_id UUID, manual_student_count INTEGER DEFAULT NULL)
RETURNS VOID AS $$
DECLARE
  new_price INTEGER;
BEGIN
  new_price := calculate_seat_price(p_teacher_id, manual_student_count);

  -- 해당 교사의 소유되지 않은 좌석만 업데이트
  UPDATE classroom_seats
  SET
    current_price = new_price,
    updated_at = NOW()
  WHERE teacher_id = p_teacher_id
  AND owner_id IS NULL;
END;
$$ LANGUAGE plpgsql;

-- 8. 좌석 구매 함수 (teacher_id 필수)
CREATE OR REPLACE FUNCTION buy_seat(
  p_teacher_id UUID,
  p_student_id UUID,
  p_seat_number INTEGER,
  p_payment_amount INTEGER DEFAULT 0
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
  -- 해당 교사의 좌석만 조회
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

  -- 학생 잔액 확인
  SELECT balance INTO v_student_balance
  FROM accounts
  WHERE student_id = p_student_id AND account_type = 'checking';

  IF v_student_balance IS NULL OR v_student_balance < v_current_price THEN
    RETURN QUERY SELECT false, '잔액이 부족합니다.', v_seat_id, v_current_price;
    RETURN;
  END IF;

  -- 좌석 구매
  UPDATE classroom_seats
  SET
    owner_id = p_student_id,
    purchase_price = v_current_price,
    purchase_date = NOW(),
    updated_at = NOW()
  WHERE id = v_seat_id;

  -- 잔액 차감
  UPDATE accounts
  SET balance = balance - v_current_price
  WHERE student_id = p_student_id AND account_type = 'checking';

  -- 거래 기록
  INSERT INTO seat_transactions (teacher_id, seat_id, seat_number, buyer_id, transaction_price, transaction_type)
  VALUES (p_teacher_id, v_seat_id, p_seat_number, p_student_id, v_current_price, 'buy');

  -- 좌석 가격 업데이트
  PERFORM update_all_seat_prices(p_teacher_id, NULL);

  RETURN QUERY SELECT true, '좌석을 성공적으로 구매했습니다.', v_seat_id, v_current_price;
END;
$$ LANGUAGE plpgsql;

-- 9. 좌석 판매 함수 (teacher_id 필수)
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
BEGIN
  -- 해당 교사의 소유 좌석만 조회
  SELECT id INTO v_seat_id
  FROM classroom_seats
  WHERE teacher_id = p_teacher_id
  AND seat_number = p_seat_number
  AND owner_id = p_student_id
  AND is_available = true;

  IF v_seat_id IS NULL THEN
    RETURN QUERY SELECT false, '소유하지 않은 좌석입니다.', 0;
    RETURN;
  END IF;

  -- 현재 시장 가격 계산
  v_current_price := calculate_seat_price(p_teacher_id, NULL);

  -- 좌석 판매
  UPDATE classroom_seats
  SET
    owner_id = NULL,
    current_price = v_current_price,
    purchase_price = 0,
    purchase_date = NULL,
    updated_at = NOW()
  WHERE id = v_seat_id;

  -- 판매 대금 지급
  UPDATE accounts
  SET balance = balance + v_current_price
  WHERE student_id = p_student_id AND account_type = 'checking';

  -- 거래 기록
  INSERT INTO seat_transactions (teacher_id, seat_id, seat_number, seller_id, transaction_price, transaction_type)
  VALUES (p_teacher_id, v_seat_id, p_seat_number, p_student_id, v_current_price, 'sell');

  -- 좌석 가격 업데이트
  PERFORM update_all_seat_prices(p_teacher_id, NULL);

  RETURN QUERY SELECT true, '좌석을 성공적으로 판매했습니다.', v_current_price;
END;
$$ LANGUAGE plpgsql;

-- 10. 교사별 30개 좌석 자동 생성 함수
CREATE OR REPLACE FUNCTION create_seats_for_teacher(p_teacher_id UUID)
RETURNS TEXT AS $$
DECLARE
  seat_num INTEGER;
  row_num INTEGER;
  col_num INTEGER;
  existing_count INTEGER;
BEGIN
  -- 기존 좌석 확인
  SELECT COUNT(*) INTO existing_count
  FROM classroom_seats
  WHERE teacher_id = p_teacher_id;

  IF existing_count > 0 THEN
    RETURN format('교사 ID %s는 이미 %s개의 좌석이 있습니다.', p_teacher_id, existing_count);
  END IF;

  -- 30개 좌석 생성 (6x5 배치)
  FOR seat_num IN 1..30 LOOP
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
      100000,
      true
    );
  END LOOP;

  -- 가격 업데이트
  PERFORM update_all_seat_prices(p_teacher_id, NULL);

  RETURN format('교사 ID %s를 위한 30개 좌석이 생성되었습니다.', p_teacher_id);
END;
$$ LANGUAGE plpgsql;

-- 11. 모든 교사를 위한 좌석 자동 생성
DO $$
DECLARE
  teacher_record RECORD;
  result_message TEXT;
BEGIN
  FOR teacher_record IN SELECT id FROM teachers ORDER BY created_at
  LOOP
    result_message := create_seats_for_teacher(teacher_record.id);
    RAISE NOTICE '%', result_message;
  END LOOP;
END $$;

-- 12. 확인 쿼리
SELECT '=== 교실 좌석 시스템 설치 완료 ===' as status;

SELECT
  t.email as teacher_email,
  COUNT(cs.id) as total_seats,
  COUNT(CASE WHEN cs.owner_id IS NOT NULL THEN 1 END) as owned_seats,
  COUNT(CASE WHEN cs.owner_id IS NULL THEN 1 END) as available_seats,
  MAX(cs.current_price) as current_price
FROM teachers t
LEFT JOIN classroom_seats cs ON t.id = cs.teacher_id
GROUP BY t.id, t.email
ORDER BY t.created_at;

SELECT '✅ 각 교사별 독립적인 좌석 시스템이 성공적으로 설치되었습니다!' as message;
