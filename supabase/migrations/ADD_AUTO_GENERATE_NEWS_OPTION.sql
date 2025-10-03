-- Add auto-generate option to news_settings table

-- 자동 생성 옵션 컬럼 추가
ALTER TABLE news_settings
ADD COLUMN IF NOT EXISTS auto_generate_explanation BOOLEAN DEFAULT false;

-- 기존 데이터에 기본값 설정
UPDATE news_settings
SET auto_generate_explanation = false
WHERE auto_generate_explanation IS NULL;

-- 컬럼 설명 추가
COMMENT ON COLUMN news_settings.auto_generate_explanation IS '뉴스 수집 시 AI 설명 자동 생성 여부';
