// 학생 일일 퀴즈 조회 API
// GET: 오늘의 퀴즈 가져오기 + 응시 기록 확인

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

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

    // 학생 정보 조회 (교사 ID 필요)
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, teacher_id, name, student_code')
      .eq('id', studentId)
      .single()

    if (studentError || !student) {
      return NextResponse.json(
        { success: false, error: '학생 정보를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    console.log('👤 학생 퀴즈 조회:', student.name, student.student_code)

    // 오늘 날짜
    const today = new Date().toISOString().split('T')[0]

    // 오늘의 퀴즈 조회
    const { data: todayQuiz, error: quizError } = await supabase
      .from('daily_quizzes')
      .select('*')
      .eq('teacher_id', student.teacher_id)
      .eq('quiz_date', today)
      .single()

    if (quizError && quizError.code !== 'PGRST116') {
      console.error('❌ 퀴즈 조회 에러:', quizError)
      return NextResponse.json(
        { success: false, error: '퀴즈 조회 실패' },
        { status: 500 }
      )
    }

    // 퀴즈가 없으면
    if (!todayQuiz) {
      console.log('ℹ️ 오늘의 퀴즈 없음')
      return NextResponse.json({
        success: true,
        data: null,
        message: '오늘의 퀴즈가 아직 준비되지 않았습니다.'
      })
    }

    // 이미 응시했는지 확인
    const { data: attempts, error: attemptError } = await supabase
      .from('student_quiz_attempts')
      .select('*')
      .eq('daily_quiz_id', todayQuiz.id)
      .eq('student_id', studentId)
      .order('started_at', { ascending: false })

    if (attemptError) {
      console.error('❌ 응시 기록 조회 에러:', attemptError)
      return NextResponse.json(
        { success: false, error: '응시 기록 조회 실패' },
        { status: 500 }
      )
    }

    // 응시 횟수 확인 (하루 1회만 가능)
    const completedAttempts = attempts?.filter(a => a.status === 'completed') || []
    const hasCompleted = completedAttempts.length > 0

    // 진행 중인 응시가 있는지
    const inProgressAttempt = attempts?.find(a => a.status === 'in_progress')

    console.log('📊 응시 현황:', {
      completed: completedAttempts.length,
      inProgress: inProgressAttempt ? 'YES' : 'NO'
    })

    // 오늘 획득한 보상 계산
    const todayReward = completedAttempts.reduce((sum, a) => sum + (a.total_reward || 0), 0)

    // 응답 데이터 구성
    return NextResponse.json({
      success: true,
      data: {
        quiz: {
          id: todayQuiz.id,
          quiz_type: todayQuiz.quiz_type,
          quiz_date: todayQuiz.quiz_date,
          questions: todayQuiz.questions, // JSONB 배열
          total_questions: Array.isArray(todayQuiz.questions) ? todayQuiz.questions.length : 5
        },
        attempts: {
          completed_count: completedAttempts.length,
          has_completed: hasCompleted,
          in_progress_attempt: inProgressAttempt || null,
          today_reward: todayReward
        },
        settings: {
          max_attempts_per_day: 1, // 항상 1회
          daily_max_reward: 10000 // 항상 10,000원
        }
      }
    })

  } catch (error) {
    console.error('❌ GET /api/student/daily-quiz 에러:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
