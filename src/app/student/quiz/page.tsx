'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Loader2, Trophy, CheckCircle, XCircle, Clock, Gift, Star } from 'lucide-react'

interface QuizQuestion {
  question: string
  options: string[]
  correct_answer: string
  explanation: string
}

interface QuizData {
  quiz: {
    id: string
    quiz_type: string
    questions: QuizQuestion[]
    total_questions: number
  }
  attempts: {
    completed_count: number
    has_completed: boolean
    today_reward: number
  }
}

interface SubmitAnswer {
  question_index: number
  student_answer: string
}

interface GradedAnswer {
  question_index: number
  question: string
  student_answer: string
  correct_answer: string
  is_correct: boolean
  points_earned: number
  explanation: string
}

interface QuizResult {
  attempt_id: string
  total_questions: number
  correct_answers: number
  score_percentage: number
  reward: {
    participation: number
    score: number
    bonus: number
    total: number
  }
  graded_answers: GradedAnswer[]
  is_perfect_score: boolean
}

export default function StudentQuizPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [quizData, setQuizData] = useState<QuizData | null>(null)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<QuizResult | null>(null)
  const [startTime] = useState(Date.now())

  useEffect(() => {
    loadQuiz()
  }, [])

  const loadQuiz = async () => {
    try {
      const response = await fetch('/api/student/daily-quiz')
      const data = await response.json()

      if (data.success) {
        setQuizData(data.data)
      } else if (data.error === 'No quiz available') {
        alert('오늘의 퀴즈가 아직 생성되지 않았습니다. 잠시 후 다시 시도해주세요.')
        router.push('/student/dashboard')
      } else {
        alert(data.error || '퀴즈를 불러오는데 실패했습니다.')
        router.push('/student/dashboard')
      }
    } catch (error) {
      console.error('Quiz load error:', error)
      alert('퀴즈를 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleAnswerSelect = (questionIndex: number, answer: string) => {
    setSelectedAnswers({
      ...selectedAnswers,
      [questionIndex]: answer
    })
  }

  const handleNext = () => {
    if (quizData && currentQuestion < quizData.quiz.total_questions - 1) {
      setCurrentQuestion(currentQuestion + 1)
    }
  }

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1)
    }
  }

  const handleSubmit = async () => {
    if (!quizData) return

    const answeredCount = Object.keys(selectedAnswers).length
    if (answeredCount < quizData.quiz.total_questions) {
      if (!confirm(`${quizData.quiz.total_questions - answeredCount}개의 문제가 미응답 상태입니다. 제출하시겠습니까?`)) {
        return
      }
    }

    setSubmitting(true)

    try {
      const answers: SubmitAnswer[] = []
      for (let i = 0; i < quizData.quiz.total_questions; i++) {
        answers.push({
          question_index: i,
          student_answer: selectedAnswers[i] || ''
        })
      }

      const timeSpent = Math.floor((Date.now() - startTime) / 1000)

      const response = await fetch('/api/student/submit-quiz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          daily_quiz_id: quizData.quiz.id,
          answers,
          time_spent_seconds: timeSpent
        })
      })

      const data = await response.json()

      if (data.success) {
        setResult(data.data)
      } else {
        alert(data.error || '제출 실패')
      }
    } catch (error) {
      console.error('Submit error:', error)
      alert('제출 중 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  if (!quizData) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>퀴즈를 찾을 수 없습니다</CardTitle>
            <CardDescription>
              오늘의 퀴즈가 아직 준비되지 않았습니다.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  // 이미 완료한 경우
  if (quizData.attempts.has_completed && !result) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-6 h-6 text-green-600" />
              오늘의 퀴즈 완료!
            </CardTitle>
            <CardDescription>
              오늘은 이미 퀴즈를 완료했습니다. 내일 다시 도전해주세요!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-green-800 font-semibold">
                오늘 획득한 보상: {quizData.attempts.today_reward.toLocaleString()}원
              </p>
            </div>
            <Button
              className="w-full mt-4"
              onClick={() => router.push('/student/dashboard')}
            >
              대시보드로 돌아가기
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 결과 화면
  if (result) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {result.is_perfect_score ? (
                <>
                  <Trophy className="w-6 h-6 text-yellow-500" />
                  🎉 만점입니다! 축하합니다!
                </>
              ) : (
                <>
                  <Star className="w-6 h-6 text-blue-500" />
                  퀴즈 완료!
                </>
              )}
            </CardTitle>
            <CardDescription>
              {result.correct_answers}/{result.total_questions} 문제 정답 ({result.score_percentage}%)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 보상 요약 */}
            <div className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
              <div className="flex items-center gap-2 mb-4">
                <Gift className="w-5 h-5 text-purple-600" />
                <h3 className="font-semibold text-lg">획득한 보상</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>참여 보상:</span>
                  <span className="font-semibold">{result.reward.participation.toLocaleString()}원</span>
                </div>
                <div className="flex justify-between">
                  <span>정답 보상:</span>
                  <span className="font-semibold">{result.reward.score.toLocaleString()}원</span>
                </div>
                {result.reward.bonus > 0 && (
                  <div className="flex justify-between text-yellow-600">
                    <span>만점 보너스:</span>
                    <span className="font-semibold">{result.reward.bonus.toLocaleString()}원</span>
                  </div>
                )}
                <div className="border-t pt-2 flex justify-between text-lg font-bold text-purple-600">
                  <span>총 보상:</span>
                  <span>{result.reward.total.toLocaleString()}원</span>
                </div>
              </div>
            </div>

            {/* 문제별 결과 */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">문제별 결과</h3>
              {result.graded_answers.map((answer, index) => (
                <Card key={index} className={answer.is_correct ? 'border-green-200' : 'border-red-200'}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      {answer.is_correct ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600" />
                      )}
                      문제 {index + 1}
                      {answer.is_correct && (
                        <span className="text-sm text-green-600">
                          (+{answer.points_earned.toLocaleString()}원)
                        </span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="font-medium">{answer.question}</p>
                    <div className="space-y-1 text-sm">
                      <p>
                        <span className="text-gray-600">내 답:</span>{' '}
                        <span className={answer.is_correct ? 'text-green-600 font-semibold' : 'text-red-600'}>
                          {answer.student_answer || '(미응답)'}
                        </span>
                      </p>
                      {!answer.is_correct && (
                        <p>
                          <span className="text-gray-600">정답:</span>{' '}
                          <span className="text-green-600 font-semibold">
                            {answer.correct_answer}
                          </span>
                        </p>
                      )}
                      <p className="text-gray-600 italic">{answer.explanation}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Button
              className="w-full"
              onClick={() => router.push('/student/dashboard')}
            >
              대시보드로 돌아가기
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 퀴즈 진행 화면
  const question = quizData.quiz.questions[currentQuestion]
  const progress = ((currentQuestion + 1) / quizData.quiz.total_questions) * 100
  const isAnswered = selectedAnswers[currentQuestion] !== undefined

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-2xl font-bold">
            오늘의 퀴즈 ({quizData.quiz.quiz_type === 'english' ? '영어' : quizData.quiz.quiz_type === 'chinese' ? '한자' : '사자성어'})
          </h1>
          <div className="flex items-center gap-2 text-gray-600">
            <Clock className="w-5 h-5" />
            <span>
              {currentQuestion + 1} / {quizData.quiz.total_questions}
            </span>
          </div>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>문제 {currentQuestion + 1}</CardTitle>
          <CardDescription className="text-lg font-medium text-gray-900 mt-2">
            {question.question}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <RadioGroup
            value={selectedAnswers[currentQuestion] || ''}
            onValueChange={(value) => handleAnswerSelect(currentQuestion, value)}
          >
            {question.options.map((option, index) => (
              <div
                key={index}
                className={`flex items-center space-x-2 p-4 rounded-lg border-2 transition-colors ${
                  selectedAnswers[currentQuestion] === option
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <RadioGroupItem value={option} id={`option-${index}`} />
                <Label
                  htmlFor={`option-${index}`}
                  className="flex-1 cursor-pointer font-medium"
                >
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>

          <div className="flex justify-between gap-4">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentQuestion === 0}
            >
              이전
            </Button>

            {currentQuestion === quizData.quiz.total_questions - 1 ? (
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    제출 중...
                  </>
                ) : (
                  '제출하기'
                )}
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                disabled={!isAnswered}
                className="flex-1"
              >
                다음
              </Button>
            )}
          </div>

          {!isAnswered && (
            <p className="text-sm text-amber-600 text-center">
              답을 선택하면 다음 문제로 넘어갈 수 있습니다
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
