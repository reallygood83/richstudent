# 🚀 Vercel 환경 변수 설정 가이드

## ⚠️ 중요: Localhost 리다이렉트 문제 해결

현재 Google OAuth가 localhost로 리다이렉트되는 문제를 해결하기 위해 **Vercel 환경 변수**를 설정해야 합니다.

## 📋 Vercel 환경 변수 설정

### 1. Vercel 대시보드 접속
1. **Vercel 대시보드** 접속: https://vercel.com/dashboard
2. **richstudent** 프로젝트 선택
3. **Settings** → **Environment Variables** 메뉴

### 2. 필수 환경 변수 추가

다음 환경 변수들을 **Production**, **Preview**, **Development** 모두에 추가:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://awaqxwydesqmorbglnam.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3YXF4d3lkZXNxbW9yYmdsbmFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg2OTY3MjUsImV4cCI6MjA2NDI3MjcyNX0.Dyatq8_9LLgcVLMmd0SFNztEyqG8l1sg3mwrxPMNh1g

# Application URL (가장 중요!)
NEXT_PUBLIC_APP_URL=https://richstudent.vercel.app

# Development Environment
NODE_ENV=production
```

### 3. 환경 변수 적용 방법

각 환경 변수를 추가할 때:
1. **Name**: 변수 이름 입력 (예: `NEXT_PUBLIC_APP_URL`)
2. **Value**: 변수 값 입력 (예: `https://richstudent.vercel.app`)
3. **Environments**: 
   - ✅ **Production** 체크
   - ✅ **Preview** 체크  
   - ✅ **Development** 체크
4. **Add** 버튼 클릭

### 4. 재배포 필요

환경 변수 설정 후 **반드시 재배포**해야 적용됩니다:
1. **Deployments** 탭으로 이동
2. 최신 배포의 **︙** 메뉴 클릭
3. **Redeploy** 선택
4. **Redeploy** 버튼 클릭

## 🔧 추가 해결책

코드에서도 동적 URL 감지가 추가되었습니다:
- 브라우저에서 실행 시: `window.location.origin` 사용
- 서버에서 실행 시: `process.env.NEXT_PUBLIC_APP_URL` 또는 기본값 사용

## ✅ 테스트 방법

1. 환경 변수 설정 완료
2. Vercel 재배포 완료
3. https://richstudent.vercel.app/auth/login 접속
4. **구글로 로그인** 클릭
5. 이제 localhost가 아닌 richstudent.vercel.app으로 리다이렉트 확인

---

**설정 완료 후 Google OAuth가 올바른 URL로 리다이렉트됩니다!**