# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RichStudent is an economic education simulation platform that allows students to experience virtual economic activities including investments, trading, and loans. This is a modern web application conversion from the original Google Apps Script-based system.

**Live Deployment:**
- Primary Domain: https://richstudent.dev
- Alternate Domain: https://richstudent.vercel.app

**Tech Stack:**
- Next.js 15 with React 19 and Turbopack
- TypeScript with strict mode
- Supabase PostgreSQL database
- Shadcn/ui component library with Tailwind CSS v4
- Google OAuth 2.0 for teacher authentication
- Gemini 2.0 Flash Experimental AI for educational content
- RSS Parser for Korean economic news feeds
- Yahoo Finance API for real-time market data

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
- `ADD_AUTO_GENERATE_NEWS_OPTION.sql` - News settings auto-generation toggle
- `FIX_NEWS_EXPLANATIONS_RLS.sql` - Disable RLS on news_explanations table

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

# News system testing
curl http://localhost:3000/api/news/list                        # Fetch news feed
curl -X POST http://localhost:3000/api/news/fetch               # Refresh RSS feeds
curl -X POST http://localhost:3000/api/news/generate-explanation \
  -H "Content-Type: application/json" \
  -d '{"newsId":"uuid"}'                                         # Generate AI explanation
curl http://localhost:3000/api/news/settings                    # Get news settings
curl -X PUT http://localhost:3000/api/news/settings \
  -H "Content-Type: application/json" \
  -d '{"gemini_api_key":"key","student_level":"elementary"}'   # Update settings
```

## Architecture

### Multi-Tenant System Design
The application operates with strict teacher-student isolation:
- Each teacher has a unique `session_code` for student access
- Students belong to specific teachers via `teacher_id` foreign keys
- All data queries are scoped by teacher to ensure isolation

### Authentication Flow
**Teacher Authentication:**
- **Google OAuth 2.0:** Primary authentication method via `/auth/google/callback`
- **Email/Password:** Alternative authentication with session-based auth
- HTTP-only cookies for session management
- Password hashing with email salt
- Session validation on protected routes

**Student Authentication:**
- Session code + student code based login
- Optional password protection per student
- Temporary session tokens (8-hour expiry)

### Database Structure
Key tables with relationships:
```
teachers (id, session_code, email, password_hash, google_id)
├── students (teacher_id, student_code, name)
│   ├── accounts (student_id, account_type: checking/savings/investment)
│   └── transactions (from_student_id, to_student_id, amount)
├── economic_entities (teacher_id, entity_type: government/bank/securities)
└── news_settings (teacher_id, gemini_api_key, student_level, auto_generate_explanation)
    ├── news_feed (title, description, link, source, pub_date)
    └── news_explanations (news_id, student_level, explanation)
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
- `/api/auth/*` - Teacher authentication (login, register, Google OAuth callback)
- `/api/student/*` - Student-specific operations
- `/api/students/*` - Teacher management of students
- `/api/transactions/*` - Financial operations
- `/api/news/*` - News feed and AI explanation generation
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

**News & AI System:**
- **RSS Feed Aggregation:** Automatic parsing of Korean economic news from multiple sources
  - Maeil Economic Daily (매일경제)
  - Yonhap News (연합뉴스)
  - Hankyung (한국경제)
- **Auto-Refresh:** Configurable intervals (15-60 minutes) for automatic news updates
- **Gemini AI Integration:** Educational content generation using Gemini 2.0 Flash Experimental
- **Student-Level Adaptation:** AI explanations tailored to elementary, middle, or high school levels
- **Teacher Controls:** Dedicated settings page for API key management and student level configuration
- **Real-time Generation:** On-demand AI explanation generation with immediate modal updates
- **Optimization:** Single-level generation based on teacher settings (66% API cost reduction)

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

**Phase 7: Analytics & Monitoring - Completed**
- Beta testing analytics dashboard with real-time metrics
- Supabase resource monitoring and usage optimization
- User behavior tracking and engagement analysis
- Export and reporting capabilities for performance evaluation

**Phase 8: News & AI Features - Completed**
- **RSS Feed Integration:** Korean economic news from Maeil, Yonhap, Hankyung sources
- **News Dashboard:** Teacher and student news carousels with auto-refresh (30-minute intervals)
- **Gemini AI Integration:** Gemini 2.0 Flash Experimental for educational content generation
- **AI Explanations:** Student-level appropriate news explanations (elementary, middle, high)
- **Auto-Generation:** Optional automatic AI explanation generation on news fetch
- **News Settings:** Configurable Gemini API key, student level, and auto-generation toggles

**Phase 9: Google OAuth - Completed**
- **OAuth 2.0 Integration:** Google authentication for teacher accounts
- **Dual Authentication:** Support both Google OAuth and email/password login
- **Branded UI:** Google-styled login buttons with official colors and logo
- **Session Management:** Seamless integration with existing session-based auth
- **Domain Configuration:** Production deployment on richstudent.dev

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

**News System Issues:**
- **Missing Database Columns:** Execute emergency migration scripts (URGENT_FIX_NEWS_SETTINGS.sql)
- **RLS Policy Violations:** news_explanations table has RLS disabled via FIX_NEWS_EXPLANATIONS_RLS.sql
- **AI Generation Failures:** Verify Gemini API key in news settings, check teacher's configured student level
- **Real-time Updates:** News modal updates immediately after AI generation via state management

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
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Application URLs
NEXT_PUBLIC_APP_URL=https://richstudent.dev

# Google OAuth (Supabase Dashboard Configuration)
# Add these redirect URLs in Supabase Authentication > URL Configuration:
# - https://richstudent.dev/auth/google/callback
# - https://richstudent.vercel.app/auth/google/callback
```

**Supabase Configuration Steps:**
1. **Google OAuth Setup:**
   - Enable Google provider in Supabase Authentication settings
   - Add authorized redirect URLs for both domains
   - Configure Site URL to https://richstudent.dev

2. **Database Migrations:**
   - Run `supabase-complete-schema.sql` for full schema
   - Execute `CREATE_ANALYTICS_TABLES.sql` for monitoring
   - Apply `ADD_AUTO_GENERATE_NEWS_OPTION.sql` for news features
   - Run `FIX_NEWS_EXPLANATIONS_RLS.sql` to disable RLS on news_explanations

3. **Initial Data:**
   - Use `INSERT_MARKET_DATA.sql` for market assets
   - Configure RLS policies via `FIX_RLS_POLICY.sql` if needed