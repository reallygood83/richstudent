'use client'

import { useState, useEffect } from 'react'
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
  TrendingDown,
  DollarSign,
  Calculator,
  AlertTriangle,
  RefreshCw
} from 'lucide-react'

interface Asset {
  id: string
  symbol: string
  name: string
  current_price: number
  currency: string
  asset_type: string
  category: string
  min_quantity?: number
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

export default function InvestmentTradingFull({ cashBalance, onTradeComplete }: InvestmentTradingFullProps) {
  const [assets, setAssets] = useState<Asset[]>([])
  const [portfolio, setPortfolio] = useState<PortfolioHolding[]>([])
  const [loading, setLoading] = useState(true)
  const [trading, setTrading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

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

  const handleBuy = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!buyForm.asset_id || !buyForm.quantity || !buyForm.price) {
      setError('모든 필드를 입력해주세요.')
      return
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
        setSuccess(data.message)
        setBuyForm({
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
        setSuccess(data.message)
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

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'technology': 'bg-blue-100 text-blue-800',
      'cryptocurrency': 'bg-purple-100 text-purple-800',
      'precious_metals': 'bg-yellow-100 text-yellow-800',
      'energy': 'bg-orange-100 text-orange-800',
      'chemical': 'bg-green-100 text-green-800',
      'battery': 'bg-indigo-100 text-indigo-800',
      'automotive': 'bg-red-100 text-red-800',
      '기타': 'bg-gray-100 text-gray-800'
    }
    return colors[category] || colors['기타']
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

  const getSelectedAsset = (assetId: string) => {
    return assets.find(asset => asset.id === assetId)
  }

  const getHolding = (assetId: string) => {
    return portfolio.find(holding => holding.market_assets.id === assetId)
  }

  const handleAssetSelect = (asset: Asset) => {
    setSelectedAsset(asset)
    setBuyForm(prev => ({
      ...prev,
      asset_id: asset.id,
      price: Math.round(asset.current_price).toString()
    }))
  }

  const handleHoldingSelect = (holding: PortfolioHolding) => {
    setSelectedHolding(holding)
    setSellForm(prev => ({
      ...prev,
      asset_id: holding.market_assets.id,
      price: Math.round(holding.market_assets.current_price).toString()
    }))
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">거래 정보를 불러오는 중...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 알림 메시지 */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-red-600">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50">
          <AlertDescription className="text-green-600">
            {success}
          </AlertDescription>
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
        <TabsContent value="buy">
          <Card>
            <CardHeader>
              <CardTitle>자산 매수</CardTitle>
              <CardDescription>
                투자하고 싶은 자산을 선택하여 매수해보세요
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleBuy} className="space-y-6">
                {/* 자산 선택 카드 */}
                <div className="space-y-4">
                  <Label>투자 자산 선택</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto border rounded-lg p-3">
                    {assets.map((asset) => (
                      <div
                        key={asset.id}
                        onClick={() => handleAssetSelect(asset)}
                        className={`p-3 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
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
                          <Badge className={`${getCategoryColor(asset.category)} text-xs`} variant="secondary">
                            {asset.category}
                          </Badge>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-sm">
                            {formatCurrency(Math.round(asset.current_price))}
                          </p>
                          <p className="text-xs text-gray-500">{asset.currency}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {selectedAsset && (
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-bold text-blue-900">{selectedAsset.symbol}</h4>
                          <p className="text-sm text-blue-700">{selectedAsset.name}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-blue-900">
                            {formatCurrency(Math.round(selectedAsset.current_price))}
                          </p>
                          <Badge className={getCategoryColor(selectedAsset.category)} variant="secondary">
                            {selectedAsset.category}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 수량과 가격 */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="buy-quantity">수량</Label>
                    <Input
                      id="buy-quantity"
                      type="number"
                      step="0.0001"
                      min="0"
                      value={buyForm.quantity}
                      onChange={(e) => setBuyForm(prev => ({ ...prev, quantity: e.target.value }))}
                      placeholder="구매할 수량"
                      required
                    />
                    {selectedAsset?.min_quantity && (
                      <p className="text-xs text-gray-500">
                        최소 주문 수량: {selectedAsset.min_quantity}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="buy-price">가격 (원)</Label>
                    <Input
                      id="buy-price"
                      type="number"
                      step="1"
                      min="0"
                      value={buyForm.price}
                      onChange={(e) => setBuyForm(prev => ({ ...prev, price: e.target.value }))}
                      placeholder="매수 가격"
                      required
                    />
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
                            <span>{formatCurrency(total)}</span>
                          </div>
                          <div className="flex justify-between text-gray-600">
                            <span>수수료 (0.1%):</span>
                            <span>{formatCurrency(fee)}</span>
                          </div>
                          <div className="flex justify-between font-bold pt-2 border-t">
                            <span>총 필요 금액:</span>
                            <span>{formatCurrency(totalWithFee)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>잔여 금액:</span>
                            <span className={cashBalance >= totalWithFee ? 'text-green-600' : 'text-red-600'}>
                              {formatCurrency(cashBalance - totalWithFee)}
                            </span>
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                )}

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={trading || !selectedAsset || !buyForm.quantity || !buyForm.price}
                >
                  {trading ? '매수 중...' : '매수 주문'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 매도 탭 */}
        <TabsContent value="sell">
          <Card>
            <CardHeader>
              <CardTitle>자산 매도</CardTitle>
              <CardDescription>
                보유 중인 자산을 매도할 수 있습니다
              </CardDescription>
            </CardHeader>
            <CardContent>
              {portfolio.length === 0 ? (
                <div className="text-center py-8">
                  <TrendingDown className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">매도할 수 있는 자산이 없습니다</p>
                </div>
              ) : (
                <form onSubmit={handleSell} className="space-y-6">
                  {/* 보유 자산 선택 카드 */}
                  <div className="space-y-4">
                    <Label>보유 자산 선택</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto border rounded-lg p-3">
                      {portfolio.map((holding) => (
                        <div
                          key={holding.id}
                          onClick={() => handleHoldingSelect(holding)}
                          className={`p-3 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                            selectedHolding?.id === holding.id
                              ? 'border-green-500 bg-green-50 shadow-md'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <h3 className="font-bold text-sm">{holding.market_assets.symbol}</h3>
                              <p className="text-xs text-gray-600 truncate">{holding.market_assets.name}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-gray-500">보유량</p>
                              <p className="font-bold text-sm">{formatQuantity(holding.quantity)}</p>
                            </div>
                          </div>
                          <div className="flex justify-between items-end">
                            <div>
                              <p className="text-xs text-gray-500">현재가</p>
                              <p className="font-bold text-sm">
                                {formatCurrency(Math.round(holding.market_assets.current_price))}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-gray-500">손익</p>
                              <p className={`font-bold text-sm ${
                                holding.profit_loss >= 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {holding.profit_loss >= 0 ? '+' : ''}{formatCurrency(holding.profit_loss)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {selectedHolding && (
                      <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-bold text-green-900">{selectedHolding.market_assets.symbol}</h4>
                            <p className="text-sm text-green-700">{selectedHolding.market_assets.name}</p>
                            <p className="text-sm text-green-600">보유량: {formatQuantity(selectedHolding.quantity)}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-green-900">
                              {formatCurrency(Math.round(selectedHolding.market_assets.current_price))}
                            </p>
                            <p className={`text-sm font-medium ${
                              selectedHolding.profit_loss >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {selectedHolding.profit_loss >= 0 ? '+' : ''}{formatCurrency(selectedHolding.profit_loss)}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 수량과 가격 */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="sell-quantity">수량</Label>
                      <Input
                        id="sell-quantity"
                        type="number"
                        step="0.0001"
                        min="0"
                        max={selectedHolding?.quantity || 0}
                        value={sellForm.quantity}
                        onChange={(e) => setSellForm(prev => ({ ...prev, quantity: e.target.value }))}
                        placeholder="매도할 수량"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="sell-price">가격 (원)</Label>
                      <Input
                        id="sell-price"
                        type="number"
                        step="1"
                        min="0"
                        value={sellForm.price}
                        onChange={(e) => setSellForm(prev => ({ ...prev, price: e.target.value }))}
                        placeholder="매도 가격"
                        required
                      />
                    </div>
                  </div>

                  {/* 주문 요약 */}
                  {sellForm.quantity && sellForm.price && (
                    <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                      <h4 className="font-medium flex items-center space-x-2">
                        <Calculator className="w-4 h-4" />
                        <span>주문 요약</span>
                      </h4>
                      {(() => {
                        const { total, brokerageFee, taxFee, netAmount } = calculateSellTotal()
                        return (
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span>매도 금액:</span>
                              <span>{formatCurrency(total)}</span>
                            </div>
                            <div className="flex justify-between text-gray-600">
                              <span>중개수수료 (0.1%):</span>
                              <span>{formatCurrency(brokerageFee)}</span>
                            </div>
                            <div className="flex justify-between text-gray-600">
                              <span>거래세 (0.2%):</span>
                              <span>{formatCurrency(taxFee)}</span>
                            </div>
                            <div className="flex justify-between font-bold pt-2 border-t">
                              <span>실수령 금액:</span>
                              <span>{formatCurrency(netAmount)}</span>
                            </div>
                          </div>
                        )
                      })()}
                    </div>
                  )}

                  <Button 
                    type="submit" 
                    className="w-full" 
                    variant="destructive"
                    disabled={trading || !selectedHolding || !sellForm.quantity || !sellForm.price}
                  >
                    {trading ? '매도 중...' : '매도 주문'}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}