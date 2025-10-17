// 퀴즈 데이터 확인 디버깅 API
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    await cookies()
    const supabase = createClient()

    // 현재 시간 정보
    const now = new Date()
    const utcDate = now.toISOString().split('T')[0]
    const kstDate = new Date(now.getTime() + (9 * 60 * 60 * 1000)).toISOString().split('T')[0]

    console.log('🕐 현재 시간 정보:')
    console.log('  - UTC Date:', utcDate)
    console.log('  - KST Date:', kstDate)
    console.log('  - ISO String:', now.toISOString())

    // 모든 daily_quizzes 조회
    const { data: allQuizzes, error: quizError } = await supabase
      .from('daily_quizzes')
      .select('*')
      .order('quiz_date', { ascending: false })
      .limit(10)

    if (quizError) {
      console.error('❌ 퀴즈 조회 에러:', quizError)
      return NextResponse.json({
        success: false,
        error: quizError.message
      }, { status: 500 })
    }

    console.log('📋 데이터베이스의 퀴즈 목록:')
    allQuizzes?.forEach((quiz, index) => {
      console.log(`  ${index + 1}. ID: ${quiz.id}, Date: ${quiz.quiz_date}, Teacher: ${quiz.teacher_id}`)
    })

    // 모든 students 조회
    const { data: allStudents, error: studentError } = await supabase
      .from('students')
      .select('id, name, student_code, teacher_id')
      .limit(10)

    if (studentError) {
      console.error('❌ 학생 조회 에러:', studentError)
    } else {
      console.log('👥 데이터베이스의 학생 목록:')
      allStudents?.forEach((student, index) => {
        console.log(`  ${index + 1}. ${student.name} (${student.student_code}), Teacher: ${student.teacher_id}`)
      })
    }

    // 날짜별 퀴즈 개수
    const utcQuizzes = allQuizzes?.filter(q => q.quiz_date === utcDate) || []
    const kstQuizzes = allQuizzes?.filter(q => q.quiz_date === kstDate) || []

    return NextResponse.json({
      success: true,
      data: {
        time: {
          current_utc: now.toISOString(),
          utc_date: utcDate,
          kst_date: kstDate
        },
        quizzes: {
          total: allQuizzes?.length || 0,
          today_utc: utcQuizzes.length,
          today_kst: kstQuizzes.length,
          list: allQuizzes?.map(q => ({
            id: q.id,
            teacher_id: q.teacher_id,
            quiz_date: q.quiz_date,
            quiz_type: q.quiz_type,
            question_count: Array.isArray(q.questions) ? q.questions.length : 0,
            generated_at: q.generated_at
          }))
        },
        students: {
          total: allStudents?.length || 0,
          list: allStudents?.map(s => ({
            id: s.id,
            name: s.name,
            student_code: s.student_code,
            teacher_id: s.teacher_id
          }))
        }
      }
    })

  } catch (error) {
    console.error('❌ 디버그 API 에러:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
