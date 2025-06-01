'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  PieChart,
  ShoppingCart,
  History,
  RefreshCw,
  ArrowLeft
} from 'lucide-react'
import InvestmentPortfolio from '@/components/student/InvestmentPortfolio'
import InvestmentTradingFull from '@/components/student/InvestmentTradingFull'
import InvestmentHistory from '@/components/student/InvestmentHistory'

interface StudentSession {
  studentId: string
  studentName: string
  studentCode: string
  teacherId: string
  teacherName: string
  sessionCode: string
}

interface PortfolioSummary {
  total_invested: number
  current_value: number
  profit_loss: number
  profit_loss_percent: number
  cash_balance: number
  total_assets: number
}

export default function StudentInvestments() {
  const [session, setSession] = useState<StudentSession | null>(null)
  const [portfolioSummary, setPortfolioSummary] = useState<PortfolioSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const router = useRouter()

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      
      // 학생 세션 정보 확인
      const sessionResponse = await fetch('/api/student/me')
      const sessionData = await sessionResponse.json()

      if (!sessionData.success) {
        setError(sessionData.error)
        if (sessionData.error === '인증이 필요합니다.') {
          router.push('/student/login')
        }
        return
      }

      setSession(sessionData.session)

      // 포트폴리오 요약 정보 조회
      const portfolioResponse = await fetch('/api/investments/portfolio')
      const portfolioData = await portfolioResponse.json()

      if (portfolioData.success) {
        setPortfolioSummary(portfolioData.portfolio.summary)
      }

    } catch (err) {
      console.error('Data fetch error:', err)
      setError('데이터를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      // 포트폴리오 현재 가치 업데이트
      await fetch('/api/investments/portfolio', { method: 'PUT' })
      // 데이터 다시 불러오기
      await fetchData()
    } catch (err) {
      console.error('Refresh error:', err)
    } finally {
      setRefreshing(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatPercent = (percent: number) => {
    return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">투자 정보를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Alert className="max-w-md border-red-200 bg-red-50">
          <AlertDescription className="text-red-600">
            {error}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!session) {
    router.push('/student/login')
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/student/dashboard')}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>대시보드로</span>
              </Button>
              <div className="text-2xl">📈</div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">투자 관리</h1>
                <p className="text-xs text-gray-500">{session.teacherName} 선생님 ({session.sessionCode})</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center space-x-2"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span>새로고침</span>
              </Button>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{session.studentName}</p>
                <p className="text-xs text-gray-500">{session.studentCode}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Portfolio Summary Cards */}
        {portfolioSummary && (
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-blue-100">투자 원금</CardTitle>
                <DollarSign className="h-4 w-4 text-blue-100" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(portfolioSummary.total_invested)}</div>
                <p className="text-xs text-blue-100">
                  총 투자한 금액
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-green-100">현재 가치</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-100" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(portfolioSummary.current_value)}</div>
                <p className="text-xs text-green-100">
                  현재 포트폴리오 가치
                </p>
              </CardContent>
            </Card>

            <Card className={`text-white ${
              portfolioSummary.profit_loss >= 0 
                ? 'bg-gradient-to-r from-emerald-500 to-emerald-600' 
                : 'bg-gradient-to-r from-red-500 to-red-600'
            }`}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className={`text-sm font-medium ${
                  portfolioSummary.profit_loss >= 0 ? 'text-emerald-100' : 'text-red-100'
                }`}>
                  손익
                </CardTitle>
                {portfolioSummary.profit_loss >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-emerald-100" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-100" />
                )}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(portfolioSummary.profit_loss)}</div>
                <p className={`text-xs ${
                  portfolioSummary.profit_loss >= 0 ? 'text-emerald-100' : 'text-red-100'
                }`}>
                  {formatPercent(portfolioSummary.profit_loss_percent)}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-purple-100">투자 가능 금액</CardTitle>
                <PieChart className="h-4 w-4 text-purple-100" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(portfolioSummary.cash_balance)}</div>
                <p className="text-xs text-purple-100">
                  투자계좌 현금 잔액
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Investment Tabs */}
        <Tabs defaultValue="portfolio" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="portfolio" className="flex items-center space-x-2">
              <PieChart className="w-4 h-4" />
              <span>포트폴리오</span>
            </TabsTrigger>
            <TabsTrigger value="trading" className="flex items-center space-x-2">
              <ShoppingCart className="w-4 h-4" />
              <span>매매하기</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center space-x-2">
              <History className="w-4 h-4" />
              <span>거래내역</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="portfolio" className="mt-6">
            <InvestmentPortfolio onDataChange={fetchData} />
          </TabsContent>

          <TabsContent value="trading" className="mt-6">
            <InvestmentTradingFull 
              cashBalance={portfolioSummary?.cash_balance || 0}
              onTradeComplete={fetchData}
            />
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <InvestmentHistory onRefresh={fetchData} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}