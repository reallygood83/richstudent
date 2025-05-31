'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { GraduationCap, Lock, Users } from 'lucide-react'

export default function StudentLogin() {
  const [formData, setFormData] = useState({
    session_code: '',
    student_code: '',
    password: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (!formData.session_code.trim()) {
        setError('세션 코드를 입력해주세요.')
        return
      }

      if (!formData.student_code.trim()) {
        setError('학생 코드를 입력해주세요.')
        return
      }

      const response = await fetch('/api/student/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (data.success) {
        // 로그인 성공시 학생 대시보드로 이동
        router.push('/student/dashboard')
      } else {
        setError(data.error || '로그인에 실패했습니다.')
      }
    } catch {
      setError('서버 연결에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">RichStudent</h1>
          <p className="text-gray-600 mt-2">학생 로그인</p>
        </div>

        {/* Login Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span>학생 접속</span>
            </CardTitle>
            <CardDescription>
              선생님이 제공한 세션 코드와 학생 정보로 로그인하세요
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

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 세션 코드 */}
              <div className="space-y-2">
                <Label htmlFor="session_code">세션 코드</Label>
                <Input
                  id="session_code"
                  type="text"
                  placeholder="선생님이 제공한 세션 코드 (예: ABC123)"
                  value={formData.session_code}
                  onChange={(e) => handleChange('session_code', e.target.value.toUpperCase())}
                  maxLength={10}
                  required
                  className="font-mono tracking-wider"
                />
                <p className="text-xs text-gray-500">
                  선생님 화면에 표시된 6자리 코드를 입력하세요
                </p>
              </div>

              {/* 학생 코드 */}
              <div className="space-y-2">
                <Label htmlFor="student_code">학생 코드</Label>
                <Input
                  id="student_code"
                  type="text"
                  placeholder="본인의 학생 코드 (예: S001)"
                  value={formData.student_code}
                  onChange={(e) => handleChange('student_code', e.target.value.toUpperCase())}
                  maxLength={10}
                  required
                  className="font-mono"
                />
              </div>

              {/* 비밀번호 (선택사항) */}
              <div className="space-y-2">
                <Label htmlFor="password">
                  비밀번호 
                  <span className="text-sm text-gray-500 font-normal">(설정된 경우)</span>
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="비밀번호가 설정된 경우 입력"
                    value={formData.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    className="pl-10"
                  />
                </div>
                <p className="text-xs text-gray-500">
                  선생님이 비밀번호를 설정하지 않았다면 비워두세요
                </p>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading ? '로그인 중...' : '로그인'}
              </Button>
            </form>

            {/* Help Section */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">도움말</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• 세션 코드는 선생님 화면에서 확인할 수 있습니다</li>
                <li>• 학생 코드는 선생님이 부여한 고유 번호입니다</li>
                <li>• 비밀번호는 선택사항입니다</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}