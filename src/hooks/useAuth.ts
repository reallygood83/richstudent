'use client'

import { useState, useEffect } from 'react'
import { authApi } from '@/lib/api'
import type { Teacher, LoginRequest, RegisterRequest } from '@/types/auth'

interface AuthState {
  teacher: Teacher | null
  isLoading: boolean
  error: string | null
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    teacher: null,
    isLoading: true,
    error: null
  })

  // 초기 세션 확인
  useEffect(() => {
    checkSession()
  }, [])

  const checkSession = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }))
      const response = await authApi.me()
      if (response.success && response.teacher) {
        setState(prev => ({ 
          ...prev, 
          teacher: response.teacher!, 
          isLoading: false 
        }))
      } else {
        setState(prev => ({ 
          ...prev, 
          teacher: null, 
          isLoading: false 
        }))
      }
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        teacher: null, 
        isLoading: false,
        error: error instanceof Error ? error.message : '세션 확인 실패'
      }))
    }
  }

  const login = async (data: LoginRequest) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }))
      const response = await authApi.login(data)

      if (response.success && response.teacher) {
        // sessionToken이 있으면 localStorage에 저장
        if (response.sessionToken) {
          localStorage.setItem('teacher_session', response.sessionToken)
          console.log('✅ 세션 토큰 localStorage에 저장 완료')
        }

        setState(prev => ({
          ...prev,
          teacher: response.teacher!,
          isLoading: false
        }))
        return { success: true }
      } else {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: response.error || '로그인 실패'
        }))
        return { success: false, error: response.error }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '로그인 중 오류 발생'
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }))
      return { success: false, error: errorMessage }
    }
  }

  const register = async (data: RegisterRequest) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }))
      const response = await authApi.register(data)
      
      if (response.success && response.teacher) {
        setState(prev => ({ 
          ...prev, 
          teacher: response.teacher!, 
          isLoading: false 
        }))
        return { success: true }
      } else {
        setState(prev => ({ 
          ...prev, 
          isLoading: false,
          error: response.error || '회원가입 실패'
        }))
        return { success: false, error: response.error }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '회원가입 중 오류 발생'
      setState(prev => ({ 
        ...prev, 
        isLoading: false,
        error: errorMessage
      }))
      return { success: false, error: errorMessage }
    }
  }

  const logout = async () => {
    try {
      await authApi.logout()
      // localStorage에서 토큰 제거
      localStorage.removeItem('teacher_session')
      console.log('✅ 세션 토큰 localStorage에서 제거 완료')

      setState(prev => ({
        ...prev,
        teacher: null,
        error: null
      }))
      return { success: true }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '로그아웃 실패'
      setState(prev => ({
        ...prev,
        error: errorMessage
      }))
      return { success: false, error: errorMessage }
    }
  }

  return {
    teacher: state.teacher,
    isLoading: state.isLoading,
    error: state.error,
    isAuthenticated: !!state.teacher,
    login,
    register,
    logout,
    checkSession
  }
}