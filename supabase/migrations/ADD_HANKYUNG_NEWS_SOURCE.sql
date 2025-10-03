-- 한국경제 뉴스 소스 추가
-- 생성일: 2025-10-03

-- 기존 제약 조건 삭제
ALTER TABLE news_feed DROP CONSTRAINT IF EXISTS news_feed_source_check;

-- 새로운 제약 조건 추가 (hankyung 포함)
ALTER TABLE news_feed ADD CONSTRAINT news_feed_source_check
  CHECK (source IN ('maeil', 'yonhap', 'hankyung'));

-- 주석 업데이트
COMMENT ON COLUMN news_feed.source IS '뉴스 출처: maeil(매일경제), yonhap(연합뉴스), hankyung(한국경제)';
