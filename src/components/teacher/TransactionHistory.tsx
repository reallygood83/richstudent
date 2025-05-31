'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { History, ArrowRight, DollarSign } from 'lucide-react'

interface Transaction {
  id: string
  from_student_name?: string
  to_student_name?: string
  transaction_type: string
  amount: number
  description: string
  status: string
  created_at: string
}

interface TransactionHistoryProps {
  transactions: Transaction[]
  loading: boolean
}

export default function TransactionHistory({ transactions, loading }: TransactionHistoryProps) {
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
      allowance: '수당',
      tax: '세금',
      loan: '대출',
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <History className="w-5 h-5" />
          <span>거래 내역</span>
        </CardTitle>
        <CardDescription>
          모든 거래 기록을 확인할 수 있습니다
        </CardDescription>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <div className="text-center py-12">
            <History className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">거래 내역이 없습니다</h3>
            <p className="text-gray-500">
              첫 번째 거래를 실행하면 여기에 기록이 표시됩니다.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="border rounded-lg p-4 hover:shadow-md transition-shadow"
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
                      <span className="text-lg font-semibold">
                        {formatCurrency(transaction.amount)}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
                      {transaction.from_student_name && (
                        <>
                          <span>{transaction.from_student_name}</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                      {transaction.to_student_name && (
                        <span>{transaction.to_student_name}</span>
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
                    <DollarSign className="w-6 h-6 text-green-500" />
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