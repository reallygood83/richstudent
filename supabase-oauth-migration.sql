-- Google OAuth 마이그레이션 스크립트 (기존 teachers 테이블 업데이트용)
-- 이미 teachers 테이블이 존재하는 경우에만 사용

-- Google OAuth 컬럼들을 안전하게 추가
DO $$
BEGIN
    -- auth_provider 컬럼 추가
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teachers' AND column_name = 'auth_provider') THEN
        ALTER TABLE teachers ADD COLUMN auth_provider VARCHAR(20) DEFAULT 'email';
        RAISE NOTICE 'auth_provider 컬럼이 추가되었습니다.';
    ELSE
        RAISE NOTICE 'auth_provider 컬럼이 이미 존재합니다.';
    END IF;
    
    -- google_id 컬럼 추가
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teachers' AND column_name = 'google_id') THEN
        ALTER TABLE teachers ADD COLUMN google_id VARCHAR(255);
        RAISE NOTICE 'google_id 컬럼이 추가되었습니다.';
    ELSE
        RAISE NOTICE 'google_id 컬럼이 이미 존재합니다.';
    END IF;
    
    -- profile_image_url 컬럼 추가
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teachers' AND column_name = 'profile_image_url') THEN
        ALTER TABLE teachers ADD COLUMN profile_image_url TEXT;
        RAISE NOTICE 'profile_image_url 컬럼이 추가되었습니다.';
    ELSE
        RAISE NOTICE 'profile_image_url 컬럼이 이미 존재합니다.';
    END IF;
    
    -- email_verified 컬럼 추가
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teachers' AND column_name = 'email_verified') THEN
        ALTER TABLE teachers ADD COLUMN email_verified BOOLEAN DEFAULT false;
        RAISE NOTICE 'email_verified 컬럼이 추가되었습니다.';
    ELSE
        RAISE NOTICE 'email_verified 컬럼이 이미 존재합니다.';
    END IF;
END $$;

-- password_hash를 nullable로 변경 (OAuth 사용자는 비밀번호 불필요)
DO $$
BEGIN
    ALTER TABLE teachers ALTER COLUMN password_hash DROP NOT NULL;
    RAISE NOTICE 'password_hash 컬럼이 nullable로 변경되었습니다.';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'password_hash 컬럼은 이미 nullable입니다.';
END $$;

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_teachers_google_id ON teachers(google_id);
CREATE INDEX IF NOT EXISTS idx_teachers_auth_provider ON teachers(auth_provider);

-- OAuth 관련 제약 조건 추가
DO $$
BEGIN
    -- 기존 제약 조건이 있으면 제거
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'check_auth_requirements' AND table_name = 'teachers') THEN
        ALTER TABLE teachers DROP CONSTRAINT check_auth_requirements;
        RAISE NOTICE '기존 check_auth_requirements 제약조건이 제거되었습니다.';
    END IF;
    
    -- 새 제약 조건 추가
    ALTER TABLE teachers 
    ADD CONSTRAINT check_auth_requirements 
    CHECK (
        (auth_provider = 'email' AND password_hash IS NOT NULL) OR
        (auth_provider = 'google' AND google_id IS NOT NULL)
    );
    RAISE NOTICE '새로운 OAuth 제약조건이 추가되었습니다.';
END $$;

SELECT 'Google OAuth 마이그레이션이 완료되었습니다!' as message;