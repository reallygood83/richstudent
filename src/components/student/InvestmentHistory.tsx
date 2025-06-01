'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  History,
  TrendingUp,
  TrendingDown,
  RefreshCw
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface AssetTransaction {
  id: string
  transaction_type: 'buy' | 'sell'
  quantity: number
  price: number
  total_amount: number
  fee: number
  status: string
  created_at: string
  market_assets: {
    symbol: string
    name: string
  }
}

interface InvestmentHistoryProps {
  onRefresh?: () => void
}

export default function InvestmentHistory({ onRefresh }: InvestmentHistoryProps) {
  const [transactions, setTransactions] = useState<AssetTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchTransactions()
  }, [])

  const fetchTransactions = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/investments/portfolio')
      const data = await response.json()

      if (data.success) {
        setTransactions(data.portfolio.transactions || [])
      } else {
        setError(data.error)
      }
    } catch (err) {
      console.error('Transactions fetch error:', err)
      setError('거래 내역을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    await fetchTransactions()
    if (onRefresh) {
      onRefresh()
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatQuantity = (quantity: number) => {
    return quantity % 1 === 0 ? quantity.toString() : quantity.toFixed(4)
  }

  const getTransactionTypeColor = (type: 'buy' | 'sell') => {
    return type === 'buy' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
  }

  const getTransactionIcon = (type: 'buy' | 'sell') => {
    return type === 'buy' ? (
      <TrendingUp className="w-4 h-4 text-blue-600" />
    ) : (
      <TrendingDown className="w-4 h-4 text-red-600" />
    )
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <History className="w-5 h-5" />
            <span>투자 거래 내역</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">거래 내역을 불러오는 중...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <History className="w-5 h-5" />
            <span>투자 거래 내역</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="border-red-200 bg-red-50">
            <AlertDescription className="text-red-600">
              {error}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <History className="w-5 h-5" />
            <span>투자 거래 내역</span>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4 mr-2" />
            새로고침
          </Button>
        </CardTitle>
        <CardDescription>
          모든 투자 거래 내역을 확인할 수 있습니다
        </CardDescription>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <div className="text-center py-8">
            <History className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">아직 투자 거래 내역이 없습니다</p>
            <p className="text-sm text-gray-400 mt-2">매매하기 탭에서 투자를 시작해보세요!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center space-x-4 flex-1">
                  {/* 거래 타입 아이콘 */}
                  <div className="flex-shrink-0">
                    {getTransactionIcon(transaction.transaction_type)}
                  </div>

                  {/* 자산 정보 */}
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="font-bold">{transaction.market_assets.symbol}</h3>
                      <Badge 
                        className={getTransactionTypeColor(transaction.transaction_type)} 
                        variant="secondary"
                      >
                        {transaction.transaction_type === 'buy' ? '매수' : '매도'}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{transaction.market_assets.name}</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500">수량: </span>
                        <span className="font-medium">{formatQuantity(transaction.quantity)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">단가: </span>
                        <span className="font-medium">{formatCurrency(transaction.price)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">수수료: </span>
                        <span className="font-medium">{formatCurrency(transaction.fee)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">상태: </span>
                        <span className="font-medium text-green-600">
                          {transaction.status === 'completed' ? '완료' : '처리중'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 거래 금액 */}
                  <div className="text-right min-w-[150px]">
                    <div className="mb-1">
                      <p className="text-sm text-gray-500">거래금액</p>
                      <p className={`font-bold text-lg ${
                        transaction.transaction_type === 'buy' ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {transaction.transaction_type === 'buy' ? '-' : '+'}
                        {formatCurrency(transaction.total_amount)}
                      </p>
                    </div>
                    <p className="text-xs text-gray-500">
                      {formatDate(transaction.created_at)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}