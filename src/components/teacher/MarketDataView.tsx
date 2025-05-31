'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  TrendingUp, 
  TrendingDown, 
  RefreshCw, 
  DollarSign,
  Activity,
  BarChart3,
  Clock,
  AlertCircle
} from 'lucide-react'

interface MarketAsset {
  id: string
  symbol: string
  name: string
  asset_type: string
  category: string
  current_price: number
  previous_price: number
  price_change: number
  price_change_percent: number
  currency: string
  last_updated: string
  is_active: boolean
}

interface MarketDataViewProps {
  className?: string
}

export default function MarketDataView({ className }: MarketDataViewProps) {
  const [assets, setAssets] = useState<MarketAsset[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState('')
  const [lastUpdate, setLastUpdate] = useState<string>('')

  useEffect(() => {
    fetchMarketData()
    // 5분마다 자동 업데이트
    const interval = setInterval(fetchMarketData, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const fetchMarketData = async () => {
    try {
      setLoading(true)
      setError('')
      
      const response = await fetch('/api/market/update-prices')
      const data = await response.json()

      if (data.success) {
        setAssets(data.assets || [])
        setLastUpdate(new Date().toLocaleString('ko-KR'))
      } else {
        setError(data.error || '시장 데이터 조회 실패')
      }
    } catch (err) {
      setError('서버 연결 실패')
      console.error('Market data fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const updatePrices = async () => {
    try {
      setUpdating(true)
      setError('')

      const response = await fetch('/api/market/update-prices', {
        method: 'POST'
      })
      const data = await response.json()

      if (data.success) {
        await fetchMarketData() // 업데이트 후 최신 데이터 조회
        setLastUpdate(new Date().toLocaleString('ko-KR'))
      } else {
        setError(data.error || '가격 업데이트 실패')
      }
    } catch (err) {
      setError('업데이트 중 오류 발생')
      console.error('Price update error:', err)
    } finally {
      setUpdating(false)
    }
  }

  const formatPrice = (price: number, currency: string) => {
    if (currency === 'KRW') {
      return new Intl.NumberFormat('ko-KR', {
        style: 'currency',
        currency: 'KRW',
        minimumFractionDigits: 0
      }).format(price)
    } else {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2
      }).format(price)
    }
  }

  const formatChangePercent = (change: number) => {
    const sign = change > 0 ? '+' : ''
    return `${sign}${change.toFixed(2)}%`
  }

  const getPriceChangeColor = (change: number) => {
    if (change > 0) return 'text-red-600'
    if (change < 0) return 'text-blue-600'
    return 'text-gray-600'
  }

  const getChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="w-4 h-4" />
    if (change < 0) return <TrendingDown className="w-4 h-4" />
    return <Activity className="w-4 h-4" />
  }

  const groupedAssets = {
    stock: assets.filter(a => a.asset_type === 'stock'),
    crypto: assets.filter(a => a.asset_type === 'crypto'),
    commodity: assets.filter(a => a.asset_type === 'commodity')
  }

  if (loading && assets.length === 0) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">시장 데이터를 불러오는 중...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">실시간 시장 데이터</h2>
          <p className="text-gray-600">학생들이 투자할 수 있는 자산의 현재 가격입니다</p>
        </div>
        <div className="flex items-center space-x-4">
          {lastUpdate && (
            <div className="flex items-center text-sm text-gray-500">
              <Clock className="w-4 h-4 mr-1" />
              {lastUpdate}
            </div>
          )}
          <Button
            onClick={updatePrices}
            disabled={updating}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <RefreshCw className={`w-4 h-4 ${updating ? 'animate-spin' : ''}`} />
            <span>{updating ? '업데이트 중...' : '가격 업데이트'}</span>
          </Button>
        </div>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center text-red-700">
              <AlertCircle className="w-5 h-5 mr-2" />
              {error}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 시장 데이터 탭 */}
      <Tabs defaultValue="stock" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="stock" className="flex items-center space-x-2">
            <BarChart3 className="w-4 h-4" />
            <span>주식 ({groupedAssets.stock.length})</span>
          </TabsTrigger>
          <TabsTrigger value="crypto" className="flex items-center space-x-2">
            <DollarSign className="w-4 h-4" />
            <span>암호화폐 ({groupedAssets.crypto.length})</span>
          </TabsTrigger>
          <TabsTrigger value="commodity" className="flex items-center space-x-2">
            <TrendingUp className="w-4 h-4" />
            <span>원자재 ({groupedAssets.commodity.length})</span>
          </TabsTrigger>
        </TabsList>

        {/* 주식 탭 */}
        <TabsContent value="stock">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {groupedAssets.stock.map((asset) => (
              <Card key={asset.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{asset.symbol}</CardTitle>
                      <CardDescription className="text-sm">{asset.name}</CardDescription>
                    </div>
                    <Badge variant="outline">{asset.category}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold">
                        {formatPrice(asset.current_price, asset.currency)}
                      </span>
                      <div className={`flex items-center space-x-1 ${getPriceChangeColor(asset.price_change)}`}>
                        {getChangeIcon(asset.price_change)}
                        <span className="text-sm font-medium">
                          {formatChangePercent(asset.price_change_percent)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* 암호화폐 탭 */}
        <TabsContent value="crypto">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {groupedAssets.crypto.map((asset) => (
              <Card key={asset.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{asset.symbol}</CardTitle>
                      <CardDescription className="text-sm">{asset.name}</CardDescription>
                    </div>
                    <Badge variant="outline">{asset.category}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold">
                        {formatPrice(asset.current_price, 'KRW')}
                      </span>
                      <div className={`flex items-center space-x-1 ${getPriceChangeColor(asset.price_change)}`}>
                        {getChangeIcon(asset.price_change)}
                        <span className="text-sm font-medium">
                          {formatChangePercent(asset.price_change_percent)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* 원자재 탭 */}
        <TabsContent value="commodity">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {groupedAssets.commodity.map((asset) => (
              <Card key={asset.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{asset.symbol}</CardTitle>
                      <CardDescription className="text-sm">{asset.name}</CardDescription>
                    </div>
                    <Badge variant="outline">{asset.category}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold">
                        {formatPrice(asset.current_price, 'KRW')}
                      </span>
                      <div className={`flex items-center space-x-1 ${getPriceChangeColor(asset.price_change)}`}>
                        {getChangeIcon(asset.price_change)}
                        <span className="text-sm font-medium">
                          {formatChangePercent(asset.price_change_percent)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {assets.length === 0 && !loading && (
        <Card>
          <CardContent className="text-center py-12">
            <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">시장 데이터 없음</h3>
            <p className="text-gray-500 mb-4">아직 시장 자산이 설정되지 않았습니다.</p>
            <Button onClick={updatePrices} disabled={updating}>
              시장 데이터 초기화
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}