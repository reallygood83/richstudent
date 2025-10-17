// 교사 수동 퀴즈 생성 API
// POST: 오늘의 퀴즈 즉시 생성 (Gemini AI 사용)

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { generateQuizWithGemini } from '@/lib/gemini-quiz'

export async function POST(request: NextRequest) {
  try {
    await cookies()
    const supabase = createClient()

    // 교사 인증 확인
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: '로그인이 필요합니다.' },
        { status: 401 }
      )
    }

    const sessionToken = authHeader.replace('Bearer ', '')

    // 세션에서 교사 정보 조회
    const { data: sessionData, error: sessionError } = await supabase
      .from('teacher_sessions')
      .select('teacher_id')
      .eq('session_token', sessionToken)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (sessionError || !sessionData) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 세션입니다.' },
        { status: 401 }
      )
    }

    const teacherId = sessionData.teacher_id

    console.log('📝 교사 수동 퀴즈 생성 시작:', teacherId)

    // 퀴즈 설정 조회
    const { data: quizSettings, error: settingsError } = await supabase
      .from('quiz_settings')
      .select('*')
      .eq('teacher_id', teacherId)
      .single()

    if (settingsError || !quizSettings) {
      return NextResponse.json(
        { success: false, error: '퀴즈 설정을 먼저 완료해주세요.' },
        { status: 400 }
      )
    }

    if (!quizSettings.is_active) {
      return NextResponse.json(
        { success: false, error: '퀴즈가 비활성화 상태입니다.' },
        { status: 400 }
      )
    }

    // Gemini API 키 조회 (news_settings에서)
    const { data: newsSettings, error: newsSettingsError } = await supabase
      .from('news_settings')
      .select('gemini_api_key')
      .eq('teacher_id', teacherId)
      .single()

    if (newsSettingsError || !newsSettings?.gemini_api_key) {
      return NextResponse.json(
        { success: false, error: 'Gemini API 키가 설정되지 않았습니다. 뉴스 설정에서 API 키를 추가해주세요.' },
        { status: 400 }
      )
    }

    // 오늘 날짜 (한국 시간 기준)
    const now = new Date()
    const kstDate = new Date(now.getTime() + (9 * 60 * 60 * 1000))
      .toISOString()
      .split('T')[0]

    console.log('📅 퀴즈 생성 날짜 (KST):', kstDate)

    // 이미 오늘의 퀴즈가 있는지 확인
    const { data: existingQuiz } = await supabase
      .from('daily_quizzes')
      .select('id, quiz_type, questions')
      .eq('teacher_id', teacherId)
      .eq('quiz_date', kstDate)
      .single()

    if (existingQuiz) {
      console.log('⏭️ 오늘의 퀴즈가 이미 존재함')
      return NextResponse.json({
        success: true,
        data: {
          quiz: existingQuiz,
          message: '이미 오늘의 퀴즈가 생성되어 있습니다.',
          already_exists: true
        }
      })
    }

    // Gemini AI로 퀴즈 생성
    console.log('🤖 Gemini AI로 퀴즈 생성 중...')
    console.log('  - 퀴즈 타입:', quizSettings.quiz_type)
    console.log('  - 문제 수:', quizSettings.questions_per_quiz)

    const questions = await generateQuizWithGemini(
      newsSettings.gemini_api_key,
      quizSettings.quiz_type,
      quizSettings.questions_per_quiz
    )

    if (!questions || questions.length === 0) {
      console.error('❌ AI 퀴즈 생성 실패: 문제가 생성되지 않음')
      return NextResponse.json(
        { success: false, error: 'AI 퀴즈 생성에 실패했습니다.' },
        { status: 500 }
      )
    }

    console.log(`✅ ${questions.length}개 문제 생성 완료`)

    // 데이터베이스에 퀴즈 저장
    const { data: newQuiz, error: insertError } = await supabase
      .from('daily_quizzes')
      .insert({
        teacher_id: teacherId,
        quiz_date: kstDate,
        quiz_type: quizSettings.quiz_type,
        questions: questions, // JSONB array
        generated_by: 'teacher-manual',
        generated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (insertError) {
      console.error('❌ 퀴즈 DB 저장 실패:', insertError)
      return NextResponse.json(
        { success: false, error: '퀴즈 저장에 실패했습니다.' },
        { status: 500 }
      )
    }

    console.log('💾 퀴즈 DB 저장 완료:', newQuiz.id)

    return NextResponse.json({
      success: true,
      data: {
        quiz: newQuiz,
        message: '오늘의 퀴즈가 성공적으로 생성되었습니다!',
        already_exists: false
      }
    })

  } catch (error) {
    console.error('❌ POST /api/teacher/generate-quiz 에러:', error)
    return NextResponse.json(
      {
        success: false,
        error: '퀴즈 생성 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
