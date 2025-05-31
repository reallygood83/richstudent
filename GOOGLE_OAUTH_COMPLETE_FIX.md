# 🔧 Google OAuth 완전 해결 가이드

## ⚠️ 현재 문제: localhost 리다이렉트

Google OAuth가 `http://localhost:3000/#access_token=...` 형태로 리다이렉트되는 문제를 완전히 해결합니다.

## 🔄 해결 단계

### 1. Google Cloud Console 설정 수정

**Authorized redirect URIs**에서 다음과 같이 수정:

❌ **삭제할 URI:**
```
http://localhost:3000/auth/callback
```

✅ **추가할 URI:**
```
https://richstudent.vercel.app/auth/callback
https://awaqxwydesqmorbglnam.supabase.co/auth/v1/callback
```

### 2. Google Cloud Console JavaScript 원본 설정

**Authorized JavaScript origins**에 다음 추가:
```
https://richstudent.vercel.app
https://awaqxwydesqmorbglnam.supabase.co
```

### 3. Supabase OAuth 설정 확인

Supabase Dashboard → Authentication → Providers → Google:

1. **Client ID**: Google Cloud Console에서 복사한 값
2. **Client Secret**: Google Cloud Console에서 복사한 값
3. **Redirect URL**: `https://awaqxwydesqmorbglnam.supabase.co/auth/v1/callback`

### 4. 코드 수정 완료

이미 다음이 수정되었습니다:
- ✅ 프로덕션에서 강제로 Vercel URL 사용
- ✅ OAuth 콜백에서 URL fragment 처리
- ✅ 세션 토큰 자동 설정

## 🎯 최종 설정 요약

### Google Cloud Console
- **JavaScript 원본**: `https://richstudent.vercel.app`
- **Redirect URI**: `https://awaqxwydesqmorbglnam.supabase.co/auth/v1/callback`

### Supabase
- **Google OAuth 활성화**: ✅
- **Client ID/Secret**: Google에서 가져온 값
- **Redirect URL**: Supabase 기본값 사용

### 코드
- **OAuth 리다이렉트**: 프로덕션에서 `https://richstudent.vercel.app/auth/callback`
- **세션 처리**: URL fragment 토큰 자동 처리

## ✅ 테스트 방법

1. 위 설정들 완료
2. https://richstudent.vercel.app/auth/login 접속
3. **구글로 로그인** 클릭
4. Google 인증 완료
5. `https://richstudent.vercel.app/auth/callback`로 리다이렉트 확인
6. 자동으로 대시보드로 이동

---

**이제 localhost가 아닌 정확한 프로덕션 URL로 OAuth가 작동합니다!**