'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { X, Receipt, Calculator, AlertCircle } from 'lucide-react'
import { Student } from '@/types'

interface TaxCollectionModalProps {
  students: Student[]
  onClose: () => void
  onSuccess: () => void
}

export default function TaxCollectionModal({ students, onClose, onSuccess }: TaxCollectionModalProps) {
  const [formData, setFormData] = useState({
    tax_type: 'percentage', // 'percentage' or 'fixed'
    account_type: 'checking',
    description: '',
    percentage_rate: '',
    fixed_amount: ''
  })
  
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const getAccountBalance = (student: Student, accountType: string) => {
    return student.accounts[accountType as keyof typeof student.accounts] || 0
  }

  const calculateTaxAmount = (student: Student) => {
    const balance = getAccountBalance(student, formData.account_type)
    
    if (formData.tax_type === 'percentage') {
      const rate = parseFloat(formData.percentage_rate || '0') / 100
      return Math.round(balance * rate)
    } else {
      return parseFloat(formData.fixed_amount || '0')
    }
  }

  const getTotalTaxAmount = () => {
    const studentsToTax = selectedStudents.length > 0 
      ? students.filter(s => selectedStudents.includes(s.id))
      : students

    return studentsToTax.reduce((sum, student) => {
      return sum + calculateTaxAmount(student)
    }, 0)
  }

  const getStudentsToTax = () => {
    return selectedStudents.length > 0 
      ? students.filter(s => selectedStudents.includes(s.id))
      : students
  }

  const toggleStudentSelection = (studentId: string) => {
    if (selectedStudents.includes(studentId)) {
      setSelectedStudents(selectedStudents.filter(id => id !== studentId))
    } else {
      setSelectedStudents([...selectedStudents, studentId])
    }
  }

  const selectAllStudents = () => {
    if (selectedStudents.length === students.length) {
      setSelectedStudents([])
    } else {
      setSelectedStudents(students.map(s => s.id))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // 검증
      if (formData.tax_type === 'percentage') {
        const rate = parseFloat(formData.percentage_rate || '0')
        if (rate <= 0 || rate > 100) {
          setError('세율은 0%보다 크고 100% 이하여야 합니다.')
          return
        }
      } else {
        const amount = parseFloat(formData.fixed_amount || '0')
        if (amount <= 0) {
          setError('고정 금액은 0보다 커야 합니다.')
          return
        }
      }

      const studentsToTax = getStudentsToTax()
      if (studentsToTax.length === 0) {
        setError('세금을 징수할 학생을 선택해주세요.')
        return
      }

      // 잔액 부족 확인
      const insufficientBalanceStudents = studentsToTax.filter(student => {
        const taxAmount = calculateTaxAmount(student)
        const balance = getAccountBalance(student, formData.account_type)
        return taxAmount > balance
      })

      if (insufficientBalanceStudents.length > 0) {
        setError(`잔액이 부족한 학생이 있습니다: ${insufficientBalanceStudents.map(s => s.name).join(', ')}`)
        return
      }

      const response = await fetch('/api/transactions/tax-collection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tax_type: formData.tax_type,
          account_type: formData.account_type,
          description: formData.description,
          percentage_rate: formData.tax_type === 'percentage' ? parseFloat(formData.percentage_rate) : null,
          fixed_amount: formData.tax_type === 'fixed' ? parseFloat(formData.fixed_amount) : null,
          student_ids: selectedStudents.length > 0 ? selectedStudents : students.map(s => s.id)
        }),
      })

      const data = await response.json()

      if (data.success) {
        onSuccess()
      } else {
        setError(data.error || '세금 징수에 실패했습니다.')
      }
    } catch {
      setError('서버 연결에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Receipt className="w-5 h-5" />
                <span>세금 징수</span>
              </CardTitle>
              <CardDescription>
                학생들로부터 세금을 징수합니다
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
              <div className="flex items-center text-red-700">
                <AlertCircle className="w-4 h-4 mr-2" />
                <p className="text-sm">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 세금 유형 선택 */}
            <div className="space-y-4">
              <Label>세금 유형</Label>
              <div className="flex space-x-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="tax_type"
                    value="percentage"
                    checked={formData.tax_type === 'percentage'}
                    onChange={(e) => setFormData({...formData, tax_type: e.target.value})}
                    className="w-4 h-4"
                  />
                  <span>비례세 (잔액의 %)</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="tax_type"
                    value="fixed"
                    checked={formData.tax_type === 'fixed'}
                    onChange={(e) => setFormData({...formData, tax_type: e.target.value})}
                    className="w-4 h-4"
                  />
                  <span>정액세 (고정 금액)</span>
                </label>
              </div>
            </div>

            {/* 세율/금액 입력 */}
            {formData.tax_type === 'percentage' ? (
              <div className="space-y-2">
                <Label htmlFor="percentage_rate">세율 (%)</Label>
                <Input
                  id="percentage_rate"
                  type="number"
                  min="0.1"
                  max="100"
                  step="0.1"
                  placeholder="예: 10 (잔액의 10%)"
                  value={formData.percentage_rate}
                  onChange={(e) => setFormData({...formData, percentage_rate: e.target.value})}
                  required
                />
                <p className="text-sm text-gray-600">
                  각 학생의 계좌 잔액에서 해당 비율만큼 징수합니다
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="fixed_amount">징수 금액 (원)</Label>
                <Input
                  id="fixed_amount"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="모든 학생에게서 징수할 고정 금액"
                  value={formData.fixed_amount}
                  onChange={(e) => setFormData({...formData, fixed_amount: e.target.value})}
                  required
                />
                <p className="text-sm text-gray-600">
                  모든 선택된 학생에게서 동일한 금액을 징수합니다
                </p>
              </div>
            )}

            {/* 계좌 선택 */}
            <div className="space-y-2">
              <Label htmlFor="account_type">징수 대상 계좌</Label>
              <Select
                value={formData.account_type}
                onValueChange={(value) => setFormData({...formData, account_type: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="checking">당좌 계좌</SelectItem>
                  <SelectItem value="savings">저축 계좌</SelectItem>
                  <SelectItem value="investment">투자 계좌</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 학생 선택 */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>세금 징수 대상</Label>
                <Button
                  type="button"
                  onClick={selectAllStudents}
                  variant="outline"
                  size="sm"
                >
                  {selectedStudents.length === students.length ? '전체 선택 해제' : '전체 선택'}
                </Button>
              </div>
              
              <div className="max-h-60 overflow-y-auto border rounded-lg p-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {students.map((student) => {
                    const taxAmount = calculateTaxAmount(student)
                    const balance = getAccountBalance(student, formData.account_type)
                    const isInsufficient = taxAmount > balance
                    
                    return (
                      <label
                        key={student.id}
                        className={`flex items-center justify-between p-3 cursor-pointer border rounded hover:bg-gray-50 ${
                          isInsufficient ? 'bg-red-50 border-red-200' : ''
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <Checkbox
                            checked={selectedStudents.includes(student.id)}
                            onCheckedChange={() => toggleStudentSelection(student.id)}
                            disabled={isInsufficient}
                          />
                          <div>
                            <div className="font-medium">{student.name}</div>
                            <div className="text-sm text-gray-600">
                              잔액: {formatCurrency(balance)}
                            </div>
                            {isInsufficient && (
                              <div className="text-xs text-red-600">
                                잔액 부족
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-sm">
                            {formatCurrency(taxAmount)}
                          </div>
                          {formData.tax_type === 'percentage' && formData.percentage_rate && (
                            <div className="text-xs text-gray-500">
                              ({formData.percentage_rate}%)
                            </div>
                          )}
                        </div>
                      </label>
                    )
                  })}
                </div>
              </div>
              
              <div className="text-sm text-gray-600">
                선택된 학생: {selectedStudents.length > 0 ? selectedStudents.length : students.length}명
                {selectedStudents.length === 0 && ' (전체)'}
              </div>
            </div>

            {/* 메모 */}
            <div className="space-y-2">
              <Label htmlFor="description">세금 설명 (선택사항)</Label>
              <Textarea
                id="description"
                placeholder="세금 징수 사유나 설명을 입력하세요"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                rows={3}
              />
            </div>

            {/* 총계 표시 */}
            {(formData.percentage_rate || formData.fixed_amount) && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Calculator className="w-5 h-5 text-blue-600" />
                    <span className="font-medium text-blue-900">징수 요약</span>
                  </div>
                </div>
                <div className="mt-2 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>총 징수액:</span>
                    <span className="font-semibold text-blue-900">{formatCurrency(getTotalTaxAmount())}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>징수 대상:</span>
                    <span>{getStudentsToTax().length}명</span>
                  </div>
                  <div className="flex justify-between">
                    <span>평균 징수액:</span>
                    <span>{getStudentsToTax().length > 0 ? formatCurrency(getTotalTaxAmount() / getStudentsToTax().length) : '₩0'}</span>
                  </div>
                </div>
              </div>
            )}

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
                disabled={loading || getTotalTaxAmount() <= 0}
              >
                {loading ? '징수 중...' : `${getStudentsToTax().length}명에게서 ${formatCurrency(getTotalTaxAmount())} 징수`}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}