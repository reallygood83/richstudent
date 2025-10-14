'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { History, ArrowRight, DollarSign, TrendingUp, TrendingDown, Users, RefreshCw } from 'lucide-react'
import { Student } from '@/types'

interface Transaction {
  id: string
  from_student_name?: string
  to_student_name?: string
  transaction_type: string
  amount: number
  description: string
  status: string
  created_at: string
  from_account_type?: string
  to_account_type?: string
}

interface TransactionStatistics {
  total_transactions: number
  total_sent: number
  total_received: number
  net_change: number
  sent_count: number
  received_count: number
  type_breakdown: {
    transfer: number
    multi_transfer: number
    allowance: number
    tax: number
    loan: number
    real_estate_purchase: number
    real_estate_sale: number
    investment_buy: number
    investment_sell: number
    other: number
  }
  student_name: string
}

interface TransactionHistoryProps {
  students: Student[]
}

export default function TransactionHistory({ students }: TransactionHistoryProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [statistics, setStatistics] = useState<TransactionStatistics | null>(null)
  const [selectedStudentId, setSelectedStudentId] = useState<string>('all')
  const [loading, setLoading] = useState(false)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR')
  }

  const getTransactionTypeLabel = (type: string) => {
    const types: { [key: string]: string } = {
      transfer: '송금',
      multi_transfer: '다중송금',
      allowance: '수당',
      tax: '세금',
      loan: '대출',
      real_estate_purchase: '좌석구매',
      real_estate_sale: '좌석판매',
      investment_buy: '투자매수',
      investment_sell: '투자매도',
      fee: '수수료',
      adjustment: '조정'
    }
    return types[type] || type
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true)
      const url = selectedStudentId === 'all'
        ? '/api/transactions/list'
        : `/api/transactions/list?student_id=${selectedStudentId}`

      if (process.env.NODE_ENV === 'development') {
        console.log('Fetching transactions:', url)
      }

      const response = await fetch(url)

      // HTTP 에러 응답 처리
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: '알 수 없는 오류가 발생했습니다.' }))
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.success) {
        setTransactions(data.transactions || [])
        setStatistics(data.statistics || null)

        if (process.env.NODE_ENV === 'development') {
          console.log('✅ Transactions loaded:', data.transactions?.length || 0)
          if (data.statistics) {
            console.log('📊 Statistics:', data.statistics)
          }
        }
      } else {
        throw new Error(data.error || '거래 내역을 불러오는데 실패했습니다.')
      }
    } catch (error) {
      // 에러를 사용자에게 표시
      const errorMessage = error instanceof Error ? error.message : '거래 내역을 불러오는데 실패했습니다.'

      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to fetch transactions:', error)
      }

      // 빈 배열로 설정하여 UI가 깨지지 않도록 함
      setTransactions([])
      setStatistics(null)

      // TODO: 사용자에게 토스트 메시지나 에러 UI 표시
      alert(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [selectedStudentId])

  useEffect(() => {
    fetchTransactions()
  }, [selectedStudentId, fetchTransactions])

  const handleStudentChange = (value: string) => {
    console.log('Student filter changed to:', value)
    setSelectedStudentId(value)
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <History className="w-5 h-5" />
            <span>거래 내역</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">거래 내역을 불러오는 중...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* 학생 선택 드롭다운 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <History className="w-5 h-5" />
              <span>거래 내역</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchTransactions}
              className="flex items-center space-x-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>새로고침</span>
            </Button>
          </CardTitle>
          <CardDescription>
            {selectedStudentId === 'all'
              ? '모든 학생의 거래 기록을 확인할 수 있습니다'
              : `선택한 학생의 모든 거래 기록 (송금, 입금, 투자, 대출 등)`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <Users className="w-5 h-5 text-gray-500" />
            <Select value={selectedStudentId} onValueChange={handleStudentChange}>
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder="학생 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 학생</SelectItem>
                {students.map((student) => (
                  <SelectItem key={student.id} value={student.id}>
                    {student.name} ({student.student_code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm text-gray-500">
              총 {transactions.length}개의 거래
            </span>
          </div>
        </CardContent>
      </Card>

      {/* 학생별 통계 (선택된 경우만 표시) */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">총 거래 수</CardTitle>
              <History className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.total_transactions}</div>
              <p className="text-xs text-muted-foreground">
                송금 {statistics.sent_count}건 / 입금 {statistics.received_count}건
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">총 송금액</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                -{formatCurrency(statistics.total_sent)}
              </div>
              <p className="text-xs text-muted-foreground">
                {statistics.sent_count}건의 송금
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">총 입금액</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                +{formatCurrency(statistics.total_received)}
              </div>
              <p className="text-xs text-muted-foreground">
                {statistics.received_count}건의 입금
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">순 변동액</CardTitle>
              <DollarSign className={`h-4 w-4 ${statistics.net_change >= 0 ? 'text-green-500' : 'text-red-500'}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${statistics.net_change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {statistics.net_change >= 0 ? '+' : ''}{formatCurrency(statistics.net_change)}
              </div>
              <p className="text-xs text-muted-foreground">
                입금 - 송금
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 거래 유형별 통계 (선택된 경우만 표시) */}
      {statistics && (
        <Card>
          <CardHeader>
            <CardTitle>거래 유형별 통계 - {statistics.student_name}</CardTitle>
            <CardDescription>각 거래 유형별 건수</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {Object.entries(statistics.type_breakdown).map(([type, count]) => (
                count > 0 && (
                  <div key={type} className="flex flex-col items-center p-4 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600 mb-2">{getTransactionTypeLabel(type)}</span>
                    <span className="text-2xl font-bold text-blue-600">{count}</span>
                  </div>
                )
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 거래 내역 리스트 */}
      <Card>
        <CardHeader>
          <CardTitle>거래 내역 상세</CardTitle>
          <CardDescription>
            {selectedStudentId === 'all'
              ? '최근 100건의 거래 내역'
              : `${statistics?.student_name}의 모든 거래 내역`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-12">
              <History className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">거래 내역이 없습니다</h3>
              <p className="text-gray-500">
                {selectedStudentId === 'all'
                  ? '첫 번째 거래를 실행하면 여기에 기록이 표시됩니다.'
                  : '이 학생의 거래 기록이 없습니다.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-white"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <Badge variant="outline">
                          {getTransactionTypeLabel(transaction.transaction_type)}
                        </Badge>
                        <Badge className={getStatusColor(transaction.status)}>
                          {transaction.status === 'completed' ? '완료' : transaction.status}
                        </Badge>
                        <span className={`text-lg font-semibold ${transaction.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {transaction.amount < 0 ? '-' : '+'}{formatCurrency(Math.abs(transaction.amount))}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
                        {transaction.from_student_name && (
                          <>
                            <span className="font-medium">{transaction.from_student_name}</span>
                            {transaction.from_account_type && (
                              <span className="text-xs text-gray-500">({transaction.from_account_type})</span>
                            )}
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                        {transaction.to_student_name && (
                          <>
                            <span className="font-medium">{transaction.to_student_name}</span>
                            {transaction.to_account_type && (
                              <span className="text-xs text-gray-500">({transaction.to_account_type})</span>
                            )}
                          </>
                        )}
                      </div>

                      {transaction.description && (
                        <p className="text-sm text-gray-600 mb-2">
                          {transaction.description}
                        </p>
                      )}

                      <p className="text-xs text-gray-500">
                        {formatDateTime(transaction.created_at)}
                      </p>
                    </div>

                    <div className="ml-4">
                      <DollarSign className={`w-6 h-6 ${transaction.amount < 0 ? 'text-red-500' : 'text-green-500'}`} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
