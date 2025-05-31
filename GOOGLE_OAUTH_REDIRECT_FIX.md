# 🚨 redirect_uri_mismatch 에러 해결

## ⚠️ 현재 에러: 400 오류: redirect_uri_mismatch

Google Cloud Console의 **승인된 리디렉션 URI** 설정이 잘못되었습니다.

## 🔧 정확한 설정 방법

### Google Cloud Console 설정

**승인된 리디렉션 URI**에 다음 URL을 **정확히** 입력:

```
https://awaqxwydesqmorbglnam.supabase.co/auth/v1/callback
```

⚠️ **중요**: 
- **Supabase 콜백 URL**을 사용해야 함
- `richstudent.vercel.app/auth/callback`이 아님
- Supabase가 OAuth 처리 후 우리 앱으로 리다이렉트

### 현재 설정되어야 할 URL

#### ✅ 올바른 리디렉션 URI
```
https://awaqxwydesqmorbglnam.supabase.co/auth/v1/callback
```

#### ❌ 잘못된 리디렉션 URI
```
https://richstudent.vercel.app/auth/callback
```

### JavaScript 원본은 유지
```
https://richstudent.vercel.app
```

## 🔄 OAuth 흐름 이해

1. **사용자** → Google 로그인 클릭
2. **Google** → Supabase 콜백으로 리다이렉트
3. **Supabase** → 우리 앱(`/auth/callback`)으로 리다이렉트
4. **우리 앱** → 세션 처리 후 대시보드로 이동

## ✅ 수정 후 테스트

1. Google Cloud Console에서 리디렉션 URI 수정
2. https://richstudent.vercel.app/auth/login 접속
3. 구글로 로그인 클릭
4. 에러 없이 OAuth 진행 확인

---

**Supabase 콜백 URL로 수정하면 redirect_uri_mismatch 에러가 해결됩니다!**