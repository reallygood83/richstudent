// Gemini AI 뉴스 해설 생성 API

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { GeminiNewsService } from '@/lib/gemini'
import { StudentLevel } from '@/types/news'
import { validateSession } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()

    // 세션 검증 (교사 또는 학생)
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

    const { news_id, student_level } = await request.json()

    if (!news_id || !student_level) {
      return NextResponse.json({
        success: false,
        error: 'news_id와 student_level은 필수입니다.'
      }, { status: 400 })
    }

    // 뉴스 설정에서 Gemini API 키 가져오기
    const { data: settings } = await supabase
      .from('news_settings')
      .select('gemini_api_key')
      .eq('teacher_id', teacher.id)
      .single()

    if (!settings?.gemini_api_key) {
      return NextResponse.json({
        success: false,
        error: 'Gemini API 키가 설정되지 않았습니다. 설정 탭에서 API 키를 등록해주세요.'
      }, { status: 400 })
    }

    // 기존 해설이 있는지 확인
    const { data: existingExplanation } = await supabase
      .from('news_explanations')
      .select('*')
      .eq('news_id', news_id)
      .eq('student_level', student_level as StudentLevel)
      .single()

    if (existingExplanation) {
      return NextResponse.json({
        success: true,
        explanation: existingExplanation,
        cached: true
      })
    }

    // 뉴스 내용 가져오기
    const { data: news } = await supabase
      .from('news_feed')
      .select('*')
      .eq('id', news_id)
      .single()

    if (!news) {
      return NextResponse.json({
        success: false,
        error: '뉴스를 찾을 수 없습니다.'
      }, { status: 404 })
    }

    // Gemini AI로 해설 생성
    const gemini = new GeminiNewsService(settings.gemini_api_key)
    const content = news.original_content || news.description || ''
    const explanation = await gemini.explainNews(
      news.title,
      content,
      student_level as StudentLevel
    )

    // 해설 저장
    const { data: savedExplanation, error: saveError } = await supabase
      .from('news_explanations')
      .insert({
        news_id,
        student_level: student_level as StudentLevel,
        explanation
      })
      .select()
      .single()

    if (saveError) {
      console.error('Explanation save error:', saveError)
      // 저장 실패해도 생성된 해설은 반환
      return NextResponse.json({
        success: true,
        explanation: {
          news_id,
          student_level,
          explanation,
          created_at: new Date().toISOString()
        },
        cached: false,
        warning: '해설 저장에 실패했지만 생성은 완료되었습니다.'
      })
    }

    return NextResponse.json({
      success: true,
      explanation: savedExplanation,
      cached: false
    })

  } catch (error) {
    console.error('AI process error:', error)
    return NextResponse.json({
      success: false,
      error: 'AI 해설 생성 중 오류가 발생했습니다.'
    }, { status: 500 })
  }
}

// 특정 뉴스의 모든 레벨 해설 생성
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

    const { news_id } = await request.json()

    // 뉴스 설정 가져오기
    const { data: settings } = await supabase
      .from('news_settings')
      .select('gemini_api_key')
      .eq('teacher_id', teacher.id)
      .single()

    if (!settings?.gemini_api_key) {
      return NextResponse.json({
        success: false,
        error: 'Gemini API 키가 필요합니다.'
      }, { status: 400 })
    }

    // 뉴스 내용 가져오기
    const { data: news } = await supabase
      .from('news_feed')
      .select('*')
      .eq('id', news_id)
      .single()

    if (!news) {
      return NextResponse.json({
        success: false,
        error: '뉴스를 찾을 수 없습니다.'
      }, { status: 404 })
    }

    const gemini = new GeminiNewsService(settings.gemini_api_key)
    const levels: StudentLevel[] = ['elementary', 'middle', 'high']
    const explanations = []

    // 모든 레벨에 대해 해설 생성
    for (const level of levels) {
      const content = news.original_content || news.description || ''
      const explanation = await gemini.explainNews(news.title, content, level)

      const { data } = await supabase
        .from('news_explanations')
        .upsert({
          news_id,
          student_level: level,
          explanation
        }, {
          onConflict: 'news_id,student_level'
        })
        .select()
        .single()

      if (data) {
        explanations.push(data)
      }
    }

    return NextResponse.json({
      success: true,
      explanations,
      count: explanations.length
    })

  } catch (error) {
    console.error('Batch AI process error:', error)
    return NextResponse.json({
      success: false,
      error: 'AI 해설 일괄 생성 중 오류가 발생했습니다.'
    }, { status: 500 })
  }
}
