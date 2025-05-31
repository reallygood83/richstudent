# 🚀 RichStudent 배포 가이드

## Vercel 배포 단계

### 1. GitHub 리포지토리 생성
```bash
git init
git add .
git commit -m "Initial commit: RichStudent web application"
git remote add origin https://github.com/reallygood83/richstudent.git
git push -u origin main
```

### 2. Supabase 프로젝트 설정
이미 생성된 Supabase 프로젝트 정보:
- **Project URL**: `https://awaqxwydesqmorbglnam.supabase.co`
- **Anon Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### 3. Vercel 배포
1. https://vercel.com 접속
2. GitHub 계정으로 로그인
3. "New Project" 클릭
4. `richstudent` 리포지토리 선택
5. 환경 변수 설정:

```
NEXT_PUBLIC_SUPABASE_URL=https://awaqxwydesqmorbglnam.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3YXF4d3lkZXNxbW9yYmdsbmFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg2OTY3MjUsImV4cCI6MjA2NDI3MjcyNX0.Dyatq8_9LLgcVLMmd0SFNztEyqG8l1sg3mwrxPMNh1g
NODE_ENV=production
```

6. "Deploy" 클릭

### 4. 도메인 설정 (선택사항)
- Vercel에서 자동 생성된 도메인: `richstudent.vercel.app`
- 커스텀 도메인 연결 가능

## 🔧 로컬 개발 환경

### 필수 요구사항
- Node.js 18+
- npm 또는 yarn

### 설치 및 실행
```bash
# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env.local
# .env.local 파일을 열어서 Supabase 정보 입력

# 개발 서버 실행
npm run dev
```

### 환경 변수
`.env.local` 파일에 다음 내용 추가:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 📊 Supabase 데이터베이스 설정

배포 후 Supabase SQL Editor에서 다음 스크립트들을 실행해야 합니다:

1. `supabase-schema.sql` - 기본 데이터베이스 스키마
2. `supabase-rls-fix.sql` - RLS 정책 수정 (개발용)

## 🧪 테스트

배포 완료 후 다음을 테스트:

1. **홈페이지**: https://richstudent.vercel.app
2. **회원가입**: https://richstudent.vercel.app/auth/register
3. **로그인**: https://richstudent.vercel.app/auth/login
4. **데모 계정**: 
   - 이메일: demo@richstudent.com
   - 비밀번호: demo1234

## 🔍 문제 해결

### 일반적인 오류들:
1. **환경 변수 오류**: Vercel 대시보드에서 환경 변수 재확인
2. **데이터베이스 연결 오류**: Supabase 프로젝트 상태 확인
3. **빌드 오류**: 로컬에서 `npm run build` 테스트

### 로그 확인:
- Vercel 대시보드 → Functions 탭 → 오류 로그 확인
- 브라우저 개발자 도구 → Console 탭 → 클라이언트 오류 확인

## 📈 모니터링

### Vercel Analytics
- 자동으로 활성화됨
- 페이지 성능 및 사용자 통계 제공

### 성능 최적화
- Core Web Vitals 점수 확인
- 이미지 최적화 적용
- 코드 분할 및 레이지 로딩

---

**배포 완료 예상 URL**: https://richstudent.vercel.app
**개발자**: Claude (Anthropic)
**프로젝트 관리**: 안양 박달초 김문정