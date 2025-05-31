import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

export async function GET() {
  try {
    console.log('=== Table Info Test Started ===')

    // 1. teachers 테이블 샘플 데이터 조회
    const { data: teachers, error: teachersError } = await supabase
      .from('teachers')
      .select('*')
      .limit(3)

    console.log('Teachers query result:', { teachers, teachersError })

    // 2. 간단한 count 조회
    const { count, error: countError } = await supabase
      .from('teachers')
      .select('*', { count: 'exact', head: true })

    console.log('Teachers count result:', { count, countError })

    return NextResponse.json({
      success: true,
      table_info: {
        teachers_sample: teachers || [],
        teachers_count: count || 0,
        teachers_error: teachersError?.message || null,
        count_error: countError?.message || null
      },
      supabase_config: {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'not set',
        has_anon_key: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Table info test error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error
    }, { status: 500 })
  }
}