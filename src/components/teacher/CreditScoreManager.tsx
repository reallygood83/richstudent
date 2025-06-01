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

  // 신용점수 등급 계산 - 조화로운 파스텔 팔레트
  const getCreditGrade = (score: number) => {
    if (score >= 800) return { 
      grade: 'A+', 
      bgColor: 'bg-emerald-400', 
      borderColor: 'border-emerald-500',
      textColor: 'text-emerald-700',
      text: '최우수' 
    }
    if (score >= 750) return { 
      grade: 'A', 
      bgColor: 'bg-green-400', 
      borderColor: 'border-green-500',
      textColor: 'text-green-700',
      text: '우수' 
    }
    if (score >= 700) return { 
      grade: 'B+', 
      bgColor: 'bg-amber-300', 
      borderColor: 'border-amber-400',
      textColor: 'text-amber-700',
      text: '양호' 
    }
    if (score >= 650) return { 
      grade: 'B', 
      bgColor: 'bg-yellow-300', 
      borderColor: 'border-yellow-400',
      textColor: 'text-yellow-700',
      text: '보통' 
    }
    if (score >= 600) return { 
      grade: 'C+', 
      bgColor: 'bg-orange-300', 
      borderColor: 'border-orange-400',
      textColor: 'text-orange-700',
      text: '주의' 
    }
    if (score >= 550) return { 
      grade: 'C', 
      bgColor: 'bg-red-300', 
      borderColor: 'border-red-400',
      textColor: 'text-red-700',
      text: '개선필요' 
    }
    return { 
      grade: 'D', 
      bgColor: 'bg-gray-400', 
      borderColor: 'border-gray-500',
      textColor: 'text-gray-700',
      text: '불량' 
    }
  }

  // 조정 버튼 색상
  const getAdjustmentColor = (value: number) => {
    if (value > 0) return 'bg-green-500 hover:bg-green-600 text-white'
    return 'bg-red-500 hover:bg-red-600 text-white'
  }

  // 성공 애니메이션 (가점) - 더 화려하게!
  const triggerSuccessAnimation = () => {
    // 첫 번째 confetti
    confetti({
      particleCount: 150,
      spread: 100,
      origin: { y: 0.4 },
      colors: ['#10B981', '#34D399', '#6EE7B7', '#A7F3D0', '#FBBF24', '#F59E0B']
    })
    
    // 연속 confetti 효과
    setTimeout(() => {
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.7, x: 0.3 },
        colors: ['#EF4444', '#F87171', '#FCA5A5', '#FECACA']
      })
    }, 300)
    
    setTimeout(() => {
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.7, x: 0.7 },
        colors: ['#8B5CF6', '#A78BFA', '#C4B5FD', '#DDD6FE']
      })
    }, 600)
  }

  // 실패 애니메이션 (감점) - 더 강력하게!
  const triggerWarningAnimation = () => {
    // 화면 흔들기 효과
    const element = document.body
    element.style.animation = 'shake 0.8s ease-in-out'
    
    // 빨간 파티클 효과 (실망 표현)
    confetti({
      particleCount: 80,
      spread: 100,
      origin: { y: 0.6 },
      colors: ['#DC2626', '#EF4444', '#F87171', '#374151'],
      gravity: 1.5,
      scalar: 0.8
    })
    
    setTimeout(() => {
      element.style.animation = ''
    }, 800)
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
        // 애니메이션 효과와 메시지
        if (adjustment > 0) {
          triggerSuccessAnimation()
          // 축하 메시지
          setTimeout(() => {
            alert(`🎉 축하합니다! ${student.name} 학생의 신용점수가 ${adjustment}점 올랐습니다!\n\n이전: ${data.data.previous_score}점 → 현재: ${data.data.new_score}점\n\n계속해서 좋은 모습 보여주세요! ✨`)
          }, 1000)
        } else {
          triggerWarningAnimation()
          // 아쉬운 메시지
          setTimeout(() => {
            alert(`😔 아쉽게도 ${student.name} 학생의 신용점수가 ${adjustment}점 차감되었습니다.\n\n이전: ${data.data.previous_score}점 → 현재: ${data.data.new_score}점\n\n다음엔 더 좋은 모습 기대할게요! 💪`)
          }, 1000)
        }

        // 상태 초기화
        setAdjustment(null)
        setReason('')
        setOpen(false)
        
        // 부모 컴포넌트에 업데이트 알림
        onScoreUpdate()
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
            className={`
              flex items-center gap-1.5 px-3 py-1.5 h-auto
              ${currentGrade.bgColor} ${currentGrade.borderColor} 
              ${currentGrade.textColor} font-medium
              hover:scale-105 hover:shadow-md transition-all duration-200
              border-2 rounded-lg
            `}
          >
            <Star className="w-3.5 h-3.5" />
            <span className="font-semibold">{student.credit_score}</span>
            <span className="text-xs font-medium px-1.5 py-0.5 bg-white/40 rounded">
              {currentGrade.grade}
            </span>
          </Button>
        </DialogTrigger>
        
        <DialogContent className="sm:max-w-sm max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Target className="w-5 h-5 text-blue-500" />
              신용점수 관리
            </DialogTitle>
            <DialogDescription className="text-sm">
              {student.name} 학생의 신용점수를 조정합니다
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* 현재 신용점수 */}
            <div className={`text-center p-3 ${currentGrade.bgColor}/20 border ${currentGrade.borderColor} rounded-lg`}>
              <div className="text-xs text-gray-600 mb-1">현재 신용점수</div>
              <div className="flex items-center justify-center gap-2">
                <span className={`text-2xl font-bold ${currentGrade.textColor}`}>{student.credit_score}</span>
                <Badge className={`${currentGrade.bgColor} ${currentGrade.textColor} text-xs border-0`}>
                  {currentGrade.grade}
                </Badge>
              </div>
              <div className={`text-xs ${currentGrade.textColor} mt-1`}>{currentGrade.text}</div>
            </div>

            {/* 조정값 선택 */}
            <div>
              <Label className="text-xs font-medium">조정값 선택</Label>
              <div className="grid grid-cols-4 gap-1 mt-1">
                {adjustmentButtons.map((value) => (
                  <Button
                    key={value}
                    variant={adjustment === value ? "default" : "outline"}
                    size="sm"
                    className={`
                      h-8 text-xs
                      ${adjustment === value ? getAdjustmentColor(value) : ''}
                      hover:scale-105 transition-all duration-200
                    `}
                    onClick={() => setAdjustment(value)}
                  >
                    <span className="flex items-center gap-1">
                      {value > 0 ? (
                        <Plus className="w-2 h-2" />
                      ) : (
                        <Minus className="w-2 h-2" />
                      )}
                      {Math.abs(value)}
                    </span>
                  </Button>
                ))}
              </div>
            </div>

            {/* 예상 결과 */}
            {adjustment && (
              <div className="p-2 bg-blue-50 rounded border border-blue-200">
                <div className="flex items-center gap-2 text-xs">
                  {adjustment > 0 ? (
                    <TrendingUp className="w-3 h-3 text-green-500" />
                  ) : (
                    <TrendingDown className="w-3 h-3 text-red-500" />
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
              <Label htmlFor="reason" className="text-xs font-medium">
                조정 사유 <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="reason"
                placeholder="조정 사유를 입력하세요"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="mt-1 text-sm"
                rows={2}
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