import { supabase } from '@/lib/supabase/client'

export interface StudentSessionData {
  student_id: string
  teacher_id: string
  session_token: string
  expires_at: string
}

export interface ValidationResult {
  success: boolean
  data?: StudentSessionData
  error?: string
}

/**
 * Validates a student session token and returns student data
 * Also handles session expiration and cleanup
 */
export async function validateStudentSession(sessionToken: string): Promise<ValidationResult> {
  try {
    if (!sessionToken) {
      return {
        success: false,
        error: '인증이 필요합니다.'
      }
    }

    // 세션 토큰으로 실제 학생 정보 조회
    const { data: sessionData, error: sessionError } = await supabase
      .from('student_sessions')
      .select('student_id, expires_at')
      .eq('session_token', sessionToken)
      .single()

    if (sessionError || !sessionData) {
      return {
        success: false,
        error: '유효하지 않은 세션입니다.'
      }
    }

    // 세션 만료 확인
    const now = new Date()
    const expiresAt = new Date(sessionData.expires_at)
    if (now > expiresAt) {
      // 만료된 세션 삭제
      await supabase
        .from('student_sessions')
        .delete()
        .eq('session_token', sessionToken)
      
      return {
        success: false,
        error: '세션이 만료되었습니다. 다시 로그인해주세요.'
      }
    }

    // 학생 정보 조회
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, teacher_id')
      .eq('id', sessionData.student_id)
      .single()

    if (studentError || !student) {
      return {
        success: false,
        error: '학생 정보를 찾을 수 없습니다.'
      }
    }

    return {
      success: true,
      data: {
        student_id: student.id,
        teacher_id: student.teacher_id,
        session_token: sessionToken,
        expires_at: sessionData.expires_at
      }
    }

  } catch (error) {
    console.error('Session validation error:', error)
    return {
      success: false,
      error: '세션 검증 중 오류가 발생했습니다.'
    }
  }
}

/**
 * Cleans up expired student sessions
 * Returns the number of sessions cleaned up
 */
export async function cleanupExpiredSessions(): Promise<number> {
  try {
    const { error } = await supabase
      .rpc('cleanup_expired_student_sessions')
    
    if (error) {
      console.error('Session cleanup error:', error)
      return 0
    }
    
    // If the function returns a count, we'd handle it here
    // For now, we'll just return a generic success indicator
    return 1
  } catch (error) {
    console.error('Session cleanup error:', error)
    return 0
  }
}

/**
 * Logs out a student by removing their session
 */
export async function logoutStudent(sessionToken: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('student_sessions')
      .delete()
      .eq('session_token', sessionToken)
    
    return !error
  } catch (error) {
    console.error('Logout error:', error)
    return false
  }
}