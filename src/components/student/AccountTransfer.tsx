'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowRightLeft, CreditCard, PiggyBank, TrendingUp } from 'lucide-react'

interface AccountTransferProps {
  accounts: {
    checking: number
    savings: number
    investment: number
  }
  onTransferSuccess: () => void
}

export default function AccountTransfer({ accounts, onTransferSuccess }: AccountTransferProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [formData, setFormData] = useState({
    from_account: '',
    to_account: '',
    amount: ''
  })

  const accountOptions = [
    { value: 'checking', label: '당좌계좌', icon: CreditCard, balance: accounts.checking },
    { value: 'savings', label: '저축계좌', icon: PiggyBank, balance: accounts.savings },
    { value: 'investment', label: '투자계좌', icon: TrendingUp, balance: accounts.investment }
  ]

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!formData.from_account || !formData.to_account || !formData.amount) {
      setError('모든 필드를 입력해주세요.')
      return
    }

    if (formData.from_account === formData.to_account) {
      setError('같은 계좌로는 이체할 수 없습니다.')
      return
    }

    const amount = Number(formData.amount)
    if (amount <= 0) {
      setError('이체 금액은 0보다 커야 합니다.')
      return
    }

    const fromAccountBalance = accounts[formData.from_account as keyof typeof accounts]
    if (amount > fromAccountBalance) {
      setError('출금 계좌의 잔액이 부족합니다.')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/student/account-transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from_account: formData.from_account,
          to_account: formData.to_account,
          amount: amount
        }),
      })

      const data = await response.json()

      if (data.success) {
        setSuccess(data.message)
        setFormData({
          from_account: '',
          to_account: '',
          amount: ''
        })
        onTransferSuccess()
      } else {
        setError(data.error)
      }
    } catch (err) {
      console.error('Transfer error:', err)
      setError('이체 처리 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const getAccountIcon = (accountType: string) => {
    const account = accountOptions.find(opt => opt.value === accountType)
    if (!account) return null
    const IconComponent = account.icon
    return <IconComponent className="w-4 h-4" />
  }

  const getAccountLabel = (accountType: string) => {
    const account = accountOptions.find(opt => opt.value === accountType)
    return account?.label || accountType
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <ArrowRightLeft className="w-5 h-5" />
          <span>계좌 간 이체</span>
        </CardTitle>
        <CardDescription>
          내 계좌 간에 자금을 이동할 수 있습니다
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert className="mb-4 border-red-200 bg-red-50">
            <AlertDescription className="text-red-600">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-4 border-green-200 bg-green-50">
            <AlertDescription className="text-green-600">
              {success}
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 출금 계좌 선택 */}
          <div className="space-y-2">
            <Label htmlFor="from_account">출금 계좌</Label>
            <select
              id="from_account"
              value={formData.from_account}
              onChange={(e) => setFormData(prev => ({ ...prev, from_account: e.target.value }))}
              className="w-full p-2 border rounded-md"
              required
            >
              <option value="">출금할 계좌를 선택하세요</option>
              {accountOptions.map((account) => (
                <option key={account.value} value={account.value}>
                  {account.label} - {formatCurrency(account.balance)}
                </option>
              ))}
            </select>
          </div>

          {/* 입금 계좌 선택 */}
          <div className="space-y-2">
            <Label htmlFor="to_account">입금 계좌</Label>
            <select
              id="to_account"
              value={formData.to_account}
              onChange={(e) => setFormData(prev => ({ ...prev, to_account: e.target.value }))}
              className="w-full p-2 border rounded-md"
              required
            >
              <option value="">입금할 계좌를 선택하세요</option>
              {accountOptions
                .filter(account => account.value !== formData.from_account)
                .map((account) => (
                  <option key={account.value} value={account.value}>
                    {account.label} - {formatCurrency(account.balance)}
                  </option>
                ))}
            </select>
          </div>

          {/* 이체 금액 */}
          <div className="space-y-2">
            <Label htmlFor="amount">이체 금액 (원)</Label>
            <Input
              id="amount"
              type="number"
              min="1"
              max={formData.from_account ? accounts[formData.from_account as keyof typeof accounts] : undefined}
              value={formData.amount}
              onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
              placeholder="이체할 금액을 입력하세요"
              required
            />
            {formData.from_account && (
              <p className="text-sm text-gray-500">
                최대 이체 가능 금액: {formatCurrency(accounts[formData.from_account as keyof typeof accounts])}
              </p>
            )}
          </div>

          {/* 이체 요약 */}
          {formData.from_account && formData.to_account && formData.amount && (
            <div className="p-4 bg-gray-50 rounded-lg space-y-2">
              <h4 className="font-medium text-gray-900">이체 요약</h4>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  {getAccountIcon(formData.from_account)}
                  <span>{getAccountLabel(formData.from_account)}</span>
                </div>
                <ArrowRightLeft className="w-4 h-4 text-gray-400" />
                <div className="flex items-center space-x-2">
                  {getAccountIcon(formData.to_account)}
                  <span>{getAccountLabel(formData.to_account)}</span>
                </div>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-blue-600">
                  {formatCurrency(Number(formData.amount))}
                </p>
              </div>
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full" 
            disabled={loading || !formData.from_account || !formData.to_account || !formData.amount}
          >
            {loading ? '이체 중...' : '이체하기'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}