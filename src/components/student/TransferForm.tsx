'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowRightLeft, CreditCard, Users, DollarSign } from 'lucide-react'

interface Student {
  id: string
  name: string
  student_code: string
}

interface Account {
  checking: number
  savings: number
  investment: number
}

interface TransferFormProps {
  currentStudent: {
    id: string
    name: string
    accounts: Account
  }
  onTransferSuccess: () => void
}

export default function TransferForm({ currentStudent, onTransferSuccess }: TransferFormProps) {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    to_student_id: '',
    amount: 0,
    from_account: 'checking' as 'checking' | 'savings' | 'investment',
    description: ''
  })
  const [error, setError] = useState('')

  // 다른 학생 목록 조회
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const response = await fetch('/api/student/classmates')
        const data = await response.json()
        
        if (data.success) {
          // 본인 제외
          const otherStudents = data.students.filter((s: Student) => s.id !== currentStudent.id)
          setStudents(otherStudents)
        }
      } catch (error) {
        console.error('Failed to fetch students:', error)
      }
    }

    fetchStudents()
  }, [currentStudent.id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // 유효성 검사
    if (!formData.to_student_id) {
      setError('받을 학생을 선택해주세요.')
      return
    }

    if (formData.amount <= 0) {
      setError('송금액은 0보다 커야 합니다.')
      return
    }

    // 잔액 확인
    const availableBalance = currentStudent.accounts[formData.from_account]
    if (formData.amount > availableBalance) {
      setError(`${getAccountName(formData.from_account)} 잔액이 부족합니다.`)
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/student/transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to_student_id: formData.to_student_id,
          amount: formData.amount,
          from_account: formData.from_account,
          description: formData.description || `${currentStudent.name}의 송금`
        }),
      })

      const data = await response.json()

      if (data.success) {
        // 폼 초기화
        setFormData({
          to_student_id: '',
          amount: 0,
          from_account: 'checking',
          description: ''
        })
        
        // 성공 콜백
        onTransferSuccess()
        
        alert('송금이 완료되었습니다!')
      } else {
        setError(data.error || '송금에 실패했습니다.')
      }
    } catch (error) {
      console.error('Transfer error:', error)
      setError('서버 연결에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const getAccountName = (account: string) => {
    switch (account) {
      case 'checking': return '당좌예금'
      case 'savings': return '저축예금'
      case 'investment': return '투자계좌'
      default: return account
    }
  }

  const getAccountIcon = (account: string) => {
    switch (account) {
      case 'checking': return <CreditCard className="w-4 h-4 text-blue-500" />
      case 'savings': return <DollarSign className="w-4 h-4 text-green-500" />
      case 'investment': return <ArrowRightLeft className="w-4 h-4 text-purple-500" />
      default: return null
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <ArrowRightLeft className="w-5 h-5" />
          <span>송금하기</span>
        </CardTitle>
        <CardDescription>
          다른 학생에게 돈을 보낼 수 있습니다
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

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 보낼 계좌 선택 */}
          <div className="space-y-2">
            <Label>보낼 계좌</Label>
            <Select
              value={formData.from_account}
              onValueChange={(value: 'checking' | 'savings' | 'investment') => 
                setFormData(prev => ({ ...prev, from_account: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="checking">
                  <div className="flex items-center space-x-2">
                    {getAccountIcon('checking')}
                    <span>당좌예금 - {formatCurrency(currentStudent.accounts.checking)}</span>
                  </div>
                </SelectItem>
                <SelectItem value="savings">
                  <div className="flex items-center space-x-2">
                    {getAccountIcon('savings')}
                    <span>저축예금 - {formatCurrency(currentStudent.accounts.savings)}</span>
                  </div>
                </SelectItem>
                <SelectItem value="investment">
                  <div className="flex items-center space-x-2">
                    {getAccountIcon('investment')}
                    <span>투자계좌 - {formatCurrency(currentStudent.accounts.investment)}</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              현재 잔액: {formatCurrency(currentStudent.accounts[formData.from_account])}
            </p>
          </div>

          {/* 받을 학생 선택 */}
          <div className="space-y-2">
            <Label>받을 학생</Label>
            <Select
              value={formData.to_student_id}
              onValueChange={(value) => 
                setFormData(prev => ({ ...prev, to_student_id: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="학생을 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {students.map((student) => (
                  <SelectItem key={student.id} value={student.id}>
                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4" />
                      <span>{student.name} ({student.student_code})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 송금액 */}
          <div className="space-y-2">
            <Label htmlFor="amount">송금액 (원)</Label>
            <Input
              id="amount"
              type="number"
              min="1"
              max={currentStudent.accounts[formData.from_account]}
              value={formData.amount || ''}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                amount: Number(e.target.value) 
              }))}
              placeholder="송금할 금액을 입력하세요"
              required
            />
          </div>

          {/* 메모 (선택사항) */}
          <div className="space-y-2">
            <Label htmlFor="description">메모 (선택사항)</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                description: e.target.value 
              }))}
              placeholder="송금 내역에 표시될 메모"
              maxLength={100}
            />
          </div>

          {/* 송금 요약 */}
          {formData.amount > 0 && formData.to_student_id && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">송금 요약</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>보내는 계좌:</span>
                  <span>{getAccountName(formData.from_account)}</span>
                </div>
                <div className="flex justify-between">
                  <span>받는 학생:</span>
                  <span>{students.find(s => s.id === formData.to_student_id)?.name}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>송금액:</span>
                  <span>{formatCurrency(formData.amount)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>송금 후 잔액:</span>
                  <span>{formatCurrency(currentStudent.accounts[formData.from_account] - formData.amount)}</span>
                </div>
              </div>
            </div>
          )}

          <Button
            type="submit"
            disabled={loading || !formData.to_student_id || formData.amount <= 0}
            className="w-full"
          >
            {loading ? '송금 중...' : '송금하기'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}