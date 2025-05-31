-- 구글 OAuth 지원을 위한 teachers 테이블 업데이트

-- OAuth 컬럼 추가
ALTER TABLE teachers 
ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(20) DEFAULT 'email',
ADD COLUMN IF NOT EXISTS google_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS profile_image_url TEXT,
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;

-- password_hash를 nullable로 변경 (OAuth 사용자는 비밀번호 불필요)
ALTER TABLE teachers ALTER COLUMN password_hash DROP NOT NULL;

-- 구글 ID 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_teachers_google_id ON teachers(google_id);
CREATE INDEX IF NOT EXISTS idx_teachers_auth_provider ON teachers(auth_provider);

-- 제약 조건 추가: 이메일 로그인은 비밀번호 필수, 구글 로그인은 google_id 필수
ALTER TABLE teachers 
ADD CONSTRAINT check_auth_requirements 
CHECK (
    (auth_provider = 'email' AND password_hash IS NOT NULL) OR
    (auth_provider = 'google' AND google_id IS NOT NULL)
);

SELECT 'Google OAuth 지원이 추가되었습니다!' as message;