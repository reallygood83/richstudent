// 뉴스 RSS 수집 API

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { RSSFeedParser } from '@/lib/rss-parser'
import { GeminiNewsService } from '@/lib/gemini'
import { validateSession } from '@/lib/auth'
import { StudentLevel } from '@/types/news'

export async function POST() {
  try {
    const supabase = createClient()
    const parser = new RSSFeedParser()

    // 모든 소스에서 뉴스 수집
    const newsItems = await parser.fetchAllNews()

    if (newsItems.length === 0) {
      return NextResponse.json({
        success: false,
        error: '수집된 뉴스가 없습니다.'
      }, { status: 404 })
    }

    // 데이터베이스에 삽입 (중복은 UNIQUE 제약조건으로 자동 무시)
    const { data, error } = await supabase
      .from('news_feed')
      .upsert(
        newsItems.map(item => ({
          ...item,
          cached_at: new Date().toISOString()
        })),
        {
          onConflict: 'link',
          ignoreDuplicates: false // 기존 데이터 업데이트
        }
      )
      .select()

    if (error) {
      console.error('Database insert error:', error)
      return NextResponse.json({
        success: false,
        error: '뉴스 저장 중 오류가 발생했습니다.'
      }, { status: 500 })
    }

    // AI 해설 자동 생성 (백그라운드)
    let explanationsGenerated = 0
    try {
      // 세션 확인 (교사만 AI 해설 생성 가능)
      const cookieStore = await cookies()
      const sessionToken = cookieStore.get('session_token')?.value

      if (sessionToken) {
        const teacher = await validateSession(sessionToken)

        if (teacher) {
          // 교사의 Gemini API 키 확인
          const { data: settings } = await supabase
            .from('news_settings')
            .select('gemini_api_key, student_level')
            .eq('teacher_id', teacher.id)
            .single()

          // API 키가 있고 새로운 뉴스가 있으면 AI 해설 생성
          if (settings?.gemini_api_key && data && data.length > 0) {
            const gemini = new GeminiNewsService(settings.gemini_api_key)
            const levels: StudentLevel[] = ['elementary', 'middle', 'high']

            // 최근 5개 뉴스만 처리 (API 비용 절감)
            const newsToProcess = data.slice(0, 5)

            for (const news of newsToProcess) {
              for (const level of levels) {
                try {
                  // 이미 해설이 있는지 확인
                  const { data: existing } = await supabase
                    .from('news_explanations')
                    .select('id')
                    .eq('news_id', news.id)
                    .eq('student_level', level)
                    .single()

                  if (!existing) {
                    const content = news.original_content || news.description || ''
                    const explanation = await gemini.explainNews(
                      news.title,
                      content,
                      level
                    )

                    await supabase
                      .from('news_explanations')
                      .insert({
                        news_id: news.id,
                        student_level: level,
                        explanation
                      })

                    explanationsGenerated++
                  }
                } catch (err) {
                  console.error(`AI explanation error for ${news.id}:`, err)
                  // 개별 뉴스 해설 실패는 무시하고 계속 진행
                }
              }
            }
          }
        }
      }
    } catch (aiError) {
      console.error('AI explanation generation error:', aiError)
      // AI 해설 실패는 뉴스 수집 성공에 영향 없음
    }

    return NextResponse.json({
      success: true,
      collected: newsItems.length,
      inserted: data?.length || 0,
      explanations_generated: explanationsGenerated,
      message: `${newsItems.length}개의 뉴스를 수집했습니다.${explanationsGenerated > 0 ? ` (AI 해설 ${explanationsGenerated}개 생성)` : ''}`
    })

  } catch (error) {
    console.error('News fetch error:', error)
    return NextResponse.json({
      success: false,
      error: '뉴스 수집 중 오류가 발생했습니다.'
    }, { status: 500 })
  }
}

// GET 메서드로 수동 트리거 가능
export async function GET() {
  return POST()
}
