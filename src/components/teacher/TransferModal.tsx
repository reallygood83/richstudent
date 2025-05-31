'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { X, ArrowRight } from 'lucide-react'
import { Student } from '@/types'

interface TransferModalProps {
  students: Student[]
  onClose: () => void
  onSuccess: () => void
}

export default function TransferModal({ students, onClose, onSuccess }: TransferModalProps) {
  const [formData, setFormData] = useState({
    from_student_id: '',
    to_student_id: '',
    amount: '',
    from_account_type: 'checking',
    to_account_type: 'checking',
    description: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fromStudent = students.find(s => s.id === formData.from_student_id)
  const toStudent = students.find(s => s.id === formData.to_student_id)

  const getAccountBalance = (student: Student | undefined, accountType: string) => {
    if (!student) return 0
    return student.accounts[accountType as keyof typeof student.accounts] || 0
  }

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
    setLoading(true)

    try {
      const amount = parseFloat(formData.amount)
      
      if (amount <= 0) {
        setError('송금액은 0보다 커야 합니다.')
        return
      }

      const availableBalance = getAccountBalance(fromStudent, formData.from_account_type)
      if (amount > availableBalance) {
        setError('잔액이 부족합니다.')
        return
      }

      const response = await fetch('/api/transactions/transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          amount
        }),
      })

      const data = await response.json()

      if (data.success) {
        onSuccess()
      } else {
        setError(data.error || '송금에 실패했습니다.')
      }
    } catch {
      setError('서버 연결에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    setError('')
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <ArrowRight className="w-5 h-5" />
                <span>학생 간 송금</span>
              </CardTitle>
              <CardDescription>
                한 학생에서 다른 학생으로 자금을 송금합니다
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 송금자 선택 */}
            <div className="space-y-2">
              <Label htmlFor="from_student">송금자</Label>
              <Select
                value={formData.from_student_id}
                onValueChange={(value) => handleChange('from_student_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="송금할 학생을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.name} ({student.student_code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 송금자 계좌 */}
            {fromStudent && (
              <div className="space-y-2">
                <Label htmlFor="from_account">송금 계좌</Label>
                <Select
                  value={formData.from_account_type}
                  onValueChange={(value) => handleChange('from_account_type', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="checking">
                      당좌 계좌 - {formatCurrency(fromStudent.accounts.checking)}
                    </SelectItem>
                    <SelectItem value="savings">
                      저축 계좌 - {formatCurrency(fromStudent.accounts.savings)}
                    </SelectItem>
                    <SelectItem value="investment">
                      투자 계좌 - {formatCurrency(fromStudent.accounts.investment)}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* 수신자 선택 */}
            <div className="space-y-2">
              <Label htmlFor="to_student">수신자</Label>
              <Select
                value={formData.to_student_id}
                onValueChange={(value) => handleChange('to_student_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="받을 학생을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {students
                    .filter(student => student.id !== formData.from_student_id)
                    .map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.name} ({student.student_code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 수신자 계좌 */}
            {toStudent && (
              <div className="space-y-2">
                <Label htmlFor="to_account">입금 계좌</Label>
                <Select
                  value={formData.to_account_type}
                  onValueChange={(value) => handleChange('to_account_type', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="checking">
                      당좌 계좌 - {formatCurrency(toStudent.accounts.checking)}
                    </SelectItem>
                    <SelectItem value="savings">
                      저축 계좌 - {formatCurrency(toStudent.accounts.savings)}
                    </SelectItem>
                    <SelectItem value="investment">
                      투자 계좌 - {formatCurrency(toStudent.accounts.investment)}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* 송금액 */}
            <div className="space-y-2">
              <Label htmlFor="amount">송금액 (원)</Label>
              <Input
                id="amount"
                type="number"
                min="1"
                step="1"
                placeholder="송금할 금액을 입력하세요"
                value={formData.amount}
                onChange={(e) => handleChange('amount', e.target.value)}
                required
              />
              {fromStudent && formData.amount && (
                <p className="text-sm text-gray-600">
                  송금 후 잔액: {formatCurrency(
                    getAccountBalance(fromStudent, formData.from_account_type) - parseFloat(formData.amount || '0')
                  )}
                </p>
              )}
            </div>

            {/* 메모 */}
            <div className="space-y-2">
              <Label htmlFor="description">메모 (선택사항)</Label>
              <Textarea
                id="description"
                placeholder="송금 사유나 메모를 입력하세요"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
                disabled={loading}
              >
                취소
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={loading || !formData.from_student_id || !formData.to_student_id || !formData.amount}
              >
                {loading ? '송금 중...' : '송금 실행'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}