'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Users,
  GraduationCap,
  Activity,
  Database,
  TrendingUp,
  AlertCircle,
  RefreshCw,
  Download,
  BarChart3
} from 'lucide-react'

// Force dynamic rendering (disable static generation)
export const dynamic = 'force-dynamic'
export const revalidate = 0

interface AnalyticsData {
  overview: {
    total_teachers: number
    total_students: number
    active_sessions: number
    total_transactions: number
    total_volume: number
  }
  supabase_usage: {
    database_size_mb: number
    database_limit_mb: number
    api_requests_month: number
    api_limit_month: number
    bandwidth_gb: number
    bandwidth_limit_gb: number
    active_connections: number
    connection_limit: number
  }
  user_activity: {
    daily_active_users: number
    weekly_active_users: number
    monthly_active_users: number
    avg_session_duration: number
    transactions_per_user: number
  }
  performance_metrics: {
    error_rate: number
    avg_response_time: number
    uptime_percentage: number
    peak_concurrent_users: number
  }
  growth_trends: Array<{
    date: string
    teachers: number
    students: number
    transactions: number
  }>
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/admin/analytics')
      const result = await response.json()
      
      if (result.success) {
        setData(result.data)
      } else {
        setError(result.error)
      }
    } catch {
      setError('데이터 로드 실패')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchAnalytics()
  }

  const exportData = async () => {
    try {
      const response = await fetch('/api/admin/analytics/export')
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `beta-test-analytics-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
    } catch (err) {
      console.error('Export failed:', err)
    }
  }

  useEffect(() => {
    fetchAnalytics()
    
    // 5분마다 자동 새로고침
    const interval = setInterval(fetchAnalytics, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const getUsagePercentage = (used: number, limit: number) => {
    return Math.round((used / limit) * 100)
  }

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600 bg-red-50'
    if (percentage >= 70) return 'text-yellow-600 bg-yellow-50'
    return 'text-green-600 bg-green-50'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">분석 데이터를 로드하는 중...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">데이터 로드 실패</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={handleRefresh}>다시 시도</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">베타 테스트 분석</h1>
          <p className="text-gray-600">RichStudent 베타 테스트 성과 및 시스템 사용량</p>
        </div>
        <div className="flex space-x-3">
          <Button onClick={exportData} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            데이터 내보내기
          </Button>
          <Button onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            새로고침
          </Button>
        </div>
      </div>

      {/* 주요 지표 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 교사 수</CardTitle>
            <GraduationCap className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{data.overview.total_teachers}</div>
            <p className="text-xs text-muted-foreground">등록된 교사</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 학생 수</CardTitle>
            <Users className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{data.overview.total_students}</div>
            <p className="text-xs text-muted-foreground">활성 학생 계정</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 거래량</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{data.overview.total_transactions}</div>
            <p className="text-xs text-muted-foreground">누적 거래 건수</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">거래 금액</CardTitle>
            <Activity className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(data.overview.total_volume)}
            </div>
            <p className="text-xs text-muted-foreground">총 거래 금액</p>
          </CardContent>
        </Card>
      </div>

      {/* 탭 메뉴 */}
      <Tabs defaultValue="usage" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="usage">시스템 사용량</TabsTrigger>
          <TabsTrigger value="activity">사용자 활동</TabsTrigger>
          <TabsTrigger value="performance">성능 지표</TabsTrigger>
          <TabsTrigger value="trends">성장 추이</TabsTrigger>
        </TabsList>

        {/* Supabase 사용량 */}
        <TabsContent value="usage" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Database className="w-5 h-5 mr-2" />
                Supabase 리소스 사용량
              </CardTitle>
              <CardDescription>무료 플랜 제한 대비 현재 사용량</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 데이터베이스 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">데이터베이스 저장소</span>
                  <Badge className={getUsageColor(getUsagePercentage(data.supabase_usage.database_size_mb, data.supabase_usage.database_limit_mb))}>
                    {getUsagePercentage(data.supabase_usage.database_size_mb, data.supabase_usage.database_limit_mb)}%
                  </Badge>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${getUsagePercentage(data.supabase_usage.database_size_mb, data.supabase_usage.database_limit_mb)}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-600">
                  {data.supabase_usage.database_size_mb}MB / {data.supabase_usage.database_limit_mb}MB
                </p>
              </div>

              {/* API 요청 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">월간 API 요청</span>
                  <Badge className={getUsageColor(getUsagePercentage(data.supabase_usage.api_requests_month, data.supabase_usage.api_limit_month))}>
                    {getUsagePercentage(data.supabase_usage.api_requests_month, data.supabase_usage.api_limit_month)}%
                  </Badge>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${getUsagePercentage(data.supabase_usage.api_requests_month, data.supabase_usage.api_limit_month)}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-600">
                  {data.supabase_usage.api_requests_month.toLocaleString()} / {data.supabase_usage.api_limit_month.toLocaleString()}
                </p>
              </div>

              {/* 대역폭 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">월간 대역폭</span>
                  <Badge className={getUsageColor(getUsagePercentage(data.supabase_usage.bandwidth_gb, data.supabase_usage.bandwidth_limit_gb))}>
                    {getUsagePercentage(data.supabase_usage.bandwidth_gb, data.supabase_usage.bandwidth_limit_gb)}%
                  </Badge>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${getUsagePercentage(data.supabase_usage.bandwidth_gb, data.supabase_usage.bandwidth_limit_gb)}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-600">
                  {data.supabase_usage.bandwidth_gb}GB / {data.supabase_usage.bandwidth_limit_gb}GB
                </p>
              </div>

              {/* 동시 연결 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">활성 연결</span>
                  <Badge className={getUsageColor(getUsagePercentage(data.supabase_usage.active_connections, data.supabase_usage.connection_limit))}>
                    {getUsagePercentage(data.supabase_usage.active_connections, data.supabase_usage.connection_limit)}%
                  </Badge>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-orange-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${getUsagePercentage(data.supabase_usage.active_connections, data.supabase_usage.connection_limit)}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-600">
                  {data.supabase_usage.active_connections} / {data.supabase_usage.connection_limit}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 사용자 활동 */}
        <TabsContent value="activity" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">일간 활성 사용자</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">{data.user_activity.daily_active_users}</div>
                <p className="text-sm text-gray-600">오늘 접속한 사용자</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">주간 활성 사용자</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{data.user_activity.weekly_active_users}</div>
                <p className="text-sm text-gray-600">최근 7일 접속</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">월간 활성 사용자</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600">{data.user_activity.monthly_active_users}</div>
                <p className="text-sm text-gray-600">최근 30일 접속</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">평균 세션 시간</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-600">{Math.round(data.user_activity.avg_session_duration)}분</div>
                <p className="text-sm text-gray-600">사용자당 평균</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">사용자당 거래수</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">{data.user_activity.transactions_per_user}</div>
                <p className="text-sm text-gray-600">평균 거래 건수</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 성능 지표 */}
        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">시스템 안정성</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>에러율</span>
                  <Badge variant={data.performance_metrics.error_rate < 1 ? "default" : "destructive"}>
                    {data.performance_metrics.error_rate.toFixed(2)}%
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>가동 시간</span>
                  <Badge variant={data.performance_metrics.uptime_percentage > 99 ? "default" : "secondary"}>
                    {data.performance_metrics.uptime_percentage.toFixed(2)}%
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>평균 응답 시간</span>
                  <Badge variant={data.performance_metrics.avg_response_time < 500 ? "default" : "secondary"}>
                    {data.performance_metrics.avg_response_time}ms
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">최대 동시 접속</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-blue-600 mb-2">
                  {data.performance_metrics.peak_concurrent_users}
                </div>
                <p className="text-sm text-gray-600">피크 시간대 동시 사용자</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 성장 추이 */}
        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="w-5 h-5 mr-2" />
                성장 추이 (최근 30일)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center text-gray-500 py-12">
                <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>차트 라이브러리 연동 필요</p>
                <p className="text-sm">(Chart.js 또는 Recharts)</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}