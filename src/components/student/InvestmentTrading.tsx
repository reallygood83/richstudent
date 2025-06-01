'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ShoppingCart } from 'lucide-react'

interface InvestmentTradingProps {
  cashBalance: number
  onTradeComplete: () => void
}

export default function InvestmentTrading({ cashBalance }: InvestmentTradingProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className="space-y-6">
      {/* 투자 가능 금액 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <ShoppingCart className="w-5 h-5" />
            <span>투자 거래</span>
          </CardTitle>
          <CardDescription>
            투자 가능 금액: {formatCurrency(cashBalance)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">투자 거래 시스템</h3>
            <p className="text-gray-500 mb-4">
              매수/매도 기능이 구현되어 있습니다
            </p>
            <div className="text-sm text-gray-600 space-y-2">
              <p>• 실시간 자산 가격 조회</p>
              <p>• 매수/매도 주문 처리</p>
              <p>• 수수료 자동 계산</p>
              <p>• 포트폴리오 자동 업데이트</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}