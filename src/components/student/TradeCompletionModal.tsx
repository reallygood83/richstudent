'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  CheckCircle, 
  TrendingUp, 
  TrendingDown,
  Building,
  DollarSign,
  Sparkles
} from 'lucide-react'
import confetti from 'canvas-confetti'

interface TradeCompletionModalProps {
  isOpen: boolean
  onClose: () => void
  tradeData: {
    type: 'buy' | 'sell'
    assetType: 'stock' | 'real_estate'
    assetName: string
    assetSymbol?: string
    quantity: number
    price: number
    totalAmount: number
    fee?: number
    remainingBalance?: number
  } | null
}

export default function TradeCompletionModal({ 
  isOpen, 
  onClose, 
  tradeData 
}: TradeCompletionModalProps) {
  const [showContent, setShowContent] = useState(false)

  useEffect(() => {
    if (isOpen && tradeData) {
      // 모달이 열릴 때 confetti 효과
      setTimeout(() => {
        triggerSuccessAnimation()
        setShowContent(true)
      }, 200)
    } else {
      setShowContent(false)
    }
  }, [isOpen, tradeData])

  const triggerSuccessAnimation = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#10B981', '#34D399', '#6EE7B7', '#FBBF24', '#F59E0B']
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const getTradeIcon = () => {
    if (!tradeData) return null
    
    if (tradeData.assetType === 'real_estate') {
      return <Building className="w-12 h-12 text-blue-500" />
    }
    
    return tradeData.type === 'buy' 
      ? <TrendingUp className="w-12 h-12 text-green-500" />
      : <TrendingDown className="w-12 h-12 text-red-500" />
  }

  const getTradeMessage = () => {
    if (!tradeData) return ''
    
    const action = tradeData.type === 'buy' ? '매수' : '매도'
    const assetTypeText = tradeData.assetType === 'real_estate' ? '부동산' : '주식'
    
    return `${assetTypeText} ${action} 완료!`
  }

  const getTradeColor = () => {
    if (!tradeData) return 'text-gray-600'
    return tradeData.type === 'buy' ? 'text-green-600' : 'text-red-600'
  }

  if (!tradeData) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-center justify-center">
            <CheckCircle className="w-6 h-6 text-green-500" />
            거래 완료
          </DialogTitle>
        </DialogHeader>

        {showContent && (
          <div className="space-y-6 py-4">
            {/* 거래 아이콘 및 메시지 */}
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="p-4 bg-gray-50 rounded-full">
                  {getTradeIcon()}
                </div>
              </div>
              <h2 className={`text-xl font-bold ${getTradeColor()} mb-2`}>
                {getTradeMessage()}
              </h2>
              <p className="text-gray-600">
                거래가 성공적으로 완료되었습니다
              </p>
            </div>

            {/* 거래 상세 정보 */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">자산명</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{tradeData.assetName}</span>
                  {tradeData.assetSymbol && (
                    <Badge variant="outline" className="text-xs">
                      {tradeData.assetSymbol}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">거래 유형</span>
                <Badge 
                  variant={tradeData.type === 'buy' ? 'default' : 'destructive'}
                  className="text-sm"
                >
                  {tradeData.type === 'buy' ? '매수' : '매도'}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">수량</span>
                <span className="font-semibold">
                  {tradeData.assetType === 'real_estate' 
                    ? `${tradeData.quantity}개` 
                    : `${tradeData.quantity}주`
                  }
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">단가</span>
                <span className="font-semibold">{formatCurrency(tradeData.price)}</span>
              </div>

              <div className="border-t pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">총 거래금액</span>
                  <span className="text-lg font-bold text-blue-600">
                    {formatCurrency(tradeData.totalAmount)}
                  </span>
                </div>
              </div>

              {tradeData.fee && tradeData.fee > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">수수료</span>
                  <span className="text-red-600">
                    -{formatCurrency(tradeData.fee)}
                  </span>
                </div>
              )}

              {tradeData.remainingBalance !== undefined && (
                <div className="flex items-center justify-between border-t pt-3">
                  <span className="text-sm text-gray-600">잔여 잔액</span>
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-green-500" />
                    <span className="font-semibold text-green-600">
                      {formatCurrency(tradeData.remainingBalance)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* 안내 메시지 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-blue-700">
                <Sparkles className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {tradeData.type === 'buy' 
                    ? '포트폴리오에 자산이 추가되었습니다!' 
                    : '포트폴리오에서 자산이 차감되었습니다!'
                  }
                </span>
              </div>
            </div>

            {/* 확인 버튼 */}
            <div className="flex justify-center pt-2">
              <Button 
                onClick={onClose}
                className="w-full bg-green-500 hover:bg-green-600 text-white"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                확인
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}