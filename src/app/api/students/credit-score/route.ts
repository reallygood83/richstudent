import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import { cookies } from 'next/headers'

// 학생 신용점수 조정 API
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get('session_token')?.value

    if (!sessionToken) {
      return NextResponse.json({
        success: false,
        error: '인증이 필요합니다.'
      }, { status: 401 })
    }

    // 교사 세션 확인
    const { data: teacherSession, error: sessionError } = await supabase
      .from('teacher_sessions')
      .select('teacher_id, expires_at')
      .eq('session_token', sessionToken)
      .single()

    if (sessionError || !teacherSession) {
      return NextResponse.json({
        success: false,
        error: '유효하지 않은 세션입니다.'
      }, { status: 401 })
    }

    // 세션 만료 확인
    const now = new Date()
    const expiresAt = new Date(teacherSession.expires_at)
    if (now > expiresAt) {
      return NextResponse.json({
        success: false,
        error: '세션이 만료되었습니다.'
      }, { status: 401 })
    }

    const body = await request.json()
    const { student_id, adjustment, reason } = body

    // 입력 검증
    if (!student_id || !adjustment || !reason) {
      return NextResponse.json({
        success: false,
        error: '학생 ID, 조정값, 사유는 필수입니다.'
      }, { status: 400 })
    }

    // 조정값 검증 (±5, ±10, ±15, ±20만 허용)
    const allowedAdjustments = [-20, -15, -10, -5, 5, 10, 15, 20]
    if (!allowedAdjustments.includes(adjustment)) {
      return NextResponse.json({
        success: false,
        error: '허용되지 않은 조정값입니다. (±5, ±10, ±15, ±20만 가능)'
      }, { status: 400 })
    }

    // 학생이 해당 교사 소속인지 확인
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, name, credit_score, teacher_id')
      .eq('id', student_id)
      .eq('teacher_id', teacherSession.teacher_id)
      .single()

    if (studentError || !student) {
      return NextResponse.json({
        success: false,
        error: '학생을 찾을 수 없습니다.'
      }, { status: 404 })
    }

    // 새로운 신용점수 계산 (350-850 범위 제한)
    const newCreditScore = Math.max(350, Math.min(850, student.credit_score + adjustment))
    const actualAdjustment = newCreditScore - student.credit_score

    // 신용점수 업데이트
    const { error: updateError } = await supabase
      .from('students')
      .update({
        credit_score: newCreditScore,
        updated_at: new Date().toISOString()
      })
      .eq('id', student_id)

    if (updateError) {
      console.error('Credit score update error:', updateError)
      return NextResponse.json({
        success: false,
        error: '신용점수 업데이트에 실패했습니다.'
      }, { status: 500 })
    }

    // 신용점수 변경 기록을 거래 테이블에 저장
    const { error: transactionError } = await supabase
      .from('transactions')
      .insert({
        from_student_id: student_id,
        to_student_id: null,
        amount: 0,
        transaction_type: 'credit_adjustment',
        description: `신용점수 ${adjustment > 0 ? '+' : ''}${actualAdjustment}점 조정: ${reason}`,
        status: 'completed',
        created_at: new Date().toISOString()
      })

    if (transactionError) {
      console.error('Transaction record error:', transactionError)
      // 기록 실패해도 신용점수 조정은 성공으로 처리
    }

    return NextResponse.json({
      success: true,
      message: `${student.name} 학생의 신용점수가 ${actualAdjustment > 0 ? '+' : ''}${actualAdjustment}점 조정되었습니다.`,
      data: {
        student_name: student.name,
        previous_score: student.credit_score,
        new_score: newCreditScore,
        adjustment: actualAdjustment,
        reason: reason
      }
    })

  } catch (error) {
    console.error('Credit score adjustment error:', error)
    return NextResponse.json({
      success: false,
      error: '서버 오류가 발생했습니다.'
    }, { status: 500 })
  }
}