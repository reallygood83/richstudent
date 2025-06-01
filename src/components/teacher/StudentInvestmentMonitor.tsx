'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  TrendingUp, 
  Users, 
  DollarSign,
  PieChart,
  RefreshCw,
  ChevronDown,
  ChevronRight
} from 'lucide-react'

interface MarketAsset {
  id: string
  symbol: string
  name: string
  current_price: number
  asset_type: string
  category: string
}

interface PortfolioHolding {
  quantity: number
  average_price: number
  total_invested: number
  current_value: number
  profit_loss: number
  profit_loss_percent: number
  market_assets: MarketAsset
}

interface StudentInvestmentData {
  id: string
  name: string
  student_code: string
  credit_score: number
  accounts: {
    checking: number
    savings: number
    investment: number
  }
  portfolio: {
    holdings: PortfolioHolding[]
    total_value: number
    total_invested: number
    total_profit_loss: number
    total_profit_loss_percent: number
    holdings_count: number
  }
  recent_transactions: Array<{
    transaction_type: string
    quantity: number
    total_amount: number
    created_at: string
    market_assets: {
      name: string
    }
  }>
  total_assets: number
}

interface ClassStats {
  total_students: number
  total_portfolio_value: number
  total_invested: number
  total_cash: number
  total_assets: number
  average_credit_score: number
  active_investors: number
  total_profit_loss: number
  total_profit_loss_percent: number
}

export default function StudentInvestmentMonitor() {
  const [students, setStudents] = useState<StudentInvestmentData[]>([])
  const [classStats, setClassStats] = useState<ClassStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null)

  useEffect(() => {
    fetchInvestmentData()
    // 1분마다 자동 새로고침
    const interval = setInterval(fetchInvestmentData, 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const fetchInvestmentData = async () => {
    try {
      setLoading(true)
      setError('')

      console.log('Fetching investment data...')
      const response = await fetch('/api/teacher/students/investments')
      console.log('Response status:', response.status)
      
      const data = await response.json()
      console.log('Response data:', data)

      if (data.success) {
        console.log('Students data:', data.data.students)
        console.log('Class stats:', data.data.class_stats)
        setStudents(data.data.students)
        setClassStats(data.data.class_stats)
      } else {
        console.error('API error:', data.error)
        setError(data.error || '투자 현황을 불러올 수 없습니다.')
      }
    } catch (err) {
      console.error('Investment data fetch error:', err)
      setError('서버 연결 실패: ' + (err as Error).message)
    } finally {
      setLoading(false)
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
    const sign = percent >= 0 ? '+' : ''
    return `${sign}${percent.toFixed(2)}%`
  }

  const getProfitColor = (profit: number) => {
    if (profit > 0) return 'text-green-600'
    if (profit < 0) return 'text-red-600'
    return 'text-gray-600'
  }

  const getProfitBadgeVariant = (profit: number) => {
    if (profit > 0) return 'default'
    if (profit < 0) return 'destructive'
    return 'secondary'
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-600">투자 현황을 불러오는 중...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-6">
          <div className="text-red-700 mb-4">{error}</div>
          <div className="space-y-2">
            <Button onClick={fetchInvestmentData} variant="outline">
              다시 시도
            </Button>
            <Button 
              onClick={() => window.open('/api/debug/investment-test', '_blank')} 
              variant="outline" 
              size="sm"
            >
              디버그 정보 확인
            </Button>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            <p><strong>해결 방법:</strong></p>
            <ol className="list-decimal list-inside space-y-1 mt-2">
              <li>Supabase에서 <code>COMPLETE_DATABASE_SETUP.sql</code> 실행</li>
              <li>교사 로그인 상태 확인</li>
              <li>학생 데이터가 있는지 확인</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    )
  }

  // 데이터는 성공적으로 로드되었지만 학생이 없는 경우
  if (students.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>학생 투자 현황</CardTitle>
          <CardDescription>현재 등록된 학생이 없습니다</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-12">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">학생이 없습니다</h3>
          <p className="text-gray-500 mb-4">
            먼저 &quot;학생 관리&quot; 탭에서 학생을 등록해주세요.
          </p>
          <Button onClick={fetchInvestmentData} variant="outline">
            새로고침
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* 클래스 전체 통계 */}
      {classStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">총 투자 가치</CardTitle>
              <PieChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(classStats.total_portfolio_value)}</div>
              <div className={`text-xs ${getProfitColor(classStats.total_profit_loss)}`}>
                {formatPercent(classStats.total_profit_loss_percent)} 
                ({formatCurrency(classStats.total_profit_loss)})
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">투자 참여자</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{classStats.active_investors}</div>
              <p className="text-xs text-muted-foreground">
                전체 {classStats.total_students}명 중
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">현금 보유</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(classStats.total_cash)}</div>
              <p className="text-xs text-muted-foreground">
                투자 계좌 잔액
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">평균 신용점수</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Math.round(classStats.average_credit_score)}</div>
              <p className="text-xs text-muted-foreground">
                350-850 범위
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 개별 학생 투자 현황 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>학생 투자 현황</CardTitle>
              <CardDescription>각 학생의 포트폴리오와 수익률을 확인할 수 있습니다</CardDescription>
            </div>
            <Button onClick={fetchInvestmentData} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              새로고침
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {students.map((student) => (
              <div key={student.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div>
                      <h3 className="font-semibold">{student.name}</h3>
                      <p className="text-sm text-gray-500">#{student.student_code}</p>
                    </div>
                    <div className="flex flex-col text-right">
                      <span className="text-sm font-medium">포트폴리오 가치</span>
                      <span className="text-lg font-bold">{formatCurrency(student.portfolio.total_value)}</span>
                    </div>
                    <div className="flex flex-col text-right">
                      <span className="text-sm font-medium">수익률</span>
                      <Badge variant={getProfitBadgeVariant(student.portfolio.total_profit_loss)}>
                        {formatPercent(student.portfolio.total_profit_loss_percent)}
                      </Badge>
                    </div>
                    <div className="flex flex-col text-right">
                      <span className="text-sm font-medium">보유 종목</span>
                      <span className="text-lg font-bold">{student.portfolio.holdings_count}개</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpandedStudent(
                      expandedStudent === student.id ? null : student.id
                    )}
                  >
                    {expandedStudent === student.id ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </Button>
                </div>

                {/* 상세 정보 (확장 시) */}
                {expandedStudent === student.id && (
                  <div className="mt-4 pt-4 border-t">
                    <Tabs defaultValue="portfolio" className="w-full">
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="portfolio">포트폴리오</TabsTrigger>
                        <TabsTrigger value="accounts">계좌 현황</TabsTrigger>
                        <TabsTrigger value="transactions">최근 거래</TabsTrigger>
                      </TabsList>

                      <TabsContent value="portfolio" className="space-y-3">
                        {student.portfolio.holdings.length > 0 ? (
                          student.portfolio.holdings.map((holding, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                              <div>
                                <span className="font-medium">{holding.market_assets.name}</span>
                                <span className="text-sm text-gray-500 ml-2">({holding.market_assets.symbol})</span>
                              </div>
                              <div className="text-right">
                                <div className="font-medium">{holding.quantity}주</div>
                                <div className="text-sm text-gray-500">
                                  {formatCurrency(holding.current_value)}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className={`font-medium ${getProfitColor(holding.profit_loss)}`}>
                                  {formatPercent(holding.profit_loss_percent || 0)}
                                </div>
                                <div className={`text-sm ${getProfitColor(holding.profit_loss)}`}>
                                  {formatCurrency(holding.profit_loss)}
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-gray-500 text-center py-4">보유 중인 자산이 없습니다.</p>
                        )}
                      </TabsContent>

                      <TabsContent value="accounts" className="space-y-3">
                        <div className="grid grid-cols-3 gap-4">
                          <div className="text-center p-3 bg-blue-50 rounded">
                            <div className="text-sm text-gray-600">입출금 계좌</div>
                            <div className="text-lg font-bold">{formatCurrency(student.accounts.checking || 0)}</div>
                          </div>
                          <div className="text-center p-3 bg-green-50 rounded">
                            <div className="text-sm text-gray-600">저축 계좌</div>
                            <div className="text-lg font-bold">{formatCurrency(student.accounts.savings || 0)}</div>
                          </div>
                          <div className="text-center p-3 bg-purple-50 rounded">
                            <div className="text-sm text-gray-600">투자 계좌</div>
                            <div className="text-lg font-bold">{formatCurrency(student.accounts.investment || 0)}</div>
                          </div>
                        </div>
                        <div className="text-center p-3 bg-gray-100 rounded">
                          <div className="text-sm text-gray-600">총 자산</div>
                          <div className="text-xl font-bold">{formatCurrency(student.total_assets)}</div>
                        </div>
                      </TabsContent>

                      <TabsContent value="transactions" className="space-y-2">
                        {student.recent_transactions.length > 0 ? (
                          student.recent_transactions.map((tx, index) => (
                            <div key={index} className="flex items-center justify-between p-2 border rounded">
                              <div>
                                <span className={`inline-block px-2 py-1 rounded text-xs ${
                                  tx.transaction_type === 'buy' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
                                }`}>
                                  {tx.transaction_type === 'buy' ? '매수' : '매도'}
                                </span>
                                <span className="ml-2 font-medium">{tx.market_assets.name}</span>
                              </div>
                              <div className="text-right">
                                <div>{tx.quantity}주</div>
                                <div className="text-sm text-gray-500">
                                  {formatCurrency(tx.total_amount)}
                                </div>
                              </div>
                              <div className="text-sm text-gray-500">
                                {new Date(tx.created_at).toLocaleDateString('ko-KR')}
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-gray-500 text-center py-4">최근 거래 내역이 없습니다.</p>
                        )}
                      </TabsContent>
                    </Tabs>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}