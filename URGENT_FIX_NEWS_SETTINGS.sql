-- ⚠️ URGENT: Supabase에서 즉시 실행 필요
-- news_settings 테이블에 auto_generate_explanation 컬럼 추가

-- 1. 컬럼이 이미 존재하는지 확인
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'news_settings'
        AND column_name = 'auto_generate_explanation'
    ) THEN
        -- 2. 컬럼 추가
        ALTER TABLE news_settings
        ADD COLUMN auto_generate_explanation BOOLEAN DEFAULT false;

        -- 3. 기존 데이터에 기본값 설정
        UPDATE news_settings
        SET auto_generate_explanation = false
        WHERE auto_generate_explanation IS NULL;

        -- 4. 컬럼 설명 추가
        COMMENT ON COLUMN news_settings.auto_generate_explanation IS
            '뉴스 수집 시 AI 설명 자동 생성 여부';

        RAISE NOTICE 'auto_generate_explanation 컬럼이 성공적으로 추가되었습니다.';
    ELSE
        RAISE NOTICE 'auto_generate_explanation 컬럼이 이미 존재합니다.';
    END IF;
END $$;

-- 5. 검증: 컬럼 구조 확인
SELECT
    column_name,
    data_type,
    column_default,
    is_nullable
FROM
    information_schema.columns
WHERE
    table_name = 'news_settings'
ORDER BY
    ordinal_position;
