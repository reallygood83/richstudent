'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { X, User, Hash, DollarSign } from 'lucide-react'

interface CreateStudentModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function CreateStudentModal({ isOpen, onClose, onSuccess }: CreateStudentModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    student_code: '',
    password: '',
    weekly_allowance: 10000
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/students/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (data.success) {
        setFormData({
          name: '',
          student_code: '',
          password: '',
          weekly_allowance: 10000
        })
        onSuccess()
        onClose()
      } else {
        setError(data.error || '학생 생성에 실패했습니다.')
      }
    } catch (err) {
      setError('서버 연결에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'weekly_allowance' ? Number(value) : value
    }))
  }

  const generateStudentCode = () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase()
    setFormData(prev => ({ ...prev, student_code: code }))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <User className="w-5 h-5" />
                <span>새 학생 추가</span>
              </CardTitle>
              <CardDescription>
                새로운 학생을 클래스에 추가합니다
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

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">학생 이름 *</Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="김학생"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="student_code">학생 코드 *</Label>
              <div className="flex space-x-2">
                <Input
                  id="student_code"
                  name="student_code"
                  type="text"
                  placeholder="STUDENT01"
                  value={formData.student_code}
                  onChange={handleChange}
                  required
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={generateStudentCode}
                  className="flex items-center space-x-1"
                >
                  <Hash className="w-4 h-4" />
                  <span>생성</span>
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                학생이 로그인할 때 사용하는 고유 코드입니다
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">비밀번호 (선택사항)</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="비워두면 비밀번호 없이 로그인"
                value={formData.password}
                onChange={handleChange}
              />
              <p className="text-xs text-gray-500">
                비밀번호를 설정하지 않으면 학생 코드만으로 로그인할 수 있습니다
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="weekly_allowance">주급 (원)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="weekly_allowance"
                  name="weekly_allowance"
                  type="number"
                  min="0"
                  step="1000"
                  placeholder="10000"
                  value={formData.weekly_allowance}
                  onChange={handleChange}
                  className="pl-10"
                />
              </div>
              <p className="text-xs text-gray-500">
                매주 자동으로 지급되는 용돈입니다
              </p>
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
                disabled={loading}
              >
                {loading ? '생성 중...' : '학생 추가'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}