export interface Teacher {
  id: string
  email: string
  name: string
  school?: string
  session_code?: string
  plan: 'free' | 'basic' | 'premium'
  student_limit: number
  created_at: string
  updated_at: string
}

export interface Student {
  id: string
  teacher_id: string
  student_code: string
  name: string
  credit_score: number
  weekly_allowance: number
  last_allowance_date?: string
  accounts: {
    checking: number
    savings: number
    investment: number
  }
  created_at: string
  updated_at: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  name: string
  school?: string
}

export interface AuthResponse {
  success: boolean
  error?: string
  teacher?: Teacher
  sessionId?: string
  sessionToken?: string // localStorage에 저장할 토큰
}

export interface SessionData {
  teacher: Teacher
  sessionId: string
  expires: string
}