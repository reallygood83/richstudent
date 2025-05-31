# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RichStudent is an economic education simulation platform that allows students to experience virtual economic activities including investments, trading, and loans. This is a modern web application conversion from the original Google Apps Script-based system.

## Development Commands

### Core Commands
```bash
npm run dev          # Start development server with Turbopack
npm run build        # Production build with TypeScript checking
npm run start        # Start production server
npm run lint         # ESLint checking
```

### Database Management
The project uses Supabase PostgreSQL with multiple schema files for different phases:
- `supabase-complete-schema.sql` - Complete database schema
- `SIMPLE_TRANSACTIONS_SCHEMA.sql` - Basic transaction tables
- `PHASE3_TRANSACTIONS_SCHEMA_FIXED.sql` - Advanced transaction system

### Debug and Testing APIs
```bash
curl -X POST http://localhost:3001/api/debug/create-test-data    # Create test accounts
curl http://localhost:3001/api/debug/check-data                 # Check database state
```

## Architecture

### Multi-Tenant System Design
The application operates with strict teacher-student isolation:
- Each teacher has a unique `session_code` for student access
- Students belong to specific teachers via `teacher_id` foreign keys
- All data queries are scoped by teacher to ensure isolation

### Authentication Flow
**Teacher Authentication:**
- Session-based auth with HTTP-only cookies
- Password hashing with email salt
- Session validation on protected routes

**Student Authentication:**
- Session code + student code based login
- Optional password protection per student
- Temporary session tokens (8-hour expiry)

### Database Structure
Key tables with relationships:
```
teachers (id, session_code, email, password_hash)
├── students (teacher_id, student_code, name)
│   ├── accounts (student_id, account_type: checking/savings/investment)
│   └── transactions (from_student_id, to_student_id, amount)
└── economic_entities (teacher_id, entity_type: government/bank/securities)
```

### Component Architecture
**Shared Types:** Located in `src/types/index.ts` for consistency across components
- `Student` interface with accounts and balance aggregation
- `Transaction` interface with student name mapping

**UI Components:** Shadcn/ui based with Tailwind CSS
- Modular design with separate teacher and student component folders
- Consistent form patterns using controlled components
- Modal-based workflows for complex operations

### API Design Patterns
**Route Structure:**
- `/api/auth/*` - Teacher authentication
- `/api/student/*` - Student-specific operations  
- `/api/students/*` - Teacher management of students
- `/api/transactions/*` - Financial operations
- `/api/debug/*` - Development and testing utilities

**Error Handling:**
All APIs return consistent JSON structure:
```typescript
{ success: boolean, error?: string, data?: any }
```

### State Management
**Authentication:** Custom `useAuth` hook with persistent session checking
**Real-time Updates:** Manual refetch patterns for transaction updates
**Form State:** Local component state with validation

### Transaction System
The core economic simulation includes:
- **Account Types:** Checking, Savings, Investment accounts per student
- **Transfer System:** Student-to-student money transfers with balance validation
- **Allowance Distribution:** Bulk payment system (individual or fixed amounts)
- **Economic Entities:** Government, Bank, Securities with special account management
- **Audit Trail:** Complete transaction history with student name resolution

### Development Phases
**Completed:**
- Phase 1: Teacher authentication system
- Phase 2: Student management with account creation
- Phase 3: Transaction system (transfers, allowances)
- Phase 4: Student interface with dashboard

**Key Implementation Notes:**
- Supabase RLS policies disabled for development (see `FIX_RLS_POLICY.sql`)
- Session validation uses server-side cookies for security
- Real-time balance updates through manual data fetching
- TypeScript strict mode with shared interface definitions

### Testing and Debugging
**Test Data Creation:**
Use `/api/debug/create-test-data` to generate:
- Test teacher (session code: TEST123)
- Test student (code: S001) with preset account balances

**Student Login Testing:**
1. Access `/student/login`
2. Click "🧪 테스트 데이터 생성 및 자동 입력" button
3. Login with auto-populated credentials

### Error Resolution Patterns
**Common Issues:**
- `runtime.lastError` messages are Chrome extension related (ignorable)
- 400 API errors often indicate missing test data
- Session validation failures require fresh login

**Database Issues:**
Check table structure with `CHECK_TABLE_STRUCTURE.sql`
Reset transaction tables with `DROP_AND_CREATE_TRANSACTIONS.sql`

### Deployment
The application is configured for Vercel deployment with:
- Environment variables in `.env.local`
- Build optimization with Next.js 15
- Supabase connection via environment variables
- GitHub integration for automatic deployments