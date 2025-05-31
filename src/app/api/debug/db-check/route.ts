import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

export async function GET() {
  try {
    console.log('Checking database connection and schema...')

    // 1. 기본 연결 테스트
    const { data: connectionTest, error: connectionError } = await supabase
      .from('teachers')
      .select('count')
      .limit(1)

    if (connectionError) {
      return NextResponse.json({
        success: false,
        error: 'Database connection failed',
        details: connectionError
      }, { status: 500 })
    }

    // 2. teachers 테이블 구조 확인 시도
    const { data: teachersTest, error: teachersError } = await supabase
      .from('teachers')
      .select('*')
      .limit(1)

    // 3. 테이블 존재 여부 및 기본 정보 반환
    return NextResponse.json({
      success: true,
      database_status: 'connected',
      teachers_table_exists: !teachersError,
      teachers_error: teachersError?.message || null,
      sample_data_count: teachersTest?.length || 0,
      supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'not set',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Database check error:', error)
    return NextResponse.json({
      success: false,
      error: 'Database check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}