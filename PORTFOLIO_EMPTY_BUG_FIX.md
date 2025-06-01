# Portfolio Empty Bug Fix

## Issue Summary

Students reported that their investment portfolio showed empty ("아직 투자한 자산이 없습니다") even after successfully purchasing stocks. The bug was caused by incomplete student authentication system.

## Root Cause

The student authentication system was incomplete:

1. **Missing Student Sessions Table**: There was no database table to track student login sessions
2. **Hardcoded Student Data**: All APIs were using hardcoded logic to get the "first student" instead of the actually logged-in student
3. **No Session Persistence**: Student sessions were only stored as cookies without database backing

This meant that:
- When Student A logged in and bought stocks, the purchase was recorded for the first student in the database
- When Student A viewed their portfolio, it showed data for the first student (who might not have any investments)
- All students effectively shared the same portfolio (the first student's data)

## Solution Implemented

### 1. Created Student Sessions Table (`CREATE_STUDENT_SESSIONS_TABLE.sql`)
```sql
CREATE TABLE IF NOT EXISTS student_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2. Fixed Student Login API (`/src/app/api/student/login/route.ts`)
- Now stores session data in the `student_sessions` table
- Links session token to actual student ID
- Removes old sessions when student logs in again

### 3. Fixed Student Authentication API (`/src/app/api/student/me/route.ts`)
- Now validates session token against database
- Returns actual logged-in student's data
- Handles session expiration automatically

### 4. Fixed Investment APIs
- **Portfolio API** (`/src/app/api/investments/portfolio/route.ts`): Now shows actual student's portfolio
- **Buy API** (`/src/app/api/investments/buy/route.ts`): Now records purchases for actual student
- **Sell API** (`/src/app/api/investments/sell/route.ts`): Now processes sales for actual student

### 5. Created Session Management Utilities (`/src/lib/student-session.ts`)
- Centralized session validation logic
- Session cleanup for expired sessions
- Proper logout functionality

### 6. Enhanced Student Logout API (`/src/app/api/student/logout/route.ts`)
- Now removes session from database, not just cookie
- Proper cleanup on logout

## Files Modified

1. **NEW**: `CREATE_STUDENT_SESSIONS_TABLE.sql` - Database table creation
2. **NEW**: `/src/lib/student-session.ts` - Session management utilities
3. **MODIFIED**: `/src/app/api/student/login/route.ts` - Store sessions in DB
4. **MODIFIED**: `/src/app/api/student/me/route.ts` - Validate sessions from DB
5. **MODIFIED**: `/src/app/api/student/logout/route.ts` - Clean up sessions
6. **MODIFIED**: `/src/app/api/investments/portfolio/route.ts` - Use actual student data
7. **MODIFIED**: `/src/app/api/investments/buy/route.ts` - Use actual student data  
8. **MODIFIED**: `/src/app/api/investments/sell/route.ts` - Use actual student data

## Deployment Steps

1. **Run Database Migration**: Execute `CREATE_STUDENT_SESSIONS_TABLE.sql` on your Supabase database
2. **Deploy Code Changes**: All modified API files need to be deployed
3. **Test**: Have students log out and log back in to get new session tokens

## Testing

After deployment:
1. Student A logs in → gets valid session token stored in DB
2. Student A buys stocks → purchase recorded for Student A's ID
3. Student A views portfolio → sees their own investments
4. Student B logs in → gets different session token for Student B's ID
5. Student B views portfolio → sees only their own investments (empty initially)

## Security Improvements

- Session tokens are now properly validated against database
- Expired sessions are automatically cleaned up
- Each student can only access their own data
- Session hijacking is prevented through proper token validation

## Notes

- Students will need to log in again after deployment to get valid session tokens
- Old cookie-only sessions will be invalid and require re-authentication
- The fix maintains backward compatibility - no data loss occurs