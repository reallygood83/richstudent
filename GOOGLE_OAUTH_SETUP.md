# 🔐 Google OAuth 설정 가이드

## ⚠️ 중요: 현재 500 에러 해결 방법

Google OAuth 로그인 시 500 에러가 발생하는 경우, 다음 설정이 필요합니다.

## 📋 설정 단계

### 1. Supabase에서 Google OAuth 활성화

1. **Supabase 대시보드** 접속: https://supabase.com/dashboard
2. **프로젝트 선택**: awaqxwydesqmorbglnam
3. **Authentication** → **Providers** 메뉴로 이동
4. **Google** 제공자 찾기
5. **Enable** 토글을 켜기
6. **Client ID**와 **Client Secret** 설정 (아래 참조)

### 2. Google Cloud Console 설정

1. **Google Cloud Console** 접속: https://console.cloud.google.com
2. 새 프로젝트 생성 또는 기존 프로젝트 선택
3. **APIs & Services** → **Credentials** 이동
4. **Create Credentials** → **OAuth 2.0 Client IDs** 선택
5. **Application type**: Web application
6. **Authorized redirect URIs** 추가:
   ```
   https://awaqxwydesqmorbglnam.supabase.co/auth/v1/callback
   ```
7. **Client ID**와 **Client Secret** 복사

### 3. Supabase에 Google 인증 정보 입력

1. Supabase **Authentication** → **Providers** → **Google**
2. 위에서 복사한 **Client ID** 입력
3. **Client Secret** 입력
4. **Save** 클릭

### 4. 데이터베이스 스키마 업데이트

Supabase SQL Editor에서 다음 스크립트 실행:

```sql
-- Google OAuth 컬럼 추가 (기존 teachers 테이블이 있는 경우)
DO $$
BEGIN
    -- auth_provider 컬럼 추가
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teachers' AND column_name = 'auth_provider') THEN
        ALTER TABLE teachers ADD COLUMN auth_provider VARCHAR(20) DEFAULT 'email';
    END IF;
    
    -- google_id 컬럼 추가
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teachers' AND column_name = 'google_id') THEN
        ALTER TABLE teachers ADD COLUMN google_id VARCHAR(255);
    END IF;
    
    -- profile_image_url 컬럼 추가
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teachers' AND column_name = 'profile_image_url') THEN
        ALTER TABLE teachers ADD COLUMN profile_image_url TEXT;
    END IF;
    
    -- email_verified 컬럼 추가
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teachers' AND column_name = 'email_verified') THEN
        ALTER TABLE teachers ADD COLUMN email_verified BOOLEAN DEFAULT false;
    END IF;
END $$;

-- password_hash를 nullable로 변경
ALTER TABLE teachers ALTER COLUMN password_hash DROP NOT NULL;

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_teachers_google_id ON teachers(google_id);
CREATE INDEX IF NOT EXISTS idx_teachers_auth_provider ON teachers(auth_provider);
```

## 🧪 테스트 방법

1. https://richstudent.vercel.app/auth/login 접속
2. **"구글로 로그인"** 버튼 클릭
3. Google 계정 선택
4. 권한 승인
5. 자동으로 대시보드로 이동 확인

## ❌ 문제 해결

### "Error 400: redirect_uri_mismatch"
- Google Cloud Console에서 Redirect URI가 정확한지 확인
- URI: `https://awaqxwydesqmorbglnam.supabase.co/auth/v1/callback`

### "500 Internal Server Error"
- Supabase에서 Google OAuth가 활성화되었는지 확인
- 데이터베이스에 OAuth 컬럼이 추가되었는지 확인
- Client ID/Secret이 올바르게 입력되었는지 확인

### "계정 동기화 실패"
- teachers 테이블에 필요한 컬럼들이 모두 있는지 확인
- 브라우저 개발자 도구 콘솔에서 상세 에러 확인

## 🔄 개발 모드 테스트

로컬 개발 시에는:
```
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

프로덕션에서는:
```
NEXT_PUBLIC_APP_URL=https://richstudent.vercel.app
```

---

**설정 완료 후 Google OAuth로 빠르고 안전하게 로그인할 수 있습니다!**