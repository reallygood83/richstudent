-- ====================================================
-- 1단계: 현재 데이터베이스 테이블 구조 확인
-- Supabase SQL 에디터에서 이 쿼리를 먼저 실행하세요
-- ====================================================

-- 1. 모든 테이블 목록 확인
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- 2. teachers 테이블이 있는지 확인
SELECT EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'teachers'
) AS teachers_table_exists;

-- 3. teachers 테이블의 컬럼 구조 확인 (테이블이 존재하는 경우)
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'teachers' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. students 테이블이 있는지 확인
SELECT EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'students'
) AS students_table_exists;

-- 5. students 테이블의 컬럼 구조 확인 (테이블이 존재하는 경우)
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'students' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 이 결과를 보고 실제 컬럼명을 확인한 후 다음 단계로 진행하세요!