# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RichStudent is an economic education simulation platform that allows students to experience virtual economic activities including investments, trading, and loans. This is a modern web application conversion from the original Google Apps Script-based system.

## Development Commands

### Core Commands
```bash
npm run dev          # Start development server with Turbopack (default port 3000)
npm run build        # Production build with TypeScript checking and linting
npm run start        # Start production server
npm run lint         # ESLint checking with Next.js rules
```

### Database Management
The project uses Supabase PostgreSQL with layered schema evolution:

**Core Schema:**
- `supabase-complete-schema.sql` - Complete database schema with all features
- `CREATE_ANALYTICS_TABLES.sql` - Beta testing analytics and monitoring tables

**Development Schemas:**
- `PHASE3_TRANSACTIONS_SCHEMA_FIXED.sql` - Advanced transaction and multi-transfer system
- `PHASE6_INVESTMENT_SCHEMA.sql` - Investment portfolio and market data tables
- `LOAN_SYSTEM_SCHEMA_FIXED.sql` - Credit score based lending system
- `CLASSROOM_SEATS_SCHEMA_FIXED.sql` - Real estate (seat) trading system

**Debugging Tools:**
- `CHECK_DATABASE_STRUCTURE.sql` - Verify table existence and relationships
- `QUICK_DIAGNOSTIC.sql` - Check data integrity and common issues

### Debug and Testing APIs
```bash
# Test data management
curl -X POST http://localhost:3000/api/debug/create-test-data    # Create complete test environment
curl http://localhost:3000/api/debug/check-data                 # Verify database state

# Market data testing
curl -X POST http://localhost:3000/api/market-data/update       # Update real-time prices
curl http://localhost:3000/api/market-data                     # Check current market data

# Analytics testing
curl http://localhost:3000/api/admin/analytics                  # Beta test metrics
curl http://localhost:3000/api/admin/analytics/export          # Export analytics CSV
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

### Economic Simulation System
The platform provides a comprehensive economic environment with:

**Account Management:**
- **Account Types:** Checking, Savings, Investment accounts per student
- **Multi-Currency Support:** USD assets converted to KRW via exchange rates
- **Balance Aggregation:** Real-time total balance calculation across accounts

**Transaction System:**
- **Individual Transfers:** Student-to-student money transfers with validation
- **Multi-Transfer:** Send to multiple recipients simultaneously (individual or equal amounts)
- **Allowance Distribution:** Bulk payment system with flexible amount settings
- **Tax Collection:** Government tax system with percentage or fixed rates

**Investment & Trading:**
- **Market Assets:** Real-time stock, crypto, commodity, and forex data via Yahoo Finance
- **Portfolio Management:** Track holdings, gains/losses, and performance
- **Decimal Trading:** Fractional quantities for assets like Gold, Bitcoin
- **Real Estate Trading:** Classroom seats as tradeable assets with dynamic pricing

**Credit & Lending:**
- **Credit Score System:** 350-850 range affecting loan eligibility and rates
- **Loan Applications:** Bank entity provides loans based on creditworthiness
- **Interest Calculations:** Dynamic interest rates based on credit scores

**Economic Entities:**
- **Government:** Tax collection, fund distribution, policy implementation
- **Bank:** Loan processing, credit evaluation, interest management
- **Securities:** Transaction fees (0.1% brokerage, 0.2% tax on sales)

### Advanced Features

**Market Data Integration:**
- **Yahoo Finance API:** Real-time price feeds with symbol mapping
- **Exchange Rate Handling:** Special JPY/KRW rate via ExchangeRate-API due to Yahoo limitations
- **Price Updates:** 30-minute auto-refresh with manual update capability
- **Fallback System:** Random price generation when API fails

**Analytics & Monitoring:**
- **Admin Dashboard:** `/admin/analytics` for beta testing metrics
- **Supabase Usage Tracking:** Database, API, bandwidth, and connection monitoring
- **User Activity Analysis:** DAU/WAU/MAU, session duration, transaction patterns
- **Export Capabilities:** CSV download with comprehensive statistics
- **Alert System:** Resource usage warnings and critical notifications

**Bulk Operations:**
- **Student Registration:** CSV/TSV import with validation and account setup
- **Multi-Transfer:** Simultaneous transfers to multiple recipients
- **Tax Collection:** Bulk tax processing with configurable rates
- **Market Updates:** Batch price updates across all assets

### Development Phases
**Phase 1-4: Completed**
- Multi-tenant teacher authentication system
- Student management with bulk import capabilities
- Advanced transaction system (transfers, allowances, multi-transfer, tax collection)
- Investment platform with real-time market data

**Phase 5-6: Completed**
- Credit score and loan system with dynamic interest rates
- Real estate (classroom seat) trading with price discovery
- Comprehensive portfolio management and trading interface
- Economic entities (Government, Bank, Securities) with full functionality

**Phase 7: Analytics & Monitoring**
- Beta testing analytics dashboard with real-time metrics
- Supabase resource monitoring and usage optimization
- User behavior tracking and engagement analysis
- Export and reporting capabilities for performance evaluation

**Key Implementation Notes:**
- Supabase RLS policies selectively disabled for development efficiency
- TypeScript strict mode with comprehensive interface definitions
- React 19 with Next.js 15 and Turbopack for optimal performance
- Shadcn/ui component library with Tailwind CSS v4
- Real-time data synchronization via Supabase real-time subscriptions

### Testing and Debugging

**Test Environment Setup:**
Use `/api/debug/create-test-data` to generate complete test environment:
- Test teacher (email: test@teacher.com, session code: TEST123)
- Test students (S001-S005) with diverse account balances
- Economic entities (Government, Bank, Securities) with initial balances
- Sample market assets with realistic prices
- Test transactions demonstrating all system features

**Frontend Testing Shortcuts:**
1. Teacher Dashboard: Login with test@teacher.com / password123
2. Student Interface: Use session code TEST123 with student codes S001-S005
3. Market Data: Use "가격 업데이트" button to test real-time feeds
4. Analytics: Access `/admin/analytics` for system monitoring

**API Testing Examples:**
```bash
# Multi-transfer testing
curl -X POST http://localhost:3000/api/transactions/multi-transfer \
  -H "Content-Type: application/json" \
  -d '{"from_student_id":"uuid","recipients":[...],"transfer_type":"equal"}'

# Tax collection testing  
curl -X POST http://localhost:3000/api/transactions/tax-collection \
  -H "Content-Type: application/json" \
  -d '{"tax_type":"percentage","percentage_rate":10,"student_ids":[...]}'

# Bulk student creation
curl -X POST http://localhost:3000/api/students/bulk-create \
  -H "Content-Type: application/json" \
  -d '{"students":[{"name":"김철수","student_code":"S100"}]}'
```

### Error Resolution Patterns

**Database Connection Issues:**
- Check Supabase connection in `.env.local`
- Verify RLS policies with `FIX_RLS_POLICY.sql`
- Run `CHECK_DATABASE_STRUCTURE.sql` to verify table existence

**Market Data Problems:**
- JPY/KRW exchange rate uses alternative API (ExchangeRate-API)
- Yahoo Finance rate limits resolved with 200ms delays between requests
- Check API responses in browser network tab for debugging

**Performance Issues:**
- Monitor Supabase usage via `/admin/analytics`
- Check API request limits and database storage
- Use `CREATE_ANALYTICS_TABLES.sql` for performance tracking

**Common Build Issues:**
- ESLint unused variable errors: Remove unused imports
- TypeScript strict mode: Ensure all props and types are defined
- Next.js 15 compatibility: Use React 19 compatible patterns

### Beta Testing & Analytics

**Analytics Dashboard Access:**
Visit `/admin/analytics` for comprehensive beta testing metrics including:
- Real-time user activity (DAU/WAU/MAU)
- Supabase resource usage monitoring with usage percentage alerts
- System performance metrics (response time, error rate, uptime)
- Growth trends and user engagement analysis

**Resource Monitoring:**
The system tracks Supabase free tier limits:
- Database: 500MB storage (check via analytics dashboard)
- API Requests: 50,000/month (automatically monitored)
- Bandwidth: 5GB/month (tracked in real-time)
- Connections: 200 concurrent (live monitoring)

**Data Export:**
Use analytics export function for detailed reporting:
- Teacher and student registration statistics
- Transaction volume and patterns analysis  
- Daily activity trends and engagement metrics
- System performance and stability reports

### Deployment

**Vercel Configuration:**
- Automatic GitHub integration with branch previews
- Environment variables configured in Vercel dashboard
- Build optimization with Next.js 15 and Turbopack
- Edge runtime for optimal global performance

**Required Environment Variables:**
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_APP_URL=https://your-app-domain.vercel.app
```

**Database Setup:**
1. Run `supabase-complete-schema.sql` for full schema
2. Execute `CREATE_ANALYTICS_TABLES.sql` for monitoring
3. Use `INSERT_MARKET_DATA.sql` for initial market assets
4. Configure RLS policies via `FIX_RLS_POLICY.sql` if needed