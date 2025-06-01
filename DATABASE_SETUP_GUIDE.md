# 경제 주체 테이블 생성 가이드

## 🎯 목적
RichStudent 웹앱에서 경제 주체 기능을 사용하기 위해 `economic_entities` 테이블을 생성합니다.

## 📋 실행 순서

### 1단계: 현재 데이터베이스 구조 확인
```sql
-- STEP1_CHECK_TABLES.sql 파일의 내용을 Supabase SQL 에디터에서 실행
```

**목적**: 현재 데이터베이스에 어떤 테이블들이 있는지 확인

### 2단계: 독립적인 경제 주체 테이블 생성
```sql
-- STEP2_CREATE_SIMPLE_TABLE.sql 파일의 내용을 Supabase SQL 에디터에서 실행
```

**특징**:
- ✅ 다른 테이블과 의존성 없음
- ✅ 외래 키 제약 조건 없음  
- ✅ TEXT 타입 사용으로 호환성 극대화
- ✅ 즉시 사용 가능

## 🔧 테이블 구조

```sql
economic_entities:
├── id (UUID) - Primary Key
├── teacher_id (TEXT) - 교사 식별자
├── entity_type (TEXT) - 'government', 'bank', 'securities'
├── name (TEXT) - 경제 주체 이름
├── balance (NUMERIC) - 잔액
├── created_at (TIMESTAMPTZ) - 생성 시간
└── updated_at (TIMESTAMPTZ) - 수정 시간
```

## ✅ 실행 후 확인 방법

1. **테이블 생성 확인**:
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_name = 'economic_entities';
   ```

2. **데이터 확인**:
   ```sql
   SELECT * FROM economic_entities;
   ```

3. **웹앱에서 테스트**:
   - 교사 대시보드 → 경제 주체 탭
   - "기본 설정" 버튼 클릭
   - 정부, 은행, 증권회사 생성 확인

## 🚨 문제 해결

- **오류 발생 시**: `STEP1_CHECK_TABLES.sql` 결과를 확인하여 실제 테이블 구조 파악
- **권한 오류**: Supabase 프로젝트의 SQL 편집 권한 확인
- **API 오류**: 테이블 생성 후 웹앱을 새로고침

## 🎉 성공 시 사용 가능한 기능

1. **경제 주체 관리**
   - 정부, 은행, 증권회사 생성/편집/삭제
   - 실시간 잔액 조회 및 수정

2. **투자 수수료 연동**
   - 매수 수수료 → 증권회사 계좌
   - 매도 거래세 → 정부 계좌

3. **대출 시스템 준비**
   - 은행 경제 주체를 통한 대출 관리 (다음 단계)