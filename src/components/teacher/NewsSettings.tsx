'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Loader2, Check, AlertCircle, Eye, EyeOff } from 'lucide-react'
import type { NewsSettings as NewsSettingsType, StudentLevel } from '@/types/news'

export default function NewsSettings() {
  const [settings, setSettings] = useState<NewsSettingsType | null>(null)
  const [apiKey, setApiKey] = useState('')
  const [studentLevel, setStudentLevel] = useState<StudentLevel>('elementary')
  const [autoGenerate, setAutoGenerate] = useState(false)
  const [showApiKey, setShowApiKey] = useState(false)
  const [loading, setLoading] = useState(false)
  const [testing, setTesting] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    fetchSettings()
  }, [])

  async function fetchSettings() {
    try {
      const res = await fetch('/api/news/settings')
      const data = await res.json()

      if (data.success && data.settings) {
        setSettings(data.settings)
        setStudentLevel(data.settings.student_level)
        setAutoGenerate(data.settings.auto_generate_explanation || false)
        // API 키는 마스킹되어 있으므로 표시만 함
        if (data.settings.has_api_key) {
          setApiKey(data.settings.gemini_api_key || '')
        }
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error)
    }
  }

  async function handleSave() {
    setLoading(true)
    setSaveMessage(null)

    try {
      const res = await fetch('/api/news/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gemini_api_key: apiKey.includes('...') ? undefined : apiKey, // 마스킹된 키는 보내지 않음
          student_level: studentLevel,
          auto_generate_explanation: autoGenerate
        })
      })

      const data = await res.json()

      if (data.success) {
        setSaveMessage({ type: 'success', text: data.message || '설정이 저장되었습니다.' })
        await fetchSettings()
      } else {
        setSaveMessage({ type: 'error', text: data.error || '설정 저장에 실패했습니다.' })
      }
    } catch {
      setSaveMessage({ type: 'error', text: '서버 오류가 발생했습니다.' })
    } finally {
      setLoading(false)
    }
  }

  async function testConnection() {
    if (!apiKey || apiKey.includes('...')) {
      setSaveMessage({ type: 'error', text: 'API 키를 입력해주세요.' })
      return
    }

    setTesting(true)
    setSaveMessage(null)

    try {
      const res = await fetch('/api/news/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gemini_api_key: apiKey,
          student_level: studentLevel,
          auto_generate_explanation: autoGenerate
        })
      })

      const data = await res.json()

      if (data.success) {
        setSaveMessage({ type: 'success', text: 'API 연결 테스트 성공!' })
      } else {
        setSaveMessage({ type: 'error', text: data.error || 'API 연결 테스트 실패' })
      }
    } catch {
      setSaveMessage({ type: 'error', text: '연결 테스트 중 오류가 발생했습니다.' })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Gemini API 설정</CardTitle>
          <CardDescription>
            뉴스 기사를 학생 수준에 맞게 설명하기 위한 Gemini API 키를 등록하세요.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="api-key">Gemini API 키</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="api-key"
                  type={showApiKey ? 'text' : 'password'}
                  placeholder="AIzaSy..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <Button
                variant="outline"
                onClick={testConnection}
                disabled={testing || !apiKey || apiKey.includes('...')}
              >
                {testing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    테스트 중...
                  </>
                ) : (
                  '연결 테스트'
                )}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Google AI Studio에서 발급받은 API 키를 입력하세요.{' '}
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                API 키 발급받기 →
              </a>
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="student-level">학생 수준</Label>
            <Select value={studentLevel} onValueChange={(value) => setStudentLevel(value as StudentLevel)}>
              <SelectTrigger id="student-level">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="elementary">초등학교 5-6학년</SelectItem>
                <SelectItem value="middle">중학교</SelectItem>
                <SelectItem value="high">고등학교</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              뉴스 설명의 난이도가 선택한 학생 수준에 맞춰집니다.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto-generate">AI 설명 자동 생성</Label>
                <p className="text-sm text-muted-foreground">
                  새로운 뉴스를 수집할 때 AI 설명을 자동으로 생성합니다.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  id="auto-generate"
                  className="sr-only peer"
                  checked={autoGenerate}
                  onChange={(e) => setAutoGenerate(e.target.checked)}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>
            {autoGenerate && (
              <div className="p-3 rounded-md bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  ⚠️ 자동 생성 활성화 시 뉴스 수집마다 Gemini API가 호출됩니다.
                  무료 티어는 분당 15개 요청으로 제한되므로 참고하세요.
                </p>
              </div>
            )}
          </div>

          {saveMessage && (
            <div
              className={`flex items-center gap-2 p-3 rounded-md ${
                saveMessage.type === 'success'
                  ? 'bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200'
                  : 'bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200'
              }`}
            >
              {saveMessage.type === 'success' ? (
                <Check className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <span className="text-sm">{saveMessage.text}</span>
            </div>
          )}

          <Button onClick={handleSave} disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                저장 중...
              </>
            ) : (
              '설정 저장'
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>API 사용 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm">API 키 등록 상태</span>
            <Badge variant={settings?.has_api_key ? 'default' : 'secondary'}>
              {settings?.has_api_key ? '등록됨' : '미등록'}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">현재 학생 수준</span>
            <Badge variant="outline">
              {studentLevel === 'elementary' && '초등 5-6학년'}
              {studentLevel === 'middle' && '중학생'}
              {studentLevel === 'high' && '고등학생'}
            </Badge>
          </div>
          <div className="pt-3 border-t">
            <p className="text-xs text-muted-foreground">
              💡 Gemini API는 무료 티어에서 분당 15개 요청까지 가능합니다.
              자세한 내용은{' '}
              <a
                href="https://ai.google.dev/pricing"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                요금 정책
              </a>
              을 참고하세요.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
