'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
// Simple Modal Component (since Dialog is not available)
const Modal = ({ isOpen, onClose, children }: { isOpen: boolean, onClose: () => void, children: React.ReactNode }) => {
  if (!isOpen) return null
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {children}
      </div>
    </div>
  )
}

const ModalHeader = ({ children }: { children: React.ReactNode }) => (
  <div className="p-6 border-b">{children}</div>
)

const ModalTitle = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-lg font-semibold">{children}</h2>
)

const ModalDescription = ({ children }: { children: React.ReactNode }) => (
  <p className="text-sm text-gray-600 mt-1">{children}</p>
)

const ModalContent = ({ children }: { children: React.ReactNode }) => (
  <div className="p-6">{children}</div>
)

const ModalFooter = ({ children }: { children: React.ReactNode }) => (
  <div className="flex justify-end space-x-2 p-6 border-t bg-gray-50">{children}</div>
)
import { Badge } from '@/components/ui/badge'
import { CreditCard, TrendingUp, User, DollarSign } from 'lucide-react'

interface Student {
  id: string
  name: string
  student_code: string
  credit_score: number
  weekly_allowance: number
  accounts: {
    checking: number
    savings: number
    investment: number
  }
  total_balance: number
}

interface EditStudentModalProps {
  isOpen: boolean
  onClose: () => void
  student: Student | null
  onSuccess: () => void
}

export default function EditStudentModal({
  isOpen,
  onClose,
  student,
  onSuccess
}: EditStudentModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    weekly_allowance: 0,
    credit_score: 700,
    checking: 0,
    savings: 0,
    investment: 0
  })

  // student prop이 변경될 때마다 폼 데이터 업데이트
  useEffect(() => {
    if (student && isOpen) {
      setFormData({
        name: student.name || '',
        weekly_allowance: student.weekly_allowance || 0,
        credit_score: student.credit_score || 700,
        checking: student.accounts?.checking || 0,
        savings: student.accounts?.savings || 0,
        investment: student.accounts?.investment || 0
      })
    }
  }, [student, isOpen])

  // 모달이 닫힐 때 폼 리셋
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        name: '',
        weekly_allowance: 0,
        credit_score: 700,
        checking: 0,
        savings: 0,
        investment: 0
      })
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!student) return

    setLoading(true)
    try {
      const response = await fetch('/api/students/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          student_id: student.id,
          name: formData.name,
          weekly_allowance: formData.weekly_allowance,
          credit_score: formData.credit_score,
          accounts: {
            checking: formData.checking,
            savings: formData.savings,
            investment: formData.investment
          }
        }),
      })

      const data = await response.json()

      if (data.success) {
        onSuccess()
        onClose()
      } else {
        alert(data.error || '학생 정보 수정에 실패했습니다.')
      }
    } catch (error) {
      console.error('Update student error:', error)
      alert('서버 연결에 실패했습니다.')
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

  const getTotalBalance = () => {
    return formData.checking + formData.savings + formData.investment
  }

  const getCreditScoreColor = (score: number) => {
    if (score >= 750) return 'bg-green-100 text-green-800'
    if (score >= 650) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  if (!student) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalHeader>
        <ModalTitle>
          <div className="flex items-center space-x-2">
            <User className="w-5 h-5" />
            <span>학생 정보 수정</span>
          </div>
        </ModalTitle>
        <ModalDescription>
          {student.name} ({student.student_code}) 학생의 정보를 수정할 수 있습니다.
        </ModalDescription>
      </ModalHeader>

      <ModalContent>

        <form id="editStudentForm" onSubmit={handleSubmit} className="space-y-6">
          {/* 기본 정보 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">학생 이름</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="학생 이름"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weekly_allowance">주급 (원)</Label>
              <Input
                id="weekly_allowance"
                type="number"
                min="0"
                value={formData.weekly_allowance}
                onChange={(e) => setFormData(prev => ({ ...prev, weekly_allowance: Number(e.target.value) }))}
                placeholder="0"
              />
            </div>
          </div>

          {/* 신용점수 */}
          <div className="space-y-2">
            <Label htmlFor="credit_score" className="flex items-center space-x-2">
              <span>신용점수</span>
              <Badge className={getCreditScoreColor(formData.credit_score)}>
                {formData.credit_score}점
              </Badge>
            </Label>
            <Input
              id="credit_score"
              type="number"
              min="350"
              max="850"
              value={formData.credit_score}
              onChange={(e) => setFormData(prev => ({ ...prev, credit_score: Number(e.target.value) }))}
              placeholder="700"
            />
            <p className="text-xs text-gray-500">
              350-850 범위로 설정 가능합니다. 대출 이자율에 영향을 줍니다.
            </p>
          </div>

          {/* 계좌 잔액 */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">계좌 잔액 수정</h4>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="checking" className="flex items-center space-x-2">
                  <CreditCard className="w-4 h-4 text-blue-500" />
                  <span>당좌예금</span>
                </Label>
                <Input
                  id="checking"
                  type="number"
                  min="0"
                  value={formData.checking}
                  onChange={(e) => setFormData(prev => ({ ...prev, checking: Number(e.target.value) }))}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="savings" className="flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <span>저축예금</span>
                </Label>
                <Input
                  id="savings"
                  type="number"
                  min="0"
                  value={formData.savings}
                  onChange={(e) => setFormData(prev => ({ ...prev, savings: Number(e.target.value) }))}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="investment" className="flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4 text-purple-500" />
                  <span>투자계좌</span>
                </Label>
                <Input
                  id="investment"
                  type="number"
                  min="0"
                  value={formData.investment}
                  onChange={(e) => setFormData(prev => ({ ...prev, investment: Number(e.target.value) }))}
                  placeholder="0"
                />
              </div>
            </div>

            {/* 총 자산 표시 */}
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-700">총 자산</span>
                <div className="flex items-center space-x-2">
                  <DollarSign className="w-4 h-4 text-green-600" />
                  <span className="font-bold text-green-600">
                    {formatCurrency(getTotalBalance())}
                  </span>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                변경 전: {formatCurrency(student.total_balance)} → 
                변경 후: {formatCurrency(getTotalBalance())}
                {getTotalBalance() !== student.total_balance && (
                  <span className={`ml-2 font-medium ${
                    getTotalBalance() > student.total_balance ? 'text-green-600' : 'text-red-600'
                  }`}>
                    ({getTotalBalance() > student.total_balance ? '+' : ''}
                    {formatCurrency(getTotalBalance() - student.total_balance)})
                  </span>
                )}
              </p>
            </div>
          </div>

        </form>
      </ModalContent>
      
      <ModalFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          취소
        </Button>
        <Button type="submit" form="editStudentForm" disabled={loading}>
          {loading ? '수정 중...' : '수정하기'}
        </Button>
      </ModalFooter>
    </Modal>
  )
}