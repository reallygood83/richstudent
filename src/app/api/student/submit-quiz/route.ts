// 학생 퀴즈 제출 및 자동 채점 API
// POST: 퀴즈 답안 제출 → 자동 채점 → 보상 계산

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

interface SubmitAnswer {
  question_index: number
  student_answer: string
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createClient()

    // 학생 인증 확인
    const studentToken = cookieStore.get('student_session')?.value

    if (!studentToken) {
      return NextResponse.json(
        { success: false, error: '로그인이 필요합니다.' },
        { status: 401 }
      )
    }

    // 학생 세션 검증
    const { data: sessionData, error: sessionError } = await supabase
      .from('student_sessions')
      .select('student_id')
      .eq('session_token', studentToken)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (sessionError || !sessionData) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 세션입니다.' },
        { status: 401 }
      )
    }

    const studentId = sessionData.student_id

    // 요청 데이터 파싱
    const body = await request.json()
    const {
      daily_quiz_id,
      answers, // [{ question_index: 0, student_answer: "Apple" }]
      time_spent_seconds
    } = body

    // 유효성 검증
    if (!daily_quiz_id || !answers || !Array.isArray(answers)) {
      return NextResponse.json(
        { success: false, error: '답안 데이터가 올바르지 않습니다.' },
        { status: 400 }
      )
    }

    console.log('📝 퀴즈 제출:', {
      student_id: studentId,
      daily_quiz_id,
      answer_count: answers.length
    })

    // 퀴즈 정보 조회
    const { data: quiz, error: quizError } = await supabase
      .from('daily_quizzes')
      .select('*')
      .eq('id', daily_quiz_id)
      .single()

    if (quizError || !quiz) {
      return NextResponse.json(
        { success: false, error: '퀴즈를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 이미 응시했는지 확인 (하루 1회만 가능)
    const { data: existingAttempts } = await supabase
      .from('student_quiz_attempts')
      .select('id, status')
      .eq('daily_quiz_id', daily_quiz_id)
      .eq('student_id', studentId)
      .eq('status', 'completed')

    if (existingAttempts && existingAttempts.length > 0) {
      return NextResponse.json(
        { success: false, error: '이미 오늘의 퀴즈를 완료했습니다.' },
        { status: 400 }
      )
    }

    // 퀴즈 설정 조회 (보상 정보 필요)
    const { data: settings, error: settingsError } = await supabase
      .from('quiz_settings')
      .select('*')
      .eq('teacher_id', quiz.teacher_id)
      .single()

    if (settingsError || !settings) {
      return NextResponse.json(
        { success: false, error: '퀴즈 설정을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 자동 채점
    interface QuizQuestion {
      question: string
      options: string[]
      correct_answer: string
      explanation: string
    }
    const questions = quiz.questions as QuizQuestion[] // JSONB 배열
    const gradedAnswers = []
    let correctCount = 0

    for (let i = 0; i < answers.length; i++) {
      const submitAnswer = answers[i] as SubmitAnswer
      const question = questions[submitAnswer.question_index]

      if (!question) {
        console.error('❌ 문제 없음:', submitAnswer.question_index)
        continue
      }

      const isCorrect = submitAnswer.student_answer.trim() === question.correct_answer.trim()
      if (isCorrect) correctCount++

      gradedAnswers.push({
        question_index: submitAnswer.question_index,
        question: question.question,
        student_answer: submitAnswer.student_answer,
        correct_answer: question.correct_answer,
        is_correct: isCorrect,
        points_earned: isCorrect ? settings.correct_answer_reward : 0,
        explanation: question.explanation
      })
    }

    console.log('✅ 채점 완료:', {
      total: questions.length,
      correct: correctCount,
      score: `${correctCount}/${questions.length}`
    })

    // 보상 계산 (PostgreSQL 함수 사용)
    const { data: rewardData, error: rewardError } = await supabase
      .rpc('calculate_quiz_reward', {
        p_correct_answers: correctCount,
        p_total_questions: questions.length,
        p_participation_reward: settings.participation_reward,
        p_correct_answer_reward: settings.correct_answer_reward,
        p_perfect_score_bonus: settings.perfect_score_bonus
      })

    if (rewardError) {
      console.error('❌ 보상 계산 에러:', rewardError)
      return NextResponse.json(
        { success: false, error: '보상 계산 실패' },
        { status: 500 }
      )
    }

    const reward = rewardData[0]
    const totalReward = reward.total

    console.log('💰 보상 계산:', {
      participation: reward.participation,
      score: reward.score,
      bonus: reward.bonus,
      total: reward.total
    })

    // 응시 기록 저장
    const { data: attempt, error: attemptError } = await supabase
      .from('student_quiz_attempts')
      .insert({
        daily_quiz_id,
        student_id: studentId,
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        time_spent_seconds,
        total_questions: questions.length,
        correct_answers: correctCount,
        participation_reward: reward.participation,
        score_reward: reward.score,
        bonus_reward: reward.bonus,
        total_reward: totalReward,
        answers: gradedAnswers, // JSONB 배열
        status: 'completed',
        attempt_number: 1,
        reward_paid: false // 아직 지급 전
      })
      .select()
      .single()

    if (attemptError) {
      console.error('❌ 응시 기록 저장 에러:', attemptError)
      return NextResponse.json(
        { success: false, error: '응시 기록 저장 실패' },
        { status: 500 }
      )
    }

    console.log('✅ 퀴즈 제출 완료:', attempt.id)

    // 즉시 보상 지급 (선택: Cron Job에서 처리하거나 즉시 처리)
    // 여기서는 즉시 처리
    try {
      // 학생 계좌 업데이트 (checking 계좌에 입금)
      await supabase.rpc('update_account_balance', {
        p_student_id: studentId,
        p_account_type: 'checking',
        p_amount: totalReward
      })

      // 거래 기록 생성
      await supabase
        .from('transactions')
        .insert({
          from_entity: 'system',
          to_student_id: studentId,
          transaction_type: 'quiz_reward',
          amount: totalReward,
          to_account_type: 'checking',
          description: `퀴즈 보상 (${correctCount}/${questions.length} 정답)`,
          status: 'completed'
        })

      // 보상 지급 완료 표시
      await supabase
        .from('student_quiz_attempts')
        .update({
          reward_paid: true,
          reward_paid_at: new Date().toISOString()
        })
        .eq('id', attempt.id)

      console.log('💸 보상 지급 완료:', totalReward)

    } catch (paymentError) {
      console.error('❌ 보상 지급 에러:', paymentError)
      // 보상 지급 실패해도 퀴즈는 제출 완료로 처리
      // Cron Job에서 나중에 재시도
    }

    // 응답
    return NextResponse.json({
      success: true,
      data: {
        attempt_id: attempt.id,
        total_questions: questions.length,
        correct_answers: correctCount,
        score_percentage: Math.round((correctCount / questions.length) * 100),
        reward: {
          participation: reward.participation,
          score: reward.score,
          bonus: reward.bonus,
          total: totalReward
        },
        graded_answers: gradedAnswers,
        is_perfect_score: correctCount === questions.length
      },
      message: correctCount === questions.length
        ? '🎉 만점입니다! 축하합니다!'
        : `퀴즈를 완료했습니다! ${correctCount}/${questions.length} 정답`
    })

  } catch (error) {
    console.error('❌ POST /api/student/submit-quiz 에러:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
