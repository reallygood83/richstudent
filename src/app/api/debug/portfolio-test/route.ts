import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

// 포트폴리오 테이블 구조 확인용 디버그 API
export async function GET() {
  try {
    // 모든 포트폴리오 데이터 조회 (최대 10개)
    const { data: portfolios, error: portfoliosError } = await supabase
      .from('portfolio')
      .select('*')
      .limit(10)

    // 모든 학생 조회 (최대 5개)
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('id, name, student_code, teacher_id')
      .limit(5)

    // 모든 시장 자산 조회 (최대 10개)
    const { data: marketAssets, error: marketAssetsError } = await supabase
      .from('market_assets')
      .select('*')
      .limit(10)

    // 포트폴리오 테이블 스키마 정보
    const { data: portfolioSchema, error: schemaError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'portfolio')

    return NextResponse.json({
      success: true,
      debug_info: {
        portfolio_count: portfolios?.length || 0,
        student_count: students?.length || 0,
        market_assets_count: marketAssets?.length || 0,
        sample_data: {
          portfolios: portfolios || [],
          students: students || [],
          market_assets: marketAssets || [],
          portfolio_schema: portfolioSchema || []
        },
        errors: {
          portfolios_error: portfoliosError,
          students_error: studentsError,
          market_assets_error: marketAssetsError,
          schema_error: schemaError
        }
      }
    })

  } catch (error) {
    console.error('Portfolio debug API error:', error)
    return NextResponse.json({
      success: false,
      error: '디버그 API 오류가 발생했습니다.',
      details: error
    }, { status: 500 })
  }
}