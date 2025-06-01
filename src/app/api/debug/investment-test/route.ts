import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

// 투자 모니터링 디버깅용 API
export async function GET() {
  try {
    const results: Record<string, unknown> = {}

    // 1. 모든 테이블 존재 확인
    const { data: tables } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['teachers', 'teacher_sessions', 'students', 'accounts', 'portfolio', 'market_assets'])

    results.tables = tables?.map(t => t.table_name) || []

    // 2. 교사 세션 확인
    const { data: teacherSessions, error: sessionError } = await supabase
      .from('teacher_sessions')
      .select('*')
      .limit(3)

    results.teacher_sessions = {
      count: teacherSessions?.length || 0,
      data: teacherSessions,
      error: sessionError
    }

    // 3. 학생 확인
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('id, teacher_id, name, student_code')
      .limit(5)

    results.students = {
      count: students?.length || 0,
      data: students,
      error: studentsError
    }

    // 4. 계좌 확인
    const { data: accounts, error: accountsError } = await supabase
      .from('accounts')
      .select('student_id, account_type, balance')
      .limit(10)

    results.accounts = {
      count: accounts?.length || 0,
      data: accounts,
      error: accountsError
    }

    // 5. 포트폴리오 확인
    const { data: portfolio, error: portfolioError } = await supabase
      .from('portfolio')
      .select('student_id, asset_id, quantity, current_value')
      .limit(5)

    results.portfolio = {
      count: portfolio?.length || 0,
      data: portfolio,
      error: portfolioError
    }

    // 6. 시장 자산 확인
    const { data: marketAssets, error: assetsError } = await supabase
      .from('market_assets')
      .select('symbol, name, current_price, is_active')
      .eq('is_active', true)
      .limit(5)

    results.market_assets = {
      count: marketAssets?.length || 0,
      data: marketAssets,
      error: assetsError
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results
    })

  } catch (error) {
    console.error('Debug API error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}