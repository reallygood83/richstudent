'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ShoppingCart,
  Minus,
  DollarSign,
  Calculator,
  AlertTriangle,
  RefreshCw,
  Search,
  TrendingUp,
  TrendingDown,
  Building2,
  Landmark,
  Bitcoin,
  DollarSign as Currency,
  BarChart3,
  Sparkles,
  Lock
} from 'lucide-react'
import TradeCompletionModal from './TradeCompletionModal'

interface Asset {
  id: string
  symbol: string
  name: string
  current_price: number
  currency: string
  asset_type: string
  category: string
  min_quantity?: number
  price_change_percent?: number
}

interface PortfolioHolding {
  id: string
  quantity: number
  average_price: number
  total_invested: number
  current_value: number
  profit_loss: number
  profit_loss_percent: number
  market_assets: Asset
}

interface InvestmentTradingFullProps {
  cashBalance: number
  onTradeComplete: () => void
}

// 카테고리 정의
const CATEGORIES = {
  all: { label: '전체', icon: Sparkles, color: 'text-purple-600' },
  korean_stock: { label: '한국 주식', icon: Building2, color: 'text-blue-600' },
  us_stock: { label: '미국 주식', icon: Landmark, color: 'text-indigo-600' },
  cryptocurrency: { label: '암호화폐', icon: Bitcoin, color: 'text-orange-600' },
  exchange_rate: { label: '환율', icon: Currency, color: 'text-green-600' },
  etf: { label: 'ETF', icon: BarChart3, color: 'text-pink-600' }
} as const

export default function InvestmentTradingFull({ cashBalance, onTradeComplete }: InvestmentTradingFullProps) {
  const [assets, setAssets] = useState<Asset[]>([])
  const [portfolio, setPortfolio] = useState<PortfolioHolding[]>([])
  const [loading, setLoading] = useState(true)
  const [trading, setTrading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // 검색 및 필터 상태
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<keyof typeof CATEGORIES>('all')

  // 거래 완료 모달 상태
  const [showCompletionModal, setShowCompletionModal] = useState(false)
  const [completedTrade, setCompletedTrade] = useState<{
    type: 'buy' | 'sell'
    assetType: 'stock' | 'real_estate'
    assetName: string
    assetSymbol?: string
    quantity: number
    price: number
    totalAmount: number
    fee?: number
    remainingBalance?: number
  } | null>(null)

  // 선택된 자산 상태
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
  const [selectedHolding, setSelectedHolding] = useState<PortfolioHolding | null>(null)

  // 매수 폼 상태
  const [buyForm, setBuyForm] = useState({
    asset_id: '',
    quantity: '',
    price: '',
    account_type: 'investment'
  })

  // 매도 폼 상태
  const [sellForm, setSellForm] = useState({
    asset_id: '',
    quantity: '',
    price: '',
    account_type: 'investment'
  })

  // 시장 데이터 마지막 업데이트 시간 (서버에서 Cron Job으로 자동 업데이트됨)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)

      // 투자 가능한 자산 목록 조회
      const assetsResponse = await fetch('/api/market-data')
      const assetsData = await assetsResponse.json()

      if (assetsData.success) {
        setAssets(assetsData.assets)

        // 마지막 업데이트 시간 추출 (첫 번째 자산의 last_updated 사용)
        if (assetsData.assets.length > 0 && assetsData.assets[0].last_updated) {
          setLastUpdated(new Date(assetsData.assets[0].last_updated))
        }
      }

      // 현재 포트폴리오 조회
      const portfolioResponse = await fetch('/api/investments/portfolio')
      const portfolioData = await portfolioResponse.json()

      if (portfolioData.success) {
        setPortfolio(portfolioData.portfolio.holdings)
      }

    } catch (err) {
      console.error('Data fetch error:', err)
      setError('데이터를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 필터링된 자산 목록
  const filteredAssets = useMemo(() => {
    return assets.filter(asset => {
      // 카테고리 필터
      const categoryMatch = selectedCategory === 'all' || asset.category === selectedCategory

      // 검색어 필터
      const searchMatch = searchQuery === '' ||
        asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.symbol.toLowerCase().includes(searchQuery.toLowerCase())

      return categoryMatch && searchMatch
    })
  }, [assets, selectedCategory, searchQuery])

  // 카테고리별 자산 개수
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    assets.forEach(asset => {
      counts[asset.category] = (counts[asset.category] || 0) + 1
    })
    return counts
  }, [assets])

  const handleBuy = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!buyForm.asset_id || !buyForm.quantity || !buyForm.price) {
      setError('모든 필드를 입력해주세요.')
      return
    }

    // 암호화폐가 아닌 경우 정수 검증
    if (selectedAsset && selectedAsset.category !== 'cryptocurrency') {
      const qty = Number(buyForm.quantity)
      if (qty < 1 || qty % 1 !== 0) {
        setError('주식, ETF, 외환은 1주 이상의 정수만 구매 가능합니다.')
        return
      }
    }

    setTrading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/investments/buy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          asset_id: buyForm.asset_id,
          quantity: Number(buyForm.quantity),
          price: Number(buyForm.price),
          account_type: buyForm.account_type
        }),
      })

      const data = await response.json()

      if (data.success) {
        setCompletedTrade({
          type: 'buy',
          assetType: 'stock',
          assetName: selectedAsset?.name || '자산',
          assetSymbol: selectedAsset?.symbol,
          quantity: Number(buyForm.quantity),
          price: Number(buyForm.price),
          totalAmount: data.transaction.total_amount,
          fee: data.transaction.fee,
          remainingBalance: data.transaction.remaining_balance
        })
        setShowCompletionModal(true)

        setBuyForm({
          asset_id: '',
          quantity: '',
          price: '',
          account_type: 'investment'
        })
        setSelectedAsset(null)
        onTradeComplete()
        fetchData()
      } else {
        setError(data.error)
      }
    } catch (err) {
      console.error('Buy error:', err)
      setError('매수 주문에 실패했습니다.')
    } finally {
      setTrading(false)
    }
  }

  const handleSell = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sellForm.asset_id || !sellForm.quantity || !sellForm.price) {
      setError('모든 필드를 입력해주세요.')
      return
    }

    // 암호화폐가 아닌 경우 정수 검증
    if (selectedHolding && selectedHolding.market_assets.category !== 'cryptocurrency') {
      const qty = Number(sellForm.quantity)
      if (qty < 1 || qty % 1 !== 0) {
        setError('주식, ETF, 외환은 1주 이상의 정수만 매도 가능합니다.')
        return
      }
    }

    setTrading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/investments/sell', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          asset_id: sellForm.asset_id,
          quantity: Number(sellForm.quantity),
          price: Number(sellForm.price),
          account_type: sellForm.account_type
        }),
      })

      const data = await response.json()

      if (data.success) {
        const selectedHoldingData = portfolio.find(h => h.market_assets.id === sellForm.asset_id)
        setCompletedTrade({
          type: 'sell',
          assetType: 'stock',
          assetName: selectedHoldingData?.market_assets.name || '자산',
          assetSymbol: selectedHoldingData?.market_assets.symbol,
          quantity: Number(sellForm.quantity),
          price: Number(sellForm.price),
          totalAmount: data.transaction.total_amount,
          fee: data.transaction.fee,
          remainingBalance: data.transaction.remaining_balance
        })
        setShowCompletionModal(true)

        setSellForm({
          asset_id: '',
          quantity: '',
          price: '',
          account_type: 'investment'
        })
        onTradeComplete()
        fetchData()
      } else {
        setError(data.error)
      }
    } catch (err) {
      console.error('Sell error:', err)
      setError('매도 주문에 실패했습니다.')
    } finally {
      setTrading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatQuantity = (quantity: number) => {
    return quantity % 1 === 0 ? quantity.toString() : quantity.toFixed(4)
  }

  const getCategoryBadgeColor = (category: string) => {
    const colors: Record<string, string> = {
      'korean_stock': 'bg-blue-100 text-blue-800 border-blue-200',
      'us_stock': 'bg-indigo-100 text-indigo-800 border-indigo-200',
      'cryptocurrency': 'bg-orange-100 text-orange-800 border-orange-200',
      'exchange_rate': 'bg-green-100 text-green-800 border-green-200',
      'etf': 'bg-pink-100 text-pink-800 border-pink-200'
    }
    return colors[category] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      'korean_stock': '한국주식',
      'us_stock': '미국주식',
      'cryptocurrency': '암호화폐',
      'exchange_rate': '환율',
      'etf': 'ETF'
    }
    return labels[category] || category
  }

  const calculateBuyTotal = () => {
    const quantity = Number(buyForm.quantity) || 0
    const price = Number(buyForm.price) || 0
    const total = quantity * price
    const fee = total * 0.001
    return { total, fee, totalWithFee: total + fee }
  }

  const calculateSellTotal = () => {
    const quantity = Number(sellForm.quantity) || 0
    const price = Number(sellForm.price) || 0
    const total = quantity * price
    const brokerageFee = total * 0.001
    const taxFee = total * 0.002
    const totalFee = brokerageFee + taxFee
    return { total, brokerageFee, taxFee, totalFee, netAmount: total - totalFee }
  }

  const handleAssetSelect = (asset: Asset) => {
    setSelectedAsset(asset)
    const isCrypto = asset.category === 'cryptocurrency'
    setBuyForm(prev => ({
      ...prev,
      asset_id: asset.id,
      price: Math.round(asset.current_price).toString(),
      quantity: isCrypto ? '' : '1' // 암호화폐는 빈값, 기타는 1주로 시작
    }))
  }

  const handleHoldingSelect = (holding: PortfolioHolding) => {
    setSelectedHolding(holding)
    const isCrypto = holding.market_assets.category === 'cryptocurrency'
    setSellForm(prev => ({
      ...prev,
      asset_id: holding.market_assets.id,
      price: Math.round(holding.market_assets.current_price).toString(),
      quantity: isCrypto ? '' : '1' // 암호화폐는 빈값, 기타는 1주로 시작
    }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">투자 데이터 로딩 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 거래 완료 모달 */}
      {showCompletionModal && completedTrade && (
        <TradeCompletionModal
          isOpen={showCompletionModal}
          onClose={() => setShowCompletionModal(false)}
          tradeData={completedTrade}
        />
      )}

      {/* 알림 메시지 */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="bg-green-50 text-green-800 border-green-200">
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* 투자 가능 금액 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <DollarSign className="w-5 h-5" />
              <span>투자 가능 금액</span>
            </div>
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              새로고침
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-green-600">
            {formatCurrency(cashBalance)}
          </div>
          <p className="text-sm text-gray-600 mt-2">
            투자계좌 현금 잔액입니다
          </p>
        </CardContent>
      </Card>

      {/* 매수/매도 탭 */}
      <Tabs defaultValue="buy" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="buy" className="flex items-center space-x-2">
            <ShoppingCart className="w-4 h-4" />
            <span>매수</span>
          </TabsTrigger>
          <TabsTrigger value="sell" className="flex items-center space-x-2">
            <Minus className="w-4 h-4" />
            <span>매도</span>
          </TabsTrigger>
        </TabsList>

        {/* 매수 탭 */}
        <TabsContent value="buy" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>자산 매수</CardTitle>
                  <CardDescription>
                    투자하고 싶은 자산을 선택하여 매수해보세요
                  </CardDescription>
                </div>
                {lastUpdated && (
                  <div className="text-xs text-gray-500">
                    마지막 업데이트: {lastUpdated.toLocaleString('ko-KR', {
                      timeZone: 'Asia/Seoul',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                    <div className="text-[10px] text-gray-400 mt-0.5">
                      가격은 30분마다 자동으로 업데이트됩니다
                    </div>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleBuy} className="space-y-6">
                {/* 검색 및 필터 */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        type="text"
                        placeholder="자산 이름 또는 심볼 검색..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  {/* 카테고리 탭 */}
                  <Tabs value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as keyof typeof CATEGORIES)} className="w-full">
                    <TabsList className="grid w-full grid-cols-6 h-auto">
                      {Object.entries(CATEGORIES).map(([key, { label, icon: Icon, color }]) => (
                        <TabsTrigger
                          key={key}
                          value={key}
                          className="flex flex-col items-center py-2 space-y-1"
                        >
                          <Icon className={`w-4 h-4 ${color}`} />
                          <span className="text-xs">{label}</span>
                          {key !== 'all' && (
                            <Badge variant="secondary" className="text-xs px-1 py-0">
                              {categoryCounts[key] || 0}
                            </Badge>
                          )}
                        </TabsTrigger>
                      ))}
                    </TabsList>

                    {/* 자산 목록 */}
                    <div className="mt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-80 overflow-y-auto border rounded-lg p-3">
                        {filteredAssets.length === 0 ? (
                          <div className="col-span-full text-center py-8 text-gray-500">
                            <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p>검색 결과가 없습니다</p>
                          </div>
                        ) : (
                          filteredAssets.map((asset) => (
                            <div
                              key={asset.id}
                              onClick={() => handleAssetSelect(asset)}
                              className={`p-3 border-2 rounded-lg cursor-pointer transition-all hover:shadow-md ${
                                selectedAsset?.id === asset.id
                                  ? 'border-blue-500 bg-blue-50 shadow-md'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex-1">
                                  <h3 className="font-bold text-sm">{asset.symbol}</h3>
                                  <p className="text-xs text-gray-600 truncate">{asset.name}</p>
                                </div>
                                <Badge className={`${getCategoryBadgeColor(asset.category)} text-xs border`} variant="outline">
                                  {getCategoryLabel(asset.category)}
                                </Badge>
                              </div>
                              <div className="flex justify-between items-end">
                                <div className="text-right flex-1">
                                  <p className="font-bold text-sm">
                                    {formatCurrency(Math.round(asset.current_price))}
                                  </p>
                                  <p className="text-xs text-gray-500">{asset.currency}</p>
                                </div>
                                {asset.price_change_percent !== undefined && (
                                  <div className={`flex items-center space-x-1 ml-2 ${
                                    asset.price_change_percent >= 0 ? 'text-red-600' : 'text-blue-600'
                                  }`}>
                                    {asset.price_change_percent >= 0 ? (
                                      <TrendingUp className="w-3 h-3" />
                                    ) : (
                                      <TrendingDown className="w-3 h-3" />
                                    )}
                                    <span className="text-xs font-medium">
                                      {Math.abs(asset.price_change_percent).toFixed(2)}%
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </Tabs>

                  {/* 선택된 자산 정보 */}
                  {selectedAsset && (
                    <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-bold text-blue-900">{selectedAsset.symbol}</h4>
                          <p className="text-sm text-blue-700">{selectedAsset.name}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-blue-900 text-lg">
                            {formatCurrency(Math.round(selectedAsset.current_price))}
                          </p>
                          <Badge className={getCategoryBadgeColor(selectedAsset.category)} variant="outline">
                            {getCategoryLabel(selectedAsset.category)}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 수량과 가격 */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="buy-quantity">
                      수량 {selectedAsset?.category === 'cryptocurrency' ? '(소수점 가능)' : '(1주 이상 정수)'}
                    </Label>
                    <Input
                      id="buy-quantity"
                      type="number"
                      step={selectedAsset?.category === 'cryptocurrency' ? '0.0001' : '1'}
                      min={selectedAsset?.category === 'cryptocurrency' ? '0' : '1'}
                      value={buyForm.quantity}
                      onChange={(e) => setBuyForm(prev => ({ ...prev, quantity: e.target.value }))}
                      placeholder={selectedAsset?.category === 'cryptocurrency' ? '구매할 수량 (예: 0.001)' : '구매할 수량 (예: 1)'}
                      required
                    />
                    {selectedAsset?.min_quantity && (
                      <p className="text-xs text-gray-500">
                        최소 주문 수량: {selectedAsset.min_quantity}
                      </p>
                    )}
                    {selectedAsset?.category !== 'cryptocurrency' && (
                      <p className="text-xs text-orange-600">
                        ⚠️ 주식, ETF, 외환은 1주 이상 정수만 가능합니다
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="buy-price" className="flex items-center space-x-2">
                      <span>가격 (원)</span>
                      <Lock className="w-3 h-3 text-gray-500" />
                      <span className="text-xs text-gray-500">현재가 고정</span>
                    </Label>
                    <Input
                      id="buy-price"
                      type="number"
                      value={buyForm.price}
                      disabled
                      className="bg-gray-100 cursor-not-allowed"
                      required
                    />
                    <p className="text-xs text-gray-500">
                      주식은 현재가로만 거래됩니다
                    </p>
                  </div>
                </div>

                {/* 주문 요약 */}
                {buyForm.quantity && buyForm.price && (
                  <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                    <h4 className="font-medium flex items-center space-x-2">
                      <Calculator className="w-4 h-4" />
                      <span>주문 요약</span>
                    </h4>
                    {(() => {
                      const { total, fee, totalWithFee } = calculateBuyTotal()
                      return (
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>매수 금액:</span>
                            <span className="font-medium">{formatCurrency(total)}</span>
                          </div>
                          <div className="flex justify-between text-gray-600">
                            <span>수수료 (0.1%):</span>
                            <span>{formatCurrency(fee)}</span>
                          </div>
                          <div className="flex justify-between pt-2 border-t font-bold text-blue-600">
                            <span>총 결제 금액:</span>
                            <span>{formatCurrency(totalWithFee)}</span>
                          </div>
                          <div className="flex justify-between text-xs text-gray-500 pt-1">
                            <span>잔액 부족 여부:</span>
                            <span className={cashBalance >= totalWithFee ? 'text-green-600' : 'text-red-600'}>
                              {cashBalance >= totalWithFee ? '충분' : '부족'}
                            </span>
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                )}

                {/* 매수 버튼 */}
                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={trading || !selectedAsset}
                >
                  {trading ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      매수 처리 중...
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      매수 주문
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 매도 탭 */}
        <TabsContent value="sell" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>자산 매도</CardTitle>
                  <CardDescription>
                    보유 중인 자산을 선택하여 매도해보세요
                  </CardDescription>
                </div>
                {lastUpdated && (
                  <div className="text-xs text-gray-500">
                    마지막 업데이트: {lastUpdated.toLocaleString('ko-KR', {
                      timeZone: 'Asia/Seoul',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                    <div className="text-[10px] text-gray-400 mt-0.5">
                      가격은 30분마다 자동으로 업데이트됩니다
                    </div>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSell} className="space-y-6">
                {/* 보유 자산 목록 */}
                <div className="space-y-4">
                  <Label>보유 자산 선택</Label>
                  {portfolio.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 border rounded-lg">
                      <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>보유 중인 자산이 없습니다</p>
                      <p className="text-sm mt-2">매수 탭에서 자산을 구매해보세요</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto border rounded-lg p-3">
                      {portfolio.map((holding) => (
                        <div
                          key={holding.id}
                          onClick={() => handleHoldingSelect(holding)}
                          className={`p-3 border-2 rounded-lg cursor-pointer transition-all hover:shadow-md ${
                            selectedHolding?.id === holding.id
                              ? 'border-red-500 bg-red-50 shadow-md'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <h3 className="font-bold text-sm">{holding.market_assets.symbol}</h3>
                              <p className="text-xs text-gray-600 truncate">{holding.market_assets.name}</p>
                            </div>
                            <Badge className={getCategoryBadgeColor(holding.market_assets.category)} variant="outline">
                              {getCategoryLabel(holding.market_assets.category)}
                            </Badge>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-600">보유 수량:</span>
                              <span className="font-medium">{formatQuantity(holding.quantity)}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-600">평균 매수가:</span>
                              <span className="font-medium">{formatCurrency(Math.round(holding.average_price))}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-600">현재가:</span>
                              <span className="font-medium">{formatCurrency(Math.round(holding.market_assets.current_price))}</span>
                            </div>
                            <div className={`flex justify-between text-xs font-bold ${
                              holding.profit_loss >= 0 ? 'text-red-600' : 'text-blue-600'
                            }`}>
                              <span>평가손익:</span>
                              <span>
                                {holding.profit_loss >= 0 ? '+' : ''}
                                {formatCurrency(Math.round(holding.profit_loss))}
                                ({holding.profit_loss_percent >= 0 ? '+' : ''}{holding.profit_loss_percent.toFixed(2)}%)
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedHolding && (
                    <div className="p-4 bg-red-50 rounded-lg border-2 border-red-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-bold text-red-900">{selectedHolding.market_assets.symbol}</h4>
                          <p className="text-sm text-red-700">{selectedHolding.market_assets.name}</p>
                          <p className="text-xs text-red-600 mt-1">
                            보유 수량: {formatQuantity(selectedHolding.quantity)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-red-900 text-lg">
                            {formatCurrency(Math.round(selectedHolding.market_assets.current_price))}
                          </p>
                          <Badge className={getCategoryBadgeColor(selectedHolding.market_assets.category)} variant="outline">
                            {getCategoryLabel(selectedHolding.market_assets.category)}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 수량과 가격 */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sell-quantity">
                      매도 수량 {selectedHolding?.market_assets.category === 'cryptocurrency' ? '(소수점 가능)' : '(1주 이상 정수)'}
                    </Label>
                    <Input
                      id="sell-quantity"
                      type="number"
                      step={selectedHolding?.market_assets.category === 'cryptocurrency' ? '0.0001' : '1'}
                      min={selectedHolding?.market_assets.category === 'cryptocurrency' ? '0' : '1'}
                      max={selectedHolding?.quantity || undefined}
                      value={sellForm.quantity}
                      onChange={(e) => setSellForm(prev => ({ ...prev, quantity: e.target.value }))}
                      placeholder={selectedHolding?.market_assets.category === 'cryptocurrency' ? '매도할 수량 (예: 0.001)' : '매도할 수량 (예: 1)'}
                      required
                    />
                    {selectedHolding && (
                      <p className="text-xs text-gray-500">
                        최대 매도 가능: {formatQuantity(selectedHolding.quantity)}
                      </p>
                    )}
                    {selectedHolding?.market_assets.category !== 'cryptocurrency' && (
                      <p className="text-xs text-orange-600">
                        ⚠️ 주식, ETF, 외환은 1주 이상 정수만 가능합니다
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sell-price" className="flex items-center space-x-2">
                      <span>매도 가격 (원)</span>
                      <Lock className="w-3 h-3 text-gray-500" />
                      <span className="text-xs text-gray-500">현재가 고정</span>
                    </Label>
                    <Input
                      id="sell-price"
                      type="number"
                      value={sellForm.price}
                      disabled
                      className="bg-gray-100 cursor-not-allowed"
                      required
                    />
                    <p className="text-xs text-gray-500">
                      주식은 현재가로만 거래됩니다
                    </p>
                  </div>
                </div>

                {/* 매도 요약 */}
                {sellForm.quantity && sellForm.price && (
                  <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                    <h4 className="font-medium flex items-center space-x-2">
                      <Calculator className="w-4 h-4" />
                      <span>매도 요약</span>
                    </h4>
                    {(() => {
                      const { total, brokerageFee, taxFee, totalFee, netAmount } = calculateSellTotal()
                      return (
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>매도 금액:</span>
                            <span className="font-medium">{formatCurrency(total)}</span>
                          </div>
                          <div className="flex justify-between text-gray-600">
                            <span>중개 수수료 (0.1%):</span>
                            <span>{formatCurrency(brokerageFee)}</span>
                          </div>
                          <div className="flex justify-between text-gray-600">
                            <span>거래세 (0.2%):</span>
                            <span>{formatCurrency(taxFee)}</span>
                          </div>
                          <div className="flex justify-between text-gray-600">
                            <span>총 수수료:</span>
                            <span>{formatCurrency(totalFee)}</span>
                          </div>
                          <div className="flex justify-between pt-2 border-t font-bold text-red-600">
                            <span>실 수령 금액:</span>
                            <span>{formatCurrency(netAmount)}</span>
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                )}

                {/* 매도 버튼 */}
                <Button
                  type="submit"
                  className="w-full bg-red-600 hover:bg-red-700"
                  size="lg"
                  disabled={trading || !selectedHolding}
                >
                  {trading ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      매도 처리 중...
                    </>
                  ) : (
                    <>
                      <Minus className="w-4 h-4 mr-2" />
                      매도 주문
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
