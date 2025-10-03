// 뉴스 RSS 수집 API

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { RSSFeedParser } from '@/lib/rss-parser'

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

    return NextResponse.json({
      success: true,
      collected: newsItems.length,
      inserted: data?.length || 0,
      message: `${newsItems.length}개의 뉴스를 수집했습니다.`
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
