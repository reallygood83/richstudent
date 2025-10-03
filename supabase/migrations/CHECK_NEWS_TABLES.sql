-- 뉴스 시스템 테이블 존재 확인 쿼리

-- 1. 테이블 목록 확인
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('news_settings', 'news_feed', 'news_explanations')
ORDER BY table_name;

-- 2. news_feed 테이블 구조 확인
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'news_feed'
ORDER BY ordinal_position;

-- 3. 현재 저장된 뉴스 개수 확인
SELECT source, COUNT(*) as count
FROM news_feed
GROUP BY source;
