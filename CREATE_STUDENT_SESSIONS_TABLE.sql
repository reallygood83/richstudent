-- Create student_sessions table to properly track student authentication
-- This fixes the issue where portfolio shows empty after successful stock purchases

-- Create student sessions table
CREATE TABLE IF NOT EXISTS student_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_student_sessions_token ON student_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_student_sessions_student_id ON student_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_student_sessions_expires_at ON student_sessions(expires_at);

-- Enable RLS for security
ALTER TABLE student_sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for student sessions
CREATE POLICY "Student sessions are accessible by owner" ON student_sessions
    FOR ALL USING (true); -- Allow access for now, can be restricted later

-- Add trigger for updated_at column if needed
-- (Not needed since this table doesn't have updated_at column)

-- Clean up expired sessions function
CREATE OR REPLACE FUNCTION cleanup_expired_student_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM student_sessions 
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Optional: Create a scheduled job to clean up expired sessions
-- This can be run manually or scheduled via cron/pg_cron
-- SELECT cleanup_expired_student_sessions();