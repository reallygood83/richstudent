# 🗄️ Supabase 데이터베이스 설정 가이드

## 📋 설정 순서

### 1. 기본 스키마 설정 (안전 버전)
```sql
-- Supabase SQL Editor에서 실행
-- 파일: supabase-schema-safe.sql
```
1. Supabase 대시보드에서 **SQL Editor** 열기
2. `supabase-schema-safe.sql` 파일 내용 복사
3. **Run** 버튼 클릭하여 실행

### 2. RLS 정책 설정 (선택사항)
```sql
-- 파일: supabase-rls-policies.sql
```
1. `supabase-rls-policies.sql` 파일 내용 복사
2. **Run** 버튼 클릭하여 실행

## ⚠️ 오류 해결

### "trigger already exists" 오류
- **원인**: 이미 일부 스키마가 실행됨
- **해결**: `supabase-schema-safe.sql` 사용 (기존 트리거 제거 후 재생성)

### "relation already exists" 오류  
- **원인**: 테이블이 이미 존재함
- **해결**: `CREATE TABLE IF NOT EXISTS` 사용으로 안전하게 처리

## ✅ 설정 완료 확인

### 1. 테이블 확인
다음 테이블들이 생성되었는지 확인:
- `teachers` (교사)
- `teacher_sessions` (교사 세션)  
- `students` (학생)
- `accounts` (계좌)
- `market_assets` (시장 자산)
- `portfolio` (포트폴리오)
- `transactions` (거래 내역)
- `loans` (대출)
- `economic_entities` (경제 주체)
- `real_estate` (부동산/자리)

### 2. 함수 확인
다음 함수들이 생성되었는지 확인:
- `update_updated_at_column()`
- `get_teacher_student_count()`
- `get_student_total_assets()`
- `generate_session_code()`

### 3. 테스트 쿼리
```sql
-- 테이블 개수 확인
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- 함수 확인
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
ORDER BY routine_name;
```

## 🔄 스키마 업데이트 시

기존 데이터를 보존하면서 스키마를 업데이트하려면:
1. `supabase-schema-safe.sql` 사용
2. 새로운 컬럼 추가는 `ALTER TABLE` 사용
3. RLS 정책은 `DROP POLICY IF EXISTS` 후 재생성

## 📊 초기 데이터

스키마 설정 후 첫 번째 교사가 회원가입하면:
- 기본 경제 주체 (정부, 은행, 증권사) 자동 생성
- 세션 코드 자동 할당
- 무료 플랜으로 시작 (학생 30명 제한)

---

**설정 완료 후**: 웹 애플리케이션에서 회원가입/로그인 테스트 가능