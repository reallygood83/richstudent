import type { LoginRequest, RegisterRequest, AuthResponse, Teacher } from '@/types/auth'

const API_BASE = '/api'

// API 호출 헬퍼
async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || `HTTP ${response.status}`)
  }

  return response.json()
}

// 인증 API
export const authApi = {
  // 회원가입
  register: (data: RegisterRequest): Promise<AuthResponse> =>
    apiCall('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // 로그인
  login: (data: LoginRequest): Promise<AuthResponse> =>
    apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // 로그아웃
  logout: (): Promise<{ success: boolean }> =>
    apiCall('/auth/logout', {
      method: 'POST',
    }),

  // 현재 사용자 정보
  me: (): Promise<{ success: boolean; teacher?: Teacher }> =>
    apiCall('/auth/me'),
}

// 학생 API (향후 추가)
export const studentApi = {
  // TODO: 학생 관련 API들
}

// 거래 API (향후 추가)
export const transactionApi = {
  // TODO: 거래 관련 API들
}

// 시장 데이터 API (향후 추가)
export const marketApi = {
  // TODO: 시장 데이터 관련 API들
}