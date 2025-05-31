# 🎯 Google OAuth 최종 설정 가이드

## ⚠️ redirect_uri_mismatch 오류 해결

현재 **400 오류: redirect_uri_mismatch**가 계속 발생하고 있습니다. 
Google Cloud Console 설정을 정확히 해야 합니다.

## 🔧 Google Cloud Console 정확한 설정

### 1. 승인된 JavaScript 원본
다음 URL들을 **정확히** 추가:
```
https://richstudent.vercel.app
http://localhost:3000
https://awaqxwydesqmorbglnam.supabase.co
```

### 2. 승인된 리디렉션 URI
**반드시 이 URL만** 추가:
```
https://awaqxwydesqmorbglnam.supabase.co/auth/v1/callback
```

⚠️ **주의**: 
- `https://richstudent.vercel.app/auth/google/callback` **추가하지 마세요**
- `http://localhost:3000/auth/callback` **추가하지 마세요**
- **오직 Supabase 콜백 URL만** 사용

## 🔍 현재 설정 확인 방법

### Google Cloud Console에서 확인:
1. **APIs & Services** → **Credentials**
2. **OAuth 2.0 Client IDs** 클릭
3. **Authorized JavaScript origins** 확인
4. **Authorized redirect URIs** 확인

### 올바른 설정 예시:
```
✅ JavaScript origins:
- https://richstudent.vercel.app
- http://localhost:3000  
- https://awaqxwydesqmorbglnam.supabase.co

✅ Redirect URIs:
- https://awaqxwydesqmorbglnam.supabase.co/auth/v1/callback

❌ 추가하면 안 되는 것들:
- https://richstudent.vercel.app/auth/google/callback
- http://localhost:3000/auth/callback
- 기타 모든 콜백 URL
```

## 🔄 OAuth 흐름 이해

1. **사용자** → 구글로 로그인 클릭
2. **Google** → 사용자 인증 진행
3. **Google** → `https://awaqxwydesqmorbglnam.supabase.co/auth/v1/callback`로 리다이렉트
4. **Supabase** → OAuth 처리 후 `https://richstudent.vercel.app/auth/google/callback`로 리다이렉트
5. **우리 앱** → 세션 생성 및 대시보드로 이동

## ✅ 설정 완료 후 테스트

1. Google Cloud Console 설정 저장
2. 브라우저 캐시 삭제 (중요!)
3. https://richstudent.vercel.app/auth/login 접속
4. "구글로 로그인" 클릭
5. redirect_uri_mismatch 오류 없이 진행되는지 확인

## 🚨 자주하는 실수들

- ❌ 우리 앱의 콜백 URL을 Google에 등록
- ❌ 잘못된 도메인 추가
- ❌ HTTP/HTTPS 혼동
- ❌ 브라우저 캐시 문제

---

**Supabase 콜백 URL만 Google에 등록하면 문제가 해결됩니다!**