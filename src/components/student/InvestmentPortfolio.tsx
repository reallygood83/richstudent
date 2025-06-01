'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  TrendingUp, 
  TrendingDown,
  PieChart,
  Minus,
  Plus,
  DollarSign
} from 'lucide-react'

interface Asset {
  id: string
  symbol: string
  name: string
  current_price: number
  currency: string
  asset_type: string
  category: string
}

interface PortfolioHolding {
  id: string
  quantity: number
  average_price: number
  total_invested: number
  current_value: number
  profit_loss: number
  profit_loss_percent: number
  weight: number
  created_at: string
  updated_at: string
  market_assets: Asset
}

interface CategoryDistribution {
  category: string
  value: number
  count: number
  weight: number
}

interface PortfolioData {
  holdings: PortfolioHolding[]
  distribution: {
    by_category: CategoryDistribution[]
  }
}

interface InvestmentPortfolioProps {
  onDataChange: () => void
}

export default function InvestmentPortfolio({ onDataChange }: InvestmentPortfolioProps) {
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchPortfolio()
  }, [])

  const fetchPortfolio = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/investments/portfolio')
      const data = await response.json()

      if (data.success) {
        setPortfolio(data.portfolio)
      } else {
        setError(data.error)
      }
    } catch (err) {
      console.error('Portfolio fetch error:', err)
      setError('포트폴리오를 불러오는데 실패했습니다.')
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
    return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`
  }

  const formatQuantity = (quantity: number) => {
    return quantity % 1 === 0 ? quantity.toString() : quantity.toFixed(4)
  }

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      '주식': 'bg-blue-100 text-blue-800',
      '암호화폐': 'bg-purple-100 text-purple-800',
      '상품': 'bg-yellow-100 text-yellow-800',
      '부동산': 'bg-green-100 text-green-800',
      'ETF': 'bg-indigo-100 text-indigo-800',
      '기타': 'bg-gray-100 text-gray-800'
    }
    return colors[category] || colors['기타']
  }

  if (loading) {
    return (
      <div className=\"space-y-6\">
        <div className=\"animate-pulse\">
          <div className=\"h-8 bg-gray-200 rounded w-1/4 mb-4\"></div>
          <div className=\"space-y-3\">
            {[1, 2, 3].map((i) => (
              <div key={i} className=\"h-20 bg-gray-200 rounded\"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert className=\"border-red-200 bg-red-50\">
        <AlertDescription className=\"text-red-600\">
          {error}
        </AlertDescription>
      </Alert>
    )
  }

  if (!portfolio || portfolio.holdings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className=\"flex items-center space-x-2\">
            <PieChart className=\"w-5 h-5\" />
            <span>포트폴리오</span>
          </CardTitle>
          <CardDescription>
            현재 보유 중인 투자 자산이 없습니다
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className=\"text-center py-12\">
            <PieChart className=\"w-16 h-16 text-gray-300 mx-auto mb-4\" />
            <p className=\"text-gray-500 mb-4\">아직 투자한 자산이 없습니다</p>
            <p className=\"text-sm text-gray-400\">매매하기 탭에서 자산을 구매해보세요!</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className=\"space-y-6\">
      {/* 카테고리별 분포 */}
      {portfolio.distribution.by_category.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className=\"flex items-center space-x-2\">
              <PieChart className=\"w-5 h-5\" />
              <span>자산 분포</span>
            </CardTitle>
            <CardDescription>
              카테고리별 투자 비중을 확인할 수 있습니다
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className=\"grid grid-cols-2 md:grid-cols-4 gap-4\">
              {portfolio.distribution.by_category.map((item) => (
                <div key={item.category} className=\"text-center\">
                  <Badge className={getCategoryColor(item.category)} variant=\"secondary\">
                    {item.category}
                  </Badge>
                  <p className=\"font-bold text-lg mt-2\">{item.weight.toFixed(1)}%</p>
                  <p className=\"text-sm text-gray-600\">{formatCurrency(item.value)}</p>
                  <p className=\"text-xs text-gray-500\">{item.count}개 종목</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 보유 자산 목록 */}
      <Card>
        <CardHeader>
          <CardTitle className=\"flex items-center justify-between\">
            <div className=\"flex items-center space-x-2\">
              <DollarSign className=\"w-5 h-5\" />
              <span>보유 자산</span>
            </div>
            <Button
              variant=\"outline\"
              size=\"sm\"
              onClick={() => {
                fetchPortfolio()
                onDataChange()
              }}
            >
              새로고침
            </Button>
          </CardTitle>
          <CardDescription>
            현재 보유 중인 투자 자산 현황입니다
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className=\"space-y-4\">
            {portfolio.holdings.map((holding) => (
              <div
                key={holding.id}
                className=\"flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50\"
              >
                <div className=\"flex items-center space-x-4 flex-1\">
                  {/* 자산 정보 */}
                  <div className=\"flex-1\">
                    <div className=\"flex items-center space-x-2 mb-1\">
                      <h3 className=\"font-bold text-lg\">{holding.market_assets.symbol}</h3>
                      <Badge className={getCategoryColor(holding.market_assets.category)} variant=\"secondary\">
                        {holding.market_assets.category}
                      </Badge>
                    </div>
                    <p className=\"text-sm text-gray-600 mb-2\">{holding.market_assets.name}</p>
                    <div className=\"grid grid-cols-2 md:grid-cols-4 gap-2 text-sm\">
                      <div>
                        <span className=\"text-gray-500\">보유수량: </span>
                        <span className=\"font-medium\">{formatQuantity(holding.quantity)}</span>
                      </div>
                      <div>
                        <span className=\"text-gray-500\">평균단가: </span>
                        <span className=\"font-medium\">{formatCurrency(holding.average_price)}</span>
                      </div>
                      <div>
                        <span className=\"text-gray-500\">현재가: </span>
                        <span className=\"font-medium\">{formatCurrency(holding.market_assets.current_price)}</span>
                      </div>
                      <div>
                        <span className=\"text-gray-500\">비중: </span>
                        <span className=\"font-medium\">{holding.weight.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>

                  {/* 투자 금액 및 현재 가치 */}
                  <div className=\"text-right min-w-[150px]\">
                    <div className=\"mb-2\">
                      <p className=\"text-sm text-gray-500\">투자금액</p>
                      <p className=\"font-medium\">{formatCurrency(holding.total_invested)}</p>
                    </div>
                    <div className=\"mb-2\">
                      <p className=\"text-sm text-gray-500\">현재가치</p>
                      <p className=\"font-bold text-lg\">{formatCurrency(holding.current_value)}</p>
                    </div>
                  </div>

                  {/* 손익 */}
                  <div className=\"text-right min-w-[120px]\">
                    <div className={`flex items-center justify-end space-x-1 mb-1 ${\n                      holding.profit_loss >= 0 ? 'text-green-600' : 'text-red-600'\n                    }`}>\n                      {holding.profit_loss >= 0 ? (\n                        <TrendingUp className=\"w-4 h-4\" />\n                      ) : (\n                        <TrendingDown className=\"w-4 h-4\" />\n                      )}\n                      <span className=\"font-bold\">\n                        {formatPercent(holding.profit_loss_percent)}\n                      </span>\n                    </div>\n                    <p className={`font-bold ${\n                      holding.profit_loss >= 0 ? 'text-green-600' : 'text-red-600'\n                    }`}>\n                      {holding.profit_loss >= 0 ? '+' : ''}{formatCurrency(holding.profit_loss)}\n                    </p>\n                  </div>\n                </div>\n              </div>\n            ))}\n          </div>\n        </CardContent>\n      </Card>\n    </div>\n  )\n}"