'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { X, PlusCircle } from 'lucide-react'
import { Student } from '@/types'

interface AllowanceModalProps {
  students: Student[]
  onClose: () => void
  onSuccess: () => void
}

export default function AllowanceModal({ students, onClose, onSuccess }: AllowanceModalProps) {
  const [formData, setFormData] = useState({
    amount: '',
    account_type: 'checking',
    description: '',
    use_weekly_allowance: true,
    selected_students: students.map(s => s.id) // 기본적으로 모든 학생 선택
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const getTotalAmount = () => {
    if (formData.use_weekly_allowance) {
      return formData.selected_students.reduce((sum, studentId) => {
        const student = students.find(s => s.id === studentId)
        return sum + (student?.weekly_allowance || 0)
      }, 0)
    } else {
      const amount = parseFloat(formData.amount || '0')
      return amount * formData.selected_students.length
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (formData.selected_students.length === 0) {
        setError('최소 한 명의 학생을 선택해야 합니다.')
        return
      }

      if (!formData.use_weekly_allowance && !formData.amount) {
        setError('수당 금액을 입력해야 합니다.')
        return
      }

      const response = await fetch('/api/transactions/allowance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (data.success) {
        onSuccess()
      } else {
        setError(data.error || '수당 지급에 실패했습니다.')
      }
    } catch {
      setError('서버 연결에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleStudentToggle = (studentId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      selected_students: checked
        ? [...prev.selected_students, studentId]
        : prev.selected_students.filter(id => id !== studentId)
    }))
  }

  const toggleAllStudents = () => {
    const allSelected = formData.selected_students.length === students.length
    setFormData(prev => ({
      ...prev,
      selected_students: allSelected ? [] : students.map(s => s.id)
    }))
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <PlusCircle className="w-5 h-5" />
                <span>수당 지급</span>
              </CardTitle>
              <CardDescription>
                선택한 학생들에게 수당을 지급합니다
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
            {/* 수당 유형 선택 */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="use_weekly_allowance"
                  checked={formData.use_weekly_allowance}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({ ...prev, use_weekly_allowance: checked as boolean }))
                  }
                />
                <Label htmlFor="use_weekly_allowance">
                  개별 주급 사용 (학생마다 다른 금액)
                </Label>
              </div>

              {!formData.use_weekly_allowance && (
                <div className="space-y-2">
                  <Label htmlFor="amount">동일 금액 (원)</Label>
                  <Input
                    id="amount"
                    type="number"
                    min="1"
                    step="1"
                    placeholder="모든 학생에게 지급할 동일 금액"
                    value={formData.amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                    required={!formData.use_weekly_allowance}
                  />
                </div>
              )}
            </div>

            {/* 계좌 선택 */}
            <div className="space-y-2">
              <Label htmlFor="account_type">입금 계좌</Label>
              <Select
                value={formData.account_type}
                onValueChange={(value) => setFormData(prev => ({ ...prev, account_type: value }))}
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
                <Label>수당을 받을 학생</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={toggleAllStudents}
                >
                  {formData.selected_students.length === students.length ? '전체 해제' : '전체 선택'}
                </Button>
              </div>

              <div className="space-y-2 max-h-40 overflow-y-auto">
                {students.map((student) => (
                  <div key={student.id} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`student_${student.id}`}
                        checked={formData.selected_students.includes(student.id)}
                        onCheckedChange={(checked) => handleStudentToggle(student.id, checked as boolean)}
                      />
                      <Label htmlFor={`student_${student.id}`} className="font-normal">
                        {student.name} ({student.student_code})
                      </Label>
                    </div>
                    <span className="text-sm text-gray-600">
                      {formData.use_weekly_allowance
                        ? formatCurrency(student.weekly_allowance)
                        : formatCurrency(parseFloat(formData.amount || '0'))
                      }
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 총 지급액 */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-medium">총 지급액:</span>
                <span className="text-lg font-bold text-blue-600">
                  {formatCurrency(getTotalAmount())}
                </span>
              </div>
              <p className="text-sm text-blue-600 mt-1">
                {formData.selected_students.length}명의 학생에게 지급
              </p>
            </div>

            {/* 메모 */}
            <div className="space-y-2">
              <Label htmlFor="description">메모 (선택사항)</Label>
              <Textarea
                id="description"
                placeholder="수당 지급 사유나 메모를 입력하세요"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
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
                disabled={loading || formData.selected_students.length === 0}
              >
                {loading ? '지급 중...' : '수당 지급'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}