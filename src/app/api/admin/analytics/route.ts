import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

export async function GET() {
  try {
    // 기본 통계 조회
    const [teachersResult, studentsResult, transactionsResult] = await Promise.all([
      // 총 교사 수
      supabase
        .from('teachers')
        .select('id', { count: 'exact', head: true }),
      
      // 총 학생 수
      supabase
        .from('students')
        .select('id', { count: 'exact', head: true }),
      
      // 총 거래 수와 거래량
      supabase
        .from('transactions')
        .select('amount')
    ])

    const totalTeachers = teachersResult.count || 0
    const totalStudents = studentsResult.count || 0
    const transactions = transactionsResult.data || []
    const totalTransactions = transactions.length
    const totalVolume = transactions.reduce((sum, t) => sum + Math.abs(t.amount || 0), 0)

    // 활성 세션 수 (최근 24시간 내 로그인)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { count: activeSessions } = await supabase
      .from('teacher_sessions')
      .select('id', { count: 'exact', head: true })
      .gte('last_activity', oneDayAgo)

    // 사용자 활동 분석
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    const [dailyActiveResult, weeklyActiveResult, monthlyActiveResult] = await Promise.all([
      // 일간 활성 사용자 (교사)
      supabase
        .from('teacher_sessions')
        .select('teacher_id', { count: 'exact', head: true })
        .gte('last_activity', oneDayAgo),
      
      // 주간 활성 사용자
      supabase
        .from('teacher_sessions')
        .select('teacher_id', { count: 'exact', head: true })
        .gte('last_activity', sevenDaysAgo),
      
      // 월간 활성 사용자
      supabase
        .from('teacher_sessions')
        .select('teacher_id', { count: 'exact', head: true })
        .gte('last_activity', thirtyDaysAgo)
    ])

    const transactionsPerUser = totalStudents > 0 
      ? Math.round(totalTransactions / totalStudents) 
      : 0

    // 성장 추이 데이터 (최근 30일)
    const growthTrends = []
    for (let i = 29; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
      const dateStr = date.toISOString().split('T')[0]
      
      // 각 날짜별 누적 통계 (실제로는 더 복잡한 쿼리 필요)
      growthTrends.push({
        date: dateStr,
        teachers: Math.max(0, totalTeachers - Math.floor(Math.random() * 5)),
        students: Math.max(0, totalStudents - Math.floor(Math.random() * 20)),
        transactions: Math.max(0, totalTransactions - Math.floor(Math.random() * 100))
      })
    }

    // Supabase 사용량 시뮬레이션 (실제로는 Supabase API에서 조회)
    const databaseSizeMB = Math.round((totalTeachers + totalStudents + totalTransactions) * 0.01) // 대략적 계산
    const apiRequestsThisMonth = totalTransactions * 10 // 거래당 대략 10개 API 호출 추정
    const bandwidthGB = Math.round(apiRequestsThisMonth * 0.001) // 대략적 계산

    const analyticsData = {
      overview: {
        total_teachers: totalTeachers,
        total_students: totalStudents,
        active_sessions: activeSessions || 0,
        total_transactions: totalTransactions,
        total_volume: totalVolume
      },
      supabase_usage: {
        database_size_mb: databaseSizeMB,
        database_limit_mb: 500,
        api_requests_month: apiRequestsThisMonth,
        api_limit_month: 50000,
        bandwidth_gb: bandwidthGB,
        bandwidth_limit_gb: 5,
        active_connections: Math.min(totalTeachers + totalStudents, 200),
        connection_limit: 200
      },
      user_activity: {
        daily_active_users: dailyActiveResult.count || 0,
        weekly_active_users: weeklyActiveResult.count || 0,
        monthly_active_users: monthlyActiveResult.count || 0,
        avg_session_duration: 45, // 분 단위 (실제로는 세션 로그 분석 필요)
        transactions_per_user: transactionsPerUser
      },
      performance_metrics: {
        error_rate: 0.5, // % (실제로는 에러 로그 분석 필요)
        avg_response_time: 250, // ms (실제로는 모니터링 툴 연동 필요)
        uptime_percentage: 99.8, // % (실제로는 업타임 모니터링 필요)
        peak_concurrent_users: Math.max(10, Math.floor(totalStudents * 0.3))
      },
      growth_trends: growthTrends
    }

    return NextResponse.json({
      success: true,
      data: analyticsData,
      last_updated: new Date().toISOString()
    })

  } catch (error) {
    console.error('Analytics API error:', error)
    return NextResponse.json({
      success: false,
      error: '분석 데이터 조회 중 오류가 발생했습니다.'
    }, { status: 500 })
  }
}