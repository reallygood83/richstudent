// AI 뉴스 설명 생성 API (모든 레벨)

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { GeminiNewsService } from '@/lib/gemini'
import { validateSession } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()

    // 세션 검증 (교사만 가능)
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

    const { newsId } = await request.json()

    if (!newsId) {
      return NextResponse.json({
        success: false,
        error: 'newsId는 필수입니다.'
      }, { status: 400 })
    }

    // 뉴스 설정에서 Gemini API 키와 학생 레벨 가져오기
    const { data: settings } = await supabase
      .from('news_settings')
      .select('gemini_api_key, student_level')
      .eq('teacher_id', teacher.id)
      .single()

    if (!settings?.gemini_api_key) {
      return NextResponse.json({
        success: false,
        error: 'Gemini API 키가 설정되지 않았습니다. 설정에서 API 키를 등록해주세요.'
      }, { status: 400 })
    }

    // 기본 레벨은 초등학생
    const currentLevel = settings.student_level || 'elementary'

    // 뉴스 내용 가져오기
    const { data: news } = await supabase
      .from('news_feed')
      .select('*')
      .eq('id', newsId)
      .single()

    if (!news) {
      return NextResponse.json({
        success: false,
        error: '뉴스를 찾을 수 없습니다.'
      }, { status: 404 })
    }

    const gemini = new GeminiNewsService(settings.gemini_api_key)

    // 교사가 설정한 레벨로만 AI 설명 생성
    const content = news.original_content || news.description || ''
    const explanation = await gemini.explainNews(news.title, content, currentLevel)

    const { data, error: insertError } = await supabase
      .from('news_explanations')
      .upsert({
        news_id: newsId,
        student_level: currentLevel,
        explanation
      }, {
        onConflict: 'news_id,student_level'
      })
      .select()
      .single()

    if (insertError) {
      console.error(`Failed to save ${currentLevel} explanation:`, insertError)
      return NextResponse.json({
        success: false,
        error: `AI 설명 저장 실패: ${insertError.message}`
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      explanation: data, // 생성된 설명 반환
      message: `${currentLevel === 'elementary' ? '초등학생' : currentLevel === 'middle' ? '중학생' : '고등학생'} 레벨 AI 설명이 생성되었습니다.`
    })

  } catch (error) {
    console.error('AI explanation generation error:', error)
    return NextResponse.json({
      success: false,
      error: 'AI 설명 생성 중 오류가 발생했습니다.'
    }, { status: 500 })
  }
}
