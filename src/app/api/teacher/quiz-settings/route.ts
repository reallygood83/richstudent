// 교사 퀴즈 설정 API
// GET: 현재 설정 조회
// POST: 새 설정 생성 또는 업데이트

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

// ============================================
// GET: 퀴즈 설정 조회
// ============================================
export async function GET(request: NextRequest) {
  try {
    await cookies()
    const supabase = createClient()

    // 교사 인증 확인
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: '로그인이 필요합니다.' },
        { status: 401 }
      )
    }

    const sessionToken = authHeader.replace('Bearer ', '')

    // 세션에서 교사 정보 조회
    const { data: sessionData, error: sessionError } = await supabase
      .from('teacher_sessions')
      .select('teacher_id')
      .eq('session_token', sessionToken)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (sessionError || !sessionData) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 세션입니다.' },
        { status: 401 }
      )
    }

    const teacherId = sessionData.teacher_id

    // 퀴즈 설정 조회
    const { data: settings, error } = await supabase
      .from('quiz_settings')
      .select('*')
      .eq('teacher_id', teacherId)
      .single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned (정상적인 경우)
      console.error('❌ 퀴즈 설정 조회 에러:', error)
      return NextResponse.json(
        { success: false, error: '설정 조회 실패' },
        { status: 500 }
      )
    }

    // 설정이 없으면 기본값 반환
    if (!settings) {
      return NextResponse.json({
        success: true,
        data: null, // 설정이 아직 없음
        message: '퀴즈 설정이 없습니다. 새로 생성해주세요.'
      })
    }

    console.log('✅ 퀴즈 설정 조회 성공:', settings.quiz_type)

    return NextResponse.json({
      success: true,
      data: settings
    })

  } catch (error) {
    console.error('❌ GET /api/teacher/quiz-settings 에러:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// ============================================
// POST: 퀴즈 설정 생성 또는 업데이트
// ============================================
export async function POST(request: NextRequest) {
  try {
    await cookies()
    const supabase = createClient()

    // 교사 인증 확인
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: '로그인이 필요합니다.' },
        { status: 401 }
      )
    }

    const sessionToken = authHeader.replace('Bearer ', '')

    // 세션에서 교사 정보 조회
    const { data: sessionData, error: sessionError } = await supabase
      .from('teacher_sessions')
      .select('teacher_id')
      .eq('session_token', sessionToken)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (sessionError || !sessionData) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 세션입니다.' },
        { status: 401 }
      )
    }

    const teacherId = sessionData.teacher_id

    // 요청 데이터 파싱
    const body = await request.json()
    const {
      quiz_type,
      daily_open_time = '08:00',
      participation_reward = 1000,
      correct_answer_reward = 1500,
      perfect_score_bonus = 1500,
      is_active = true
    } = body

    // 유효성 검증
    if (!quiz_type || !['english', 'chinese', 'idiom'].includes(quiz_type)) {
      return NextResponse.json(
        { success: false, error: '퀴즈 타입을 선택해주세요. (english, chinese, idiom)' },
        { status: 400 }
      )
    }

    console.log('💾 퀴즈 설정 저장:', {
      teacher_id: teacherId,
      quiz_type,
      daily_open_time,
      participation_reward,
      correct_answer_reward,
      perfect_score_bonus
    })

    // 기존 설정 확인
    const { data: existingSettings } = await supabase
      .from('quiz_settings')
      .select('id')
      .eq('teacher_id', teacherId)
      .single()

    let result

    if (existingSettings) {
      // 업데이트
      console.log('🔄 기존 설정 업데이트')

      result = await supabase
        .from('quiz_settings')
        .update({
          quiz_type,
          daily_open_time,
          participation_reward,
          correct_answer_reward,
          perfect_score_bonus,
          is_active,
          updated_at: new Date().toISOString()
        })
        .eq('teacher_id', teacherId)
        .select()
        .single()

    } else {
      // 새로 생성
      console.log('✨ 새 설정 생성')

      result = await supabase
        .from('quiz_settings')
        .insert({
          teacher_id: teacherId,
          quiz_type,
          questions_per_quiz: 5, // 항상 5문제
          daily_open_time,
          max_attempts_per_day: 1, // 항상 하루 1회
          participation_reward,
          correct_answer_reward,
          perfect_score_bonus,
          daily_max_reward: 10000, // 항상 10,000원
          is_active
        })
        .select()
        .single()
    }

    const { data: savedSettings, error: saveError } = result

    if (saveError) {
      console.error('❌ 설정 저장 에러:', saveError)
      return NextResponse.json(
        { success: false, error: '설정 저장에 실패했습니다.' },
        { status: 500 }
      )
    }

    console.log('✅ 퀴즈 설정 저장 완료:', savedSettings.id)

    return NextResponse.json({
      success: true,
      data: savedSettings,
      message: '퀴즈 설정이 저장되었습니다.'
    })

  } catch (error) {
    console.error('❌ POST /api/teacher/quiz-settings 에러:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
