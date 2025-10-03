// 뉴스 목록 조회 API

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { StudentLevel } from '@/types/news'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '10')
    const source = searchParams.get('source') // 'maeil' or 'yonhap' or null (all)
    const student_level = searchParams.get('student_level') as StudentLevel | null

    // 뉴스 목록 조회 (최신순)
    let query = supabase
      .from('news_feed')
      .select('*')
      .order('pub_date', { ascending: false, nullsFirst: false })
      .order('cached_at', { ascending: false })
      .limit(limit)

    if (source) {
      query = query.eq('source', source)
    }

    const { data: newsItems, error: newsError } = await query

    if (newsError) {
      console.error('News fetch error:', newsError)
      return NextResponse.json({
        success: false,
        error: '뉴스 조회 중 오류가 발생했습니다.'
      }, { status: 500 })
    }

    if (!newsItems || newsItems.length === 0) {
      return NextResponse.json({
        success: true,
        news: [],
        message: '표시할 뉴스가 없습니다. /api/news/fetch를 호출하여 뉴스를 수집하세요.'
      })
    }

    // 학생 수준이 지정된 경우 해설 포함
    if (student_level) {
      const newsIds = newsItems.map(item => item.id)

      const { data: explanations } = await supabase
        .from('news_explanations')
        .select('*')
        .in('news_id', newsIds)
        .eq('student_level', student_level)

      const explanationMap = new Map(
        explanations?.map(exp => [exp.news_id, exp]) || []
      )

      const newsWithExplanations = newsItems.map(news => ({
        ...news,
        explanation: explanationMap.get(news.id) || null
      }))

      return NextResponse.json({
        success: true,
        news: newsWithExplanations,
        count: newsWithExplanations.length
      })
    }

    return NextResponse.json({
      success: true,
      news: newsItems,
      count: newsItems.length
    })

  } catch (error) {
    console.error('News list error:', error)
    return NextResponse.json({
      success: false,
      error: '서버 오류가 발생했습니다.'
    }, { status: 500 })
  }
}
