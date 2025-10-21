import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

export async function GET() {
  try {
    // market_assets 테이블 조회
    const { data: assets, error } = await supabase
      .from('market_assets')
      .select('*')
      .limit(10)

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
        details: error
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        count: assets?.length || 0,
        assets: assets || [],
        has_data: (assets?.length || 0) > 0
      }
    })
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
      stack: err instanceof Error ? err.stack : undefined
    })
  }
}
