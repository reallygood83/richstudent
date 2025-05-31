import { supabase } from './supabase/client'
import { createClient } from './supabase/server'
import type { Teacher, LoginRequest, RegisterRequest, AuthResponse } from '@/types/auth'

// 비밀번호 해싱을 위한 간단한 유틸리티
async function hashPassword(password: string, email: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password + email) // salt로 email 사용
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

// 세션 코드 생성
function generateSessionCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// 교사 회원가입
export async function registerTeacher(data: RegisterRequest): Promise<AuthResponse> {
  try {
    // 이메일 중복 확인
    const { data: existingTeacher, error: checkError } = await supabase
      .from('teachers')
      .select('id')
      .eq('email', data.email)
      .single()

    if (existingTeacher) {
      return {
        success: false,
        error: '이미 등록된 이메일입니다.'
      }
    }

    // 비밀번호 해싱
    const passwordHash = await hashPassword(data.password, data.email)
    
    // 세션 코드 생성
    const sessionCode = generateSessionCode()

    // 교사 데이터 삽입
    const { data: teacher, error } = await supabase
      .from('teachers')
      .insert({
        email: data.email,
        name: data.name,
        school: data.school || null,
        password_hash: passwordHash,
        session_code: sessionCode,
        plan: 'free',
        student_limit: 30
      })
      .select()
      .single()

    if (error) {
      console.error('Registration error:', error)
      return {
        success: false,
        error: '회원가입 중 오류가 발생했습니다.'
      }
    }

    // 기본 경제 주체 생성
    await createDefaultEconomicEntities(teacher.id)

    return {
      success: true,
      teacher: {
        id: teacher.id,
        email: teacher.email,
        name: teacher.name,
        school: teacher.school,
        session_code: teacher.session_code,
        plan: teacher.plan,
        student_limit: teacher.student_limit,
        created_at: teacher.created_at,
        updated_at: teacher.updated_at
      }
    }
  } catch (error) {
    console.error('Registration error:', error)
    return {
      success: false,
      error: '서버 오류가 발생했습니다.'
    }
  }
}

// 교사 로그인
export async function loginTeacher(data: LoginRequest): Promise<AuthResponse> {
  try {
    // 비밀번호 해싱
    const passwordHash = await hashPassword(data.password, data.email)

    // 교사 정보 조회
    const { data: teacher, error } = await supabase
      .from('teachers')
      .select('*')
      .eq('email', data.email)
      .eq('password_hash', passwordHash)
      .single()

    if (error || !teacher) {
      return {
        success: false,
        error: '이메일 또는 비밀번호가 올바르지 않습니다.'
      }
    }

    // 세션 토큰 생성
    const sessionToken = crypto.randomUUID()
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24) // 24시간 후 만료

    // 세션 저장
    const { error: sessionError } = await supabase
      .from('teacher_sessions')
      .insert({
        teacher_id: teacher.id,
        session_token: sessionToken,
        expires_at: expiresAt.toISOString()
      })

    if (sessionError) {
      console.error('Session creation error:', sessionError)
      return {
        success: false,
        error: '로그인 세션 생성 중 오류가 발생했습니다.'
      }
    }

    return {
      success: true,
      teacher: {
        id: teacher.id,
        email: teacher.email,
        name: teacher.name,
        school: teacher.school,
        session_code: teacher.session_code,
        plan: teacher.plan,
        student_limit: teacher.student_limit,
        created_at: teacher.created_at,
        updated_at: teacher.updated_at
      },
      sessionId: sessionToken
    }
  } catch (error) {
    console.error('Login error:', error)
    return {
      success: false,
      error: '로그인 중 오류가 발생했습니다.'
    }
  }
}

// 세션 검증
export async function validateSession(sessionToken: string): Promise<Teacher | null> {
  try {
    const { data: session, error } = await supabase
      .from('teacher_sessions')
      .select(`
        teacher_id,
        expires_at,
        teachers (*)
      `)
      .eq('session_token', sessionToken)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (error || !session) {
      return null
    }

    return {
      id: session.teachers.id,
      email: session.teachers.email,
      name: session.teachers.name,
      school: session.teachers.school,
      session_code: session.teachers.session_code,
      plan: session.teachers.plan,
      student_limit: session.teachers.student_limit,
      created_at: session.teachers.created_at,
      updated_at: session.teachers.updated_at
    }
  } catch (error) {
    console.error('Session validation error:', error)
    return null
  }
}

// 로그아웃 (세션 삭제)
export async function logoutTeacher(sessionToken: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('teacher_sessions')
      .delete()
      .eq('session_token', sessionToken)

    return !error
  } catch (error) {
    console.error('Logout error:', error)
    return false
  }
}

// 기본 경제 주체 생성 (정부, 은행, 증권사)
async function createDefaultEconomicEntities(teacherId: string) {
  const entities = [
    {
      teacher_id: teacherId,
      entity_type: 'government',
      name: '정부',
      balance: 100000000 // 1억원
    },
    {
      teacher_id: teacherId,
      entity_type: 'bank',
      name: '은행',
      balance: 1000000000 // 10억원
    },
    {
      teacher_id: teacherId,
      entity_type: 'securities',
      name: '증권사',
      balance: 0
    }
  ]

  const { error } = await supabase
    .from('economic_entities')
    .insert(entities)

  if (error) {
    console.error('Failed to create economic entities:', error)
  }
}

// 데모 계정 생성/조회
export async function setupDemoAccount(): Promise<AuthResponse> {
  const demoEmail = 'demo@richstudent.com'
  const demoPassword = 'demo1234'

  // 기존 데모 계정 확인
  try {
    const loginResult = await loginTeacher({ email: demoEmail, password: demoPassword })
    if (loginResult.success) {
      return loginResult
    }
  } catch (error) {
    // 데모 계정이 없으면 생성
  }

  // 데모 계정 생성
  return await registerTeacher({
    email: demoEmail,
    password: demoPassword,
    name: '데모 선생님',
    school: '데모 초등학교'
  })
}