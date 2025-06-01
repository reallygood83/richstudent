import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

export async function GET() {
  try {
    console.log('Checking economic entities table...')

    // 1. 테이블 존재 확인
    const { data: tables, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'economic_entities')

    console.log('Table check result:', { tables, tableError })

    // 2. 테이블이 존재하면 데이터 조회 시도
    if (tables && tables.length > 0) {
      const { data: entities, error: dataError } = await supabase
        .from('economic_entities')
        .select('*')
        .limit(5)

      console.log('Economic entities data:', { entities, dataError })

      return NextResponse.json({
        success: true,
        tableExists: true,
        entities: entities || [],
        dataError: dataError?.message || null
      })
    } else {
      return NextResponse.json({
        success: true,
        tableExists: false,
        message: 'economic_entities 테이블이 존재하지 않습니다.'
      })
    }

  } catch (error) {
    console.error('Debug economic entities error:', error)
    return NextResponse.json({
      success: false,
      error: '디버그 체크 중 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : String(error)
    })
  }
}