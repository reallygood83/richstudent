-- 좌석 배치 설정 스키마 업데이트
-- 교사가 학생 수에 맞게 유연한 좌석 배치를 설정할 수 있도록 지원

-- 1. teachers 테이블에 좌석 배치 설정 컬럼 추가
ALTER TABLE teachers
ADD COLUMN IF NOT EXISTS seat_layout_config JSONB DEFAULT '{
  "total_seats": 30,
  "layout_type": "auto",
  "rows": [
    {"row": 1, "seats": 6},
    {"row": 2, "seats": 6},
    {"row": 3, "seats": 6},
    {"row": 4, "seats": 6},
    {"row": 5, "seats": 6}
  ]
}'::jsonb;

-- 2. 좌석 배치 설정 예시
COMMENT ON COLUMN teachers.seat_layout_config IS '
좌석 배치 설정 (JSON 형식)
- total_seats: 총 좌석 수
- layout_type: "auto" (자동 균등 배치) | "manual" (수동 배치)
- rows: 행별 좌석 수 배열

예시 1 - 자동 배치 (24명, 균등 분배):
{
  "total_seats": 24,
  "layout_type": "auto",
  "rows": [
    {"row": 1, "seats": 4},
    {"row": 2, "seats": 4},
    {"row": 3, "seats": 4},
    {"row": 4, "seats": 6},
    {"row": 5, "seats": 6}
  ]
}

예시 2 - 수동 배치 (22명, 커스텀):
{
  "total_seats": 22,
  "layout_type": "manual",
  "rows": [
    {"row": 1, "seats": 4},
    {"row": 2, "seats": 4},
    {"row": 3, "seats": 4},
    {"row": 4, "seats": 5},
    {"row": 5, "seats": 5}
  ]
}
';

-- 3. 인덱스 추가 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_teachers_seat_layout ON teachers USING GIN (seat_layout_config);

-- 4. 좌석 배치 설정 업데이트 함수
CREATE OR REPLACE FUNCTION update_seat_layout(
  p_teacher_id UUID,
  p_layout_config JSONB
) RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- 좌석 배치 설정 업데이트
  UPDATE teachers
  SET seat_layout_config = p_layout_config,
      updated_at = NOW()
  WHERE id = p_teacher_id;

  -- 결과 반환
  SELECT jsonb_build_object(
    'success', true,
    'layout_config', p_layout_config,
    'updated_at', NOW()
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- 5. 기존 좌석 삭제 및 재생성 함수
CREATE OR REPLACE FUNCTION regenerate_seats(
  p_teacher_id UUID,
  p_layout_config JSONB
) RETURNS JSONB AS $$
DECLARE
  v_row JSONB;
  v_seat_number INT := 1;
  v_row_num INT;
  v_seats_in_row INT;
  v_col_num INT;
  v_total_created INT := 0;
BEGIN
  -- 1. 기존 좌석 삭제 (소유자가 없는 좌석만)
  DELETE FROM classroom_seats
  WHERE teacher_id = p_teacher_id
    AND owner_id IS NULL;

  -- 2. 새로운 좌석 생성
  FOR v_row IN SELECT * FROM jsonb_array_elements(p_layout_config->'rows')
  LOOP
    v_row_num := (v_row->>'row')::INT;
    v_seats_in_row := (v_row->>'seats')::INT;

    -- 각 행의 좌석 생성
    FOR v_col_num IN 1..v_seats_in_row
    LOOP
      INSERT INTO classroom_seats (
        teacher_id,
        seat_number,
        row_position,
        column_position,
        current_price,
        owner_id,
        purchase_price,
        purchase_date,
        is_available
      ) VALUES (
        p_teacher_id,
        v_seat_number,
        v_row_num,
        v_col_num,
        100000, -- 기본 가격 10만원
        NULL,
        0,
        NULL,
        true
      )
      ON CONFLICT (teacher_id, seat_number) DO NOTHING;

      v_seat_number := v_seat_number + 1;
      v_total_created := v_total_created + 1;
    END LOOP;
  END LOOP;

  -- 3. 결과 반환
  RETURN jsonb_build_object(
    'success', true,
    'total_created', v_total_created,
    'layout_config', p_layout_config
  );
END;
$$ LANGUAGE plpgsql;

-- 6. 특정 좌석 삭제 함수 (교사가 개별 좌석 삭제 가능)
CREATE OR REPLACE FUNCTION delete_seat(
  p_teacher_id UUID,
  p_seat_number INT
) RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- 소유자가 없는 좌석만 삭제 가능
  DELETE FROM classroom_seats
  WHERE teacher_id = p_teacher_id
    AND seat_number = p_seat_number
    AND owner_id IS NULL;

  IF FOUND THEN
    SELECT jsonb_build_object(
      'success', true,
      'message', '좌석이 삭제되었습니다.',
      'deleted_seat', p_seat_number
    ) INTO v_result;
  ELSE
    SELECT jsonb_build_object(
      'success', false,
      'message', '좌석을 삭제할 수 없습니다. (소유자가 있거나 존재하지 않음)',
      'seat_number', p_seat_number
    ) INTO v_result;
  END IF;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;
