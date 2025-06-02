import { useState, useEffect, useCallback } from 'react'

interface AnalyticsHookOptions {
  autoRefresh?: boolean
  refreshInterval?: number // 밀리초
}

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

export function useAnalytics(options: AnalyticsHookOptions = {}) {
  const { autoRefresh = false, refreshInterval = 5 * 60 * 1000 } = options
  
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchAnalytics = useCallback(async () => {
    try {
      setError(null)
      const response = await fetch('/api/admin/analytics')
      const result = await response.json()
      
      if (result.success) {
        setData(result.data)
        setLastUpdated(new Date())
      } else {
        setError(result.error || '데이터 로드 실패')
      }
    } catch (err) {
      setError('서버 연결 실패')
      console.error('Analytics fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const exportData = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/analytics/export')
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `richstudent-analytics-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
        return true
      } else {
        throw new Error('Export failed')
      }
    } catch (err) {
      console.error('Export error:', err)
      return false
    }
  }, [])

  const getUsagePercentage = useCallback((used: number, limit: number) => {
    return Math.round((used / limit) * 100)
  }, [])

  const getUsageStatus = useCallback((percentage: number) => {
    if (percentage >= 90) return 'critical'
    if (percentage >= 70) return 'warning'
    if (percentage >= 50) return 'moderate'
    return 'normal'
  }, [])

  const getResourceAlerts = useCallback(() => {
    if (!data) return []
    
    const alerts = []
    const { supabase_usage } = data
    
    const dbUsage = getUsagePercentage(supabase_usage.database_size_mb, supabase_usage.database_limit_mb)
    const apiUsage = getUsagePercentage(supabase_usage.api_requests_month, supabase_usage.api_limit_month)
    const bandwidthUsage = getUsagePercentage(supabase_usage.bandwidth_gb, supabase_usage.bandwidth_limit_gb)
    const connectionUsage = getUsagePercentage(supabase_usage.active_connections, supabase_usage.connection_limit)

    if (dbUsage >= 80) {
      alerts.push({
        type: 'database',
        level: dbUsage >= 90 ? 'critical' : 'warning',
        message: `데이터베이스 사용량 ${dbUsage}% (${supabase_usage.database_size_mb}MB/${supabase_usage.database_limit_mb}MB)`,
        percentage: dbUsage
      })
    }

    if (apiUsage >= 80) {
      alerts.push({
        type: 'api',
        level: apiUsage >= 90 ? 'critical' : 'warning',
        message: `API 요청 사용량 ${apiUsage}% (${supabase_usage.api_requests_month.toLocaleString()}/${supabase_usage.api_limit_month.toLocaleString()})`,
        percentage: apiUsage
      })
    }

    if (bandwidthUsage >= 80) {
      alerts.push({
        type: 'bandwidth',
        level: bandwidthUsage >= 90 ? 'critical' : 'warning',
        message: `대역폭 사용량 ${bandwidthUsage}% (${supabase_usage.bandwidth_gb}GB/${supabase_usage.bandwidth_limit_gb}GB)`,
        percentage: bandwidthUsage
      })
    }

    if (connectionUsage >= 80) {
      alerts.push({
        type: 'connections',
        level: connectionUsage >= 90 ? 'critical' : 'warning',
        message: `동시 연결 사용량 ${connectionUsage}% (${supabase_usage.active_connections}/${supabase_usage.connection_limit})`,
        percentage: connectionUsage
      })
    }

    return alerts
  }, [data, getUsagePercentage])

  // 성장률 계산
  const getGrowthRate = useCallback((current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0
    return Math.round(((current - previous) / previous) * 100 * 100) / 100
  }, [])

  // 예상 제한 도달 시점 계산
  const getEstimatedLimitReach = useCallback((currentUsage: number, limit: number, dailyGrowth: number) => {
    if (dailyGrowth <= 0) return null
    
    const remainingCapacity = limit - currentUsage
    const daysUntilLimit = Math.ceil(remainingCapacity / dailyGrowth)
    
    if (daysUntilLimit <= 0) return new Date()
    
    const estimatedDate = new Date()
    estimatedDate.setDate(estimatedDate.getDate() + daysUntilLimit)
    return estimatedDate
  }, [])

  // 자동 새로고침 설정
  useEffect(() => {
    fetchAnalytics()
    
    if (autoRefresh) {
      const interval = setInterval(fetchAnalytics, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [fetchAnalytics, autoRefresh, refreshInterval])

  return {
    data,
    loading,
    error,
    lastUpdated,
    fetchAnalytics,
    exportData,
    getUsagePercentage,
    getUsageStatus,
    getResourceAlerts,
    getGrowthRate,
    getEstimatedLimitReach
  }
}

// 특정 메트릭만 추적하는 간단한 훅
export function useMetric(metricPath: string, options: AnalyticsHookOptions = {}) {
  const { data, loading, error, fetchAnalytics } = useAnalytics(options)
  
  const getValue = useCallback(() => {
    if (!data) return null
    
    const paths = metricPath.split('.')
    let value: unknown = data
    
    for (const path of paths) {
      if (value && typeof value === 'object' && path in value) {
        value = (value as Record<string, unknown>)[path]
      } else {
        return null
      }
    }
    
    return value
  }, [data, metricPath])

  return {
    value: getValue(),
    loading,
    error,
    refresh: fetchAnalytics
  }
}

// 알림 전용 훅
export function useAnalyticsAlerts() {
  const { getResourceAlerts, loading } = useAnalytics({ autoRefresh: true, refreshInterval: 60000 })
  
  const alerts = getResourceAlerts()
  const criticalAlerts = alerts.filter(alert => alert.level === 'critical')
  const warningAlerts = alerts.filter(alert => alert.level === 'warning')
  
  return {
    alerts,
    criticalAlerts,
    warningAlerts,
    hasCriticalAlerts: criticalAlerts.length > 0,
    hasWarningAlerts: warningAlerts.length > 0,
    totalAlerts: alerts.length,
    loading
  }
}