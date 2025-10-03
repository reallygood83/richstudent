// 뉴스 설정 관리 API

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { validateSession } from '@/lib/auth'
import { StudentLevel } from '@/types/news'
import { GeminiNewsService } from '@/lib/gemini'

// 설정 조회
export async function GET() {
  try {
    const supabase = createClient()

    const cookieStore = await cookies()
    const sessionToken = cookieStore.get('session_token')?.value

    if (!sessionToken) {
      return NextResponse.json({
        success: false,
        error: '인증이 필요합니다.'
      }, { status: 401 })
    }

    const teacher = await validateSession(sessionToken)
    if (!teacher) {
      return NextResponse.json({
        success: false,
        error: '유효하지 않은 세션입니다.'
      }, { status: 401 })
    }

    const { data: settings, error } = await supabase
      .from('news_settings')
      .select('*')
      .eq('teacher_id', teacher.id)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Settings fetch error:', error)
      return NextResponse.json({
        success: false,
        error: '설정 조회 중 오류가 발생했습니다.'
      }, { status: 500 })
    }

    // 설정이 없으면 기본값 반환
    if (!settings) {
      return NextResponse.json({
        success: true,
        settings: {
          gemini_api_key: null,
          student_level: 'elementary',
          auto_refresh_enabled: true,
          refresh_interval_minutes: 30
        }
      })
    }

    // API 키는 일부만 노출
    const maskedSettings = {
      ...settings,
      gemini_api_key: settings.gemini_api_key
        ? `${settings.gemini_api_key.substring(0, 8)}...`
        : null,
      has_api_key: !!settings.gemini_api_key
    }

    return NextResponse.json({
      success: true,
      settings: maskedSettings
    })

  } catch (error) {
    console.error('Settings GET error:', error)
    return NextResponse.json({
      success: false,
      error: '서버 오류가 발생했습니다.'
    }, { status: 500 })
  }
}

// 설정 업데이트
export async function PUT(request: NextRequest) {
  try {
    const supabase = createClient()

    const cookieStore = await cookies()
    const sessionToken = cookieStore.get('session_token')?.value

    if (!sessionToken) {
      return NextResponse.json({
        success: false,
        error: '인증이 필요합니다.'
      }, { status: 401 })
    }

    const teacher = await validateSession(sessionToken)
    if (!teacher) {
      return NextResponse.json({
        success: false,
        error: '유효하지 않은 세션입니다.'
      }, { status: 401 })
    }

    const body = await request.json()
    const { gemini_api_key, student_level, auto_refresh_enabled, refresh_interval_minutes } = body

    // API 키 유효성 검증 (제공된 경우에만)
    if (gemini_api_key) {
      try {
        const gemini = new GeminiNewsService(gemini_api_key)
        const isValid = await gemini.testConnection()

        if (!isValid) {
          return NextResponse.json({
            success: false,
            error: '유효하지 않은 Gemini API 키입니다.'
          }, { status: 400 })
        }
      } catch {
        return NextResponse.json({
          success: false,
          error: 'Gemini API 연결에 실패했습니다. API 키를 확인해주세요.'
        }, { status: 400 })
      }
    }

    // 설정 업데이트 또는 생성
    const updateData: {
      teacher_id: string
      gemini_api_key?: string
      student_level?: StudentLevel
      auto_refresh_enabled?: boolean
      refresh_interval_minutes?: number
    } = {
      teacher_id: teacher.id
    }

    if (gemini_api_key !== undefined) updateData.gemini_api_key = gemini_api_key
    if (student_level) updateData.student_level = student_level as StudentLevel
    if (auto_refresh_enabled !== undefined) updateData.auto_refresh_enabled = auto_refresh_enabled
    if (refresh_interval_minutes) updateData.refresh_interval_minutes = refresh_interval_minutes

    const { data: settings, error } = await supabase
      .from('news_settings')
      .upsert(updateData, {
        onConflict: 'teacher_id'
      })
      .select()
      .single()

    if (error) {
      console.error('Settings update error:', error)
      return NextResponse.json({
        success: false,
        error: '설정 업데이트 중 오류가 발생했습니다.'
      }, { status: 500 })
    }

    // API 키 마스킹
    const maskedSettings = {
      ...settings,
      gemini_api_key: settings.gemini_api_key
        ? `${settings.gemini_api_key.substring(0, 8)}...`
        : null,
      has_api_key: !!settings.gemini_api_key
    }

    return NextResponse.json({
      success: true,
      settings: maskedSettings,
      message: '설정이 저장되었습니다.'
    })

  } catch (error) {
    console.error('Settings PUT error:', error)
    return NextResponse.json({
      success: false,
      error: '서버 오류가 발생했습니다.'
    }, { status: 500 })
  }
}

// 설정 생성
export async function POST(request: NextRequest) {
  return PUT(request)
}
