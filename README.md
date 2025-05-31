# RichStudent Web

**RichStudent**는 학생들의 경제 교육을 위한 가상 경제 시뮬레이션 플랫폼입니다.

## 🎯 프로젝트 개요

기존 Google Apps Script 기반의 RichStudent를 현대적인 웹 애플리케이션으로 전환한 프로젝트입니다. 학생들이 가상 경제 환경에서 투자, 거래, 대출을 경험하며 실용적인 경제 지식을 배울 수 있습니다.

## 🛠️ 기술 스택

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn/ui
- **State Management**: Zustand
- **Data Fetching**: TanStack Query (React Query)

### Backend
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Real-time**: Supabase Real-time
- **API**: Next.js API Routes

### DevOps
- **Deployment**: Vercel
- **Version Control**: Git

## 🚀 개발 환경 설정

### 1. 필수 요구사항
- Node.js 18+ 
- npm 또는 yarn

### 2. 프로젝트 클론 및 설치
```bash
git clone <repository-url>
cd richstudent-web
npm install
```

### 3. 환경 변수 설정
`.env.local` 파일을 생성하고 다음 내용을 추가하세요:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. 개발 서버 실행
```bash
npm run dev
```

## 📁 프로젝트 구조

```
richstudent-web/
├── src/
│   ├── app/                     # Next.js App Router
│   │   ├── auth/               # 인증 페이지
│   │   ├── teacher/            # 교사 대시보드
│   │   ├── student/            # 학생 인터페이스
│   │   └── api/                # API 라우트
│   ├── components/             # 재사용 컴포넌트
│   │   ├── ui/                 # Shadcn/ui 컴포넌트
│   │   ├── auth/               # 인증 관련 컴포넌트
│   │   ├── teacher/            # 교사용 컴포넌트
│   │   ├── student/            # 학생용 컴포넌트
│   │   └── common/             # 공통 컴포넌트
│   ├── lib/                    # 유틸리티 라이브러리
│   │   ├── supabase/          # Supabase 설정
│   │   └── utils/             # 공통 유틸리티
│   ├── hooks/                  # 커스텀 React Hooks
│   ├── stores/                 # Zustand 상태 관리
│   └── types/                  # TypeScript 타입 정의
├── public/                     # 정적 파일
└── docs/                       # 프로젝트 문서
```

## 🎯 주요 기능

### 교사 기능
- [x] 회원가입/로그인
- [ ] 학생 관리 (생성, 편집, 삭제)
- [ ] 가상 경제 환경 설정
- [ ] 실시간 시장 데이터 관리
- [ ] 대시보드를 통한 전체 현황 모니터링

### 학생 기능
- [ ] 학생 로그인
- [ ] 가상 계좌 관리 (당좌, 저축, 투자)
- [ ] 자산 거래 (주식, 암호화폐, 원자재, 부동산)
- [ ] 대출 시스템
- [ ] 거래 내역 추적
- [ ] 포트폴리오 관리

### 고급 기능
- [ ] 실시간 시장 데이터 (Yahoo Finance API)
- [ ] 신용점수 시스템
- [ ] 경제 주체 (정부, 은행, 증권사)
- [ ] 부동산(자리) 거래 시스템

## 🗄️ 데이터베이스 스키마

### 주요 테이블
- `teachers`: 교사 정보
- `students`: 학생 정보
- `accounts`: 계좌 정보
- `transactions`: 거래 내역
- `market_assets`: 시장 자산 데이터
- `portfolio`: 포트폴리오 정보
- `loans`: 대출 정보
- `real_estate`: 부동산(자리) 정보

## 📈 개발 로드맵

### Phase 0: 기반 구조 ✅
- [x] Next.js 프로젝트 초기화
- [x] 기본 UI 컴포넌트 설정
- [x] 타입 정의

### Phase 1: 인증 시스템 (진행중)
- [x] 로그인/회원가입 UI
- [ ] Supabase 인증 연동
- [ ] 세션 관리

### Phase 2: 학생 관리 시스템
- [ ] 학생 CRUD
- [ ] 계좌 시스템
- [ ] 학생 페이지

### Phase 3: 거래 시스템
- [ ] 기본 거래 기능
- [ ] 거래 내역
- [ ] 경제 주체

### Phase 4: 투자 시스템
- [ ] 시장 데이터 연동
- [ ] 자산 거래
- [ ] 포트폴리오

### Phase 5: 고급 기능
- [ ] 대출 시스템
- [ ] 부동산 거래
- [ ] 신용점수

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 라이선스

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 감사의 글

- 기존 Google Apps Script 버전의 설계와 아이디어
- Next.js, Supabase, Tailwind CSS 커뮤니티

---

**개발자**: Claude (Anthropic)  
**프로젝트 관리**: 안양 박달초 김문정  
**버전**: 2.0.0 (웹 버전)  
**최종 업데이트**: 2025년 1월