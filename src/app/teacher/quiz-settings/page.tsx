'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Loader2, CheckCircle, AlertCircle, BookOpen, Clock, DollarSign } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import RequireAuth from '@/components/auth/RequireAuth'

interface QuizSettings {
  id?: string
  quiz_type: 'english' | 'chinese' | 'idiom'
  questions_per_quiz: number
  daily_open_time: string
  max_attempts_per_day: number
  participation_reward: number
  correct_answer_reward: number
  perfect_score_bonus: number
  daily_max_reward: number
  is_active: boolean
}

function QuizSettingsPageContent() {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const [settings, setSettings] = useState<QuizSettings>({
    quiz_type: 'english',
    questions_per_quiz: 5,
    daily_open_time: '08:00',
    max_attempts_per_day: 1,
    participation_reward: 1000,
    correct_answer_reward: 1500,
    perfect_score_bonus: 1500,
    daily_max_reward: 10000,
    is_active: true
  })

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login')
    }
  }, [authLoading, isAuthenticated, router])

  const loadSettings = useCallback(async () => {
    try {
      const sessionToken = localStorage.getItem('teacher_session')
      if (!sessionToken) {
        return
      }

      const response = await fetch('/api/teacher/quiz-settings', {
        headers: {
          'Authorization': `Bearer ${sessionToken}`
        }
      })

      const data = await response.json()

      if (data.success && data.data) {
        setSettings(data.data)
      }
    } catch (error) {
      console.error('Settings load error:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // Load existing settings
  useEffect(() => {
    if (isAuthenticated) {
      loadSettings()
    }
  }, [isAuthenticated, loadSettings])

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)

    try {
      const sessionToken = localStorage.getItem('teacher_session')
      if (!sessionToken) {
        router.push('/auth/login')
        return
      }

      const response = await fetch('/api/teacher/quiz-settings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      })

      const data = await response.json()

      if (data.success) {
        setMessage({ type: 'success', text: '퀴즈 설정이 저장되었습니다!' })
        setSettings(data.data)
      } else {
        setMessage({ type: 'error', text: data.error || '설정 저장 실패' })
      }
    } catch (error) {
      console.error('Save error:', error)
      setMessage({ type: 'error', text: '설정 저장 중 오류가 발생했습니다.' })
    } finally {
      setSaving(false)
    }
  }

  const calculateMaxReward = () => {
    const participation = settings.participation_reward
    const score = settings.correct_answer_reward * settings.questions_per_quiz
    const bonus = settings.perfect_score_bonus
    return participation + score + bonus
  }

  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">퀴즈 보상 시스템 설정</h1>
        <p className="text-gray-600 mt-2">
          학생들에게 제공할 일일 퀴즈의 설정을 관리합니다. 매일 오전 7시에 자동으로 퀴즈가 생성됩니다.
        </p>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${
          message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <div className="space-y-6">
        {/* 퀴즈 종류 및 기본 설정 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              퀴즈 종류 및 기본 설정
            </CardTitle>
            <CardDescription>
              학생들에게 제공할 퀴즈의 종류와 기본 설정을 선택하세요.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="quiz_type">퀴즈 종류</Label>
              <Select
                value={settings.quiz_type}
                onValueChange={(value: 'english' | 'chinese' | 'idiom') =>
                  setSettings({ ...settings, quiz_type: value })
                }
              >
                <SelectTrigger id="quiz_type">
                  <SelectValue placeholder="퀴즈 종류 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="english">영어 단어 퀴즈</SelectItem>
                  <SelectItem value="chinese">한자 퀴즈</SelectItem>
                  <SelectItem value="idiom">사자성어 퀴즈</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="questions_per_quiz">문제 수</Label>
              <Input
                id="questions_per_quiz"
                type="number"
                value={settings.questions_per_quiz}
                disabled
                className="bg-gray-100"
              />
              <p className="text-sm text-gray-500">고정값: 5문제</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="daily_open_time">퀴즈 오픈 시간</Label>
              <Input
                id="daily_open_time"
                type="time"
                value={settings.daily_open_time}
                onChange={(e) =>
                  setSettings({ ...settings, daily_open_time: e.target.value })
                }
              />
              <p className="text-sm text-gray-500">
                매일 이 시간에 새로운 퀴즈가 자동 생성됩니다 (한국시간 기준)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_attempts">일일 참여 횟수</Label>
              <Input
                id="max_attempts"
                type="number"
                value={settings.max_attempts_per_day}
                disabled
                className="bg-gray-100"
              />
              <p className="text-sm text-gray-500">고정값: 하루 1회 참여 가능</p>
            </div>
          </CardContent>
        </Card>

        {/* 보상 설정 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              보상 금액 설정
            </CardTitle>
            <CardDescription>
              학생들이 받을 수 있는 보상 금액을 설정하세요.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="participation_reward">참여 보상</Label>
              <Input
                id="participation_reward"
                type="number"
                value={settings.participation_reward}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    participation_reward: parseFloat(e.target.value)
                  })
                }
                step="100"
                min="0"
              />
              <p className="text-sm text-gray-500">퀴즈에 참여하기만 해도 받는 보상</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="correct_answer_reward">정답 보상 (문제당)</Label>
              <Input
                id="correct_answer_reward"
                type="number"
                value={settings.correct_answer_reward}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    correct_answer_reward: parseFloat(e.target.value)
                  })
                }
                step="100"
                min="0"
              />
              <p className="text-sm text-gray-500">정답을 맞출 때마다 받는 보상</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="perfect_score_bonus">만점 보너스</Label>
              <Input
                id="perfect_score_bonus"
                type="number"
                value={settings.perfect_score_bonus}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    perfect_score_bonus: parseFloat(e.target.value)
                  })
                }
                step="100"
                min="0"
              />
              <p className="text-sm text-gray-500">모든 문제를 맞췄을 때 추가 보너스</p>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">예상 보상 금액</h3>
              <div className="space-y-1 text-sm text-blue-800">
                <p>• 참여만: {settings.participation_reward.toLocaleString()}원</p>
                <p>
                  • 1문제 정답: {(settings.participation_reward + settings.correct_answer_reward).toLocaleString()}원
                </p>
                <p>
                  • 만점 (5문제): {calculateMaxReward().toLocaleString()}원
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="daily_max_reward">일일 최대 보상</Label>
              <Input
                id="daily_max_reward"
                type="number"
                value={settings.daily_max_reward}
                disabled
                className="bg-gray-100"
              />
              <p className="text-sm text-gray-500">
                고정값: 하루 최대 10,000원까지 획득 가능
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 활성화 설정 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              시스템 활성화
            </CardTitle>
            <CardDescription>
              퀴즈 시스템의 활성화 상태를 관리합니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="is_active">퀴즈 시스템 활성화</Label>
                <p className="text-sm text-gray-500">
                  비활성화하면 학생들이 퀴즈에 접근할 수 없습니다
                </p>
              </div>
              <Switch
                id="is_active"
                checked={settings.is_active}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, is_active: checked })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* 저장 버튼 */}
        <div className="flex justify-end gap-4">
          <Button
            variant="outline"
            onClick={() => router.push('/teacher/dashboard')}
          >
            취소
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                저장 중...
              </>
            ) : (
              '설정 저장'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function QuizSettingsPage() {
  return (
    <RequireAuth>
      <QuizSettingsPageContent />
    </RequireAuth>
  )
}
