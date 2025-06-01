'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { 
  TrendingUp, 
  TrendingDown, 
  Star,
  Plus,
  Minus,
  Sparkles,
  Target
} from 'lucide-react'
import confetti from 'canvas-confetti'

interface Student {
  id: string
  name: string
  student_code: string
  credit_score: number
}

interface CreditScoreManagerProps {
  student: Student
  onScoreUpdate: () => void
}

export default function CreditScoreManager({ student, onScoreUpdate }: CreditScoreManagerProps) {
  const [open, setOpen] = useState(false)
  const [adjustment, setAdjustment] = useState<number | null>(null)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [animating, setAnimating] = useState(false)

  // 신용점수 등급 계산
  const getCreditGrade = (score: number) => {
    if (score >= 800) return { grade: 'A+', color: 'bg-green-500', text: '최우수' }
    if (score >= 750) return { grade: 'A', color: 'bg-green-400', text: '우수' }
    if (score >= 700) return { grade: 'B+', color: 'bg-blue-500', text: '양호' }
    if (score >= 650) return { grade: 'B', color: 'bg-blue-400', text: '보통' }
    if (score >= 600) return { grade: 'C+', color: 'bg-yellow-500', text: '주의' }
    if (score >= 550) return { grade: 'C', color: 'bg-yellow-400', text: '개선필요' }
    return { grade: 'D', color: 'bg-red-500', text: '불량' }
  }

  // 조정 버튼 색상
  const getAdjustmentColor = (value: number) => {
    if (value > 0) return 'bg-green-500 hover:bg-green-600 text-white'
    return 'bg-red-500 hover:bg-red-600 text-white'
  }

  // 성공 애니메이션 (가점)
  const triggerSuccessAnimation = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#10B981', '#34D399', '#6EE7B7', '#A7F3D0']
    })
  }

  // 실패 애니메이션 (감점)
  const triggerWarningAnimation = () => {
    // 화면 흔들기 효과
    const element = document.body
    element.style.animation = 'shake 0.5s ease-in-out'
    setTimeout(() => {
      element.style.animation = ''
    }, 500)
  }

  // 신용점수 조정 처리
  const handleAdjustment = async () => {
    if (!adjustment || !reason.trim()) {
      alert('조정값과 사유를 모두 입력해주세요.')
      return
    }

    setLoading(true)
    setAnimating(true)

    try {
      const response = await fetch('/api/students/credit-score', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          student_id: student.id,
          adjustment: adjustment,
          reason: reason.trim()
        })
      })

      const data = await response.json()

      if (data.success) {
        // 애니메이션 효과
        if (adjustment > 0) {
          triggerSuccessAnimation()
        } else {
          triggerWarningAnimation()
        }

        // 상태 초기화
        setAdjustment(null)
        setReason('')
        setOpen(false)
        
        // 부모 컴포넌트에 업데이트 알림
        onScoreUpdate()

        // 성공 메시지
        alert(data.message)
      } else {
        alert(data.error || '신용점수 조정에 실패했습니다.')
      }
    } catch (error) {
      console.error('Credit score adjustment error:', error)
      alert('서버 연결 실패')
    } finally {
      setLoading(false)
      setAnimating(false)
    }
  }

  const currentGrade = getCreditGrade(student.credit_score)
  const adjustmentButtons = [-20, -15, -10, -5, 5, 10, 15, 20]

  return (
    <>
      {/* 흔들기 애니메이션 CSS */}
      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
      `}</style>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1 hover:scale-105 transition-transform"
          >
            <Star className="w-4 h-4" />
            <span className="font-bold">{student.credit_score}</span>
          </Button>
        </DialogTrigger>
        
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-500" />
              신용점수 관리
            </DialogTitle>
            <DialogDescription>
              {student.name} 학생의 신용점수를 조정합니다
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* 현재 신용점수 */}
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-500 mb-1">현재 신용점수</div>
              <div className="flex items-center justify-center gap-3">
                <span className="text-3xl font-bold">{student.credit_score}</span>
                <Badge className={`${currentGrade.color} text-white`}>
                  {currentGrade.grade} ({currentGrade.text})
                </Badge>
              </div>
              <div className="text-xs text-gray-400 mt-1">범위: 350 - 850</div>
            </div>

            {/* 조정값 선택 */}
            <div>
              <Label className="text-sm font-medium">조정값 선택</Label>
              <div className="grid grid-cols-4 gap-2 mt-2">
                {adjustmentButtons.map((value) => (
                  <Button
                    key={value}
                    variant={adjustment === value ? "default" : "outline"}
                    size="sm"
                    className={`
                      ${adjustment === value ? getAdjustmentColor(value) : ''}
                      hover:scale-105 transition-all duration-200
                    `}
                    onClick={() => setAdjustment(value)}
                  >
                    <span className="flex items-center gap-1">
                      {value > 0 ? (
                        <Plus className="w-3 h-3" />
                      ) : (
                        <Minus className="w-3 h-3" />
                      )}
                      {Math.abs(value)}
                    </span>
                  </Button>
                ))}
              </div>
            </div>

            {/* 예상 결과 */}
            {adjustment && (
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 text-sm">
                  {adjustment > 0 ? (
                    <TrendingUp className="w-4 h-4 text-green-500" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-500" />
                  )}
                  <span>
                    조정 후: <strong>{Math.max(350, Math.min(850, student.credit_score + adjustment))}점</strong>
                    <span className={`ml-1 ${adjustment > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ({adjustment > 0 ? '+' : ''}{adjustment})
                    </span>
                  </span>
                </div>
              </div>
            )}

            {/* 사유 입력 */}
            <div>
              <Label htmlFor="reason" className="text-sm font-medium">
                조정 사유 <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="reason"
                placeholder="신용점수 조정 사유를 입력하세요 (예: 과제 성실 제출, 수업 참여도 우수, 약속 불이행 등)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="mt-1"
                rows={3}
              />
            </div>

            {/* 실행 버튼 */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                취소
              </Button>
              <Button
                className={`flex-1 ${
                  adjustment && adjustment > 0 
                    ? 'bg-green-500 hover:bg-green-600' 
                    : adjustment && adjustment < 0
                    ? 'bg-red-500 hover:bg-red-600'
                    : ''
                } ${animating ? 'animate-pulse' : ''}`}
                onClick={handleAdjustment}
                disabled={!adjustment || !reason.trim() || loading}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    처리중...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    점수 조정
                  </div>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}