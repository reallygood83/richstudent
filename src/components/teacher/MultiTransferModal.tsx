'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { X, Users, Plus, Trash2, Calculator } from 'lucide-react'
import { Student } from '@/types'

interface TransferRecipient {
  student_id: string
  amount: number
  account_type: string
}

interface MultiTransferModalProps {
  students: Student[]
  onClose: () => void
  onSuccess: () => void
}

export default function MultiTransferModal({ students, onClose, onSuccess }: MultiTransferModalProps) {
  const [formData, setFormData] = useState({
    from_student_id: '',
    from_account_type: 'checking',
    description: '',
    transfer_type: 'individual' // 'individual' or 'equal'
  })
  
  const [recipients, setRecipients] = useState<TransferRecipient[]>([
    { student_id: '', amount: 0, account_type: 'checking' }
  ])
  
  const [equalAmount, setEqualAmount] = useState('')
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fromStudent = students.find(s => s.id === formData.from_student_id)

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

  const getTotalAmount = () => {
    if (formData.transfer_type === 'equal') {
      return selectedStudents.length * parseFloat(equalAmount || '0')
    } else {
      return recipients.reduce((sum, recipient) => sum + (recipient.amount || 0), 0)
    }
  }

  const addRecipient = () => {
    setRecipients([...recipients, { student_id: '', amount: 0, account_type: 'checking' }])
  }

  const removeRecipient = (index: number) => {
    if (recipients.length > 1) {
      setRecipients(recipients.filter((_, i) => i !== index))
    }
  }

  const updateRecipient = (index: number, field: keyof TransferRecipient, value: string | number) => {
    const updated = [...recipients]
    updated[index] = { ...updated[index], [field]: value }
    setRecipients(updated)
  }

  const toggleStudentSelection = (studentId: string) => {
    if (selectedStudents.includes(studentId)) {
      setSelectedStudents(selectedStudents.filter(id => id !== studentId))
    } else {
      setSelectedStudents([...selectedStudents, studentId])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const totalAmount = getTotalAmount()
      
      if (totalAmount <= 0) {
        setError('총 송금액은 0보다 커야 합니다.')
        return
      }

      const availableBalance = getAccountBalance(fromStudent, formData.from_account_type)
      if (totalAmount > availableBalance) {
        setError('잔액이 부족합니다.')
        return
      }

      // 송금 대상 준비
      let transferList: TransferRecipient[] = []
      
      if (formData.transfer_type === 'equal') {
        // 동일 금액 송금
        const amount = parseFloat(equalAmount)
        transferList = selectedStudents.map(studentId => ({
          student_id: studentId,
          amount: amount,
          account_type: 'checking'
        }))
      } else {
        // 개별 금액 송금
        transferList = recipients.filter(r => r.student_id && r.amount > 0)
      }

      if (transferList.length === 0) {
        setError('송금할 대상을 선택해주세요.')
        return
      }

      const response = await fetch('/api/transactions/multi-transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from_student_id: formData.from_student_id,
          from_account_type: formData.from_account_type,
          recipients: transferList,
          description: formData.description,
          transfer_type: formData.transfer_type
        }),
      })

      const data = await response.json()

      if (data.success) {
        onSuccess()
      } else {
        setError(data.error || '다중 송금에 실패했습니다.')
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
                <Users className="w-5 h-5" />
                <span>다중 송금</span>
              </CardTitle>
              <CardDescription>
                여러 학생에게 한 번에 송금합니다
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
                onValueChange={(value) => setFormData({...formData, from_student_id: value})}
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
                  onValueChange={(value) => setFormData({...formData, from_account_type: value})}
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

            {/* 송금 방식 선택 */}
            <div className="space-y-4">
              <Label>송금 방식</Label>
              <div className="flex space-x-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="transfer_type"
                    value="individual"
                    checked={formData.transfer_type === 'individual'}
                    onChange={(e) => setFormData({...formData, transfer_type: e.target.value})}
                    className="w-4 h-4"
                  />
                  <span>개별 금액 송금</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="transfer_type"
                    value="equal"
                    checked={formData.transfer_type === 'equal'}
                    onChange={(e) => setFormData({...formData, transfer_type: e.target.value})}
                    className="w-4 h-4"
                  />
                  <span>동일 금액 송금</span>
                </label>
              </div>
            </div>

            {/* 개별 금액 송금 */}
            {formData.transfer_type === 'individual' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>송금 대상</Label>
                  <Button
                    type="button"
                    onClick={addRecipient}
                    size="sm"
                    variant="outline"
                    className="flex items-center space-x-1"
                  >
                    <Plus className="w-4 h-4" />
                    <span>추가</span>
                  </Button>
                </div>
                
                <div className="space-y-3">
                  {recipients.map((recipient, index) => (
                    <div key={index} className="flex items-end space-x-3 p-3 border rounded-lg">
                      <div className="flex-1">
                        <Label className="text-sm">수신자</Label>
                        <Select
                          value={recipient.student_id}
                          onValueChange={(value) => updateRecipient(index, 'student_id', value)}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="학생 선택" />
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
                      
                      <div className="w-32">
                        <Label className="text-sm">금액</Label>
                        <Input
                          type="number"
                          min="1"
                          placeholder="금액"
                          value={recipient.amount || ''}
                          onChange={(e) => updateRecipient(index, 'amount', parseInt(e.target.value) || 0)}
                          className="h-9"
                        />
                      </div>
                      
                      <div className="w-28">
                        <Label className="text-sm">계좌</Label>
                        <Select
                          value={recipient.account_type}
                          onValueChange={(value) => updateRecipient(index, 'account_type', value)}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="checking">당좌</SelectItem>
                            <SelectItem value="savings">저축</SelectItem>
                            <SelectItem value="investment">투자</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {recipients.length > 1 && (
                        <Button
                          type="button"
                          onClick={() => removeRecipient(index)}
                          size="sm"
                          variant="outline"
                          className="h-9 w-9 p-0 text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 동일 금액 송금 */}
            {formData.transfer_type === 'equal' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="equal_amount">1인당 송금액 (원)</Label>
                  <Input
                    id="equal_amount"
                    type="number"
                    min="1"
                    placeholder="각 학생에게 송금할 금액"
                    value={equalAmount}
                    onChange={(e) => setEqualAmount(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>송금 대상 선택</Label>
                  <div className="max-h-60 overflow-y-auto border rounded-lg p-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {students
                        .filter(student => student.id !== formData.from_student_id)
                        .map((student) => (
                        <label
                          key={student.id}
                          className="flex items-center space-x-2 cursor-pointer p-2 hover:bg-gray-50 rounded"
                        >
                          <Checkbox
                            checked={selectedStudents.includes(student.id)}
                            onCheckedChange={() => toggleStudentSelection(student.id)}
                          />
                          <span className="text-sm">
                            {student.name} ({student.student_code})
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                  {selectedStudents.length > 0 && (
                    <div className="text-sm text-gray-600">
                      선택된 학생: {selectedStudents.length}명
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 메모 */}
            <div className="space-y-2">
              <Label htmlFor="description">메모 (선택사항)</Label>
              <Textarea
                id="description"
                placeholder="송금 사유나 메모를 입력하세요"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                rows={3}
              />
            </div>

            {/* 총계 표시 */}
            {fromStudent && getTotalAmount() > 0 && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Calculator className="w-5 h-5 text-blue-600" />
                    <span className="font-medium text-blue-900">송금 요약</span>
                  </div>
                </div>
                <div className="mt-2 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>총 송금액:</span>
                    <span className="font-semibold">{formatCurrency(getTotalAmount())}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>송금 후 잔액:</span>
                    <span className={
                      getAccountBalance(fromStudent, formData.from_account_type) - getTotalAmount() < 0 
                        ? 'text-red-600 font-semibold' 
                        : 'text-green-600 font-semibold'
                    }>
                      {formatCurrency(getAccountBalance(fromStudent, formData.from_account_type) - getTotalAmount())}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>
                      {formData.transfer_type === 'equal' 
                        ? `송금 대상: ${selectedStudents.length}명` 
                        : `송금 대상: ${recipients.filter(r => r.student_id && r.amount > 0).length}명`
                      }
                    </span>
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
                disabled={loading || !formData.from_student_id || getTotalAmount() <= 0}
              >
                {loading ? '송금 중...' : `${formData.transfer_type === 'equal' ? selectedStudents.length : recipients.filter(r => r.student_id && r.amount > 0).length}명에게 송금`}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}