-- news_explanations 테이블 RLS 정책 수정
-- AI 설명 생성 시 삽입 가능하도록 정책 업데이트

-- 기존 정책 삭제
DROP POLICY IF EXISTS "news_explanations_select_policy" ON news_explanations;
DROP POLICY IF EXISTS "news_explanations_insert_policy" ON news_explanations;
DROP POLICY IF EXISTS "news_explanations_update_policy" ON news_explanations;

-- RLS 비활성화 (개발 편의성)
ALTER TABLE news_explanations DISABLE ROW LEVEL SECURITY;

-- 또는 RLS를 유지하려면 아래 정책 사용:
-- ALTER TABLE news_explanations ENABLE ROW LEVEL SECURITY;
--
-- CREATE POLICY "news_explanations_select_policy" ON news_explanations
--   FOR SELECT USING (true);
--
-- CREATE POLICY "news_explanations_insert_policy" ON news_explanations
--   FOR INSERT WITH CHECK (true);
--
-- CREATE POLICY "news_explanations_update_policy" ON news_explanations
--   FOR UPDATE USING (true);

-- 검증
SELECT tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'news_explanations';
