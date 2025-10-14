import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { validateSession } from '@/lib/auth';

/**
 * 현재 좌석 시세를 실시간으로 계산하여 반환
 * 구매 가능한 좌석이 없어도 현재 통화량을 기반으로 시세를 계산
 */
export async function GET() {
  try {
    const supabase = createClient();

    // 세션 토큰으로 teacher 정보 가져오기
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session_token')?.value;
    const studentToken = cookieStore.get('student_session_token')?.value;

    let teacherId: string | null = null;

    // 1. 교사 세션 확인
    if (sessionToken) {
      const teacher = await validateSession(sessionToken);
      if (teacher) {
        teacherId = teacher.id;
      }
    }

    // 2. 학생 세션 확인
    if (!teacherId && studentToken) {
      const { data: studentSession } = await supabase
        .from('student_sessions')
        .select('student_id')
        .eq('session_token', studentToken)
        .single();

      if (studentSession) {
        const { data: student } = await supabase
          .from('students')
          .select('teacher_id')
          .eq('id', studentSession.student_id)
          .single();

        if (student) {
          teacherId = student.teacher_id;
        }
      }
    }

    if (!teacherId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // 3. 경제 주체 ID 목록 가져오기 (정부, 은행, 증권사 제외)
    const { data: economicEntities } = await supabase
      .from('economic_entities')
      .select('id')
      .eq('teacher_id', teacherId)
      .in('entity_type', ['government', 'bank', 'securities']);

    const economicEntityIds = economicEntities?.map(e => e.id) || [];

    // 4. 해당 교사의 실제 학생들만 조회
    const { data: students } = await supabase
      .from('students')
      .select('id')
      .eq('teacher_id', teacherId);

    const studentIds = students?.map(s => s.id) || [];
    const realStudentIds = studentIds.filter(id => !economicEntityIds.includes(id));

    if (realStudentIds.length === 0) {
      return NextResponse.json({
        current_price: 100000, // 기본 가격
        message: 'No students found'
      });
    }

    // 5. 전체 학생 자산 계산
    const { data: accounts } = await supabase
      .from('accounts')
      .select('balance, student_id')
      .in('account_type', ['checking', 'savings', 'investment'])
      .in('student_id', realStudentIds);

    const totalStudentAssets = accounts?.reduce((sum, account) => sum + (account.balance || 0), 0) || 0;

    // 6. 좌석 가격 계산: (총 학생 자산 * 0.6) / 학생 수
    let calculatedPrice = 100000; // 기본값

    if (realStudentIds.length > 0 && totalStudentAssets > 0) {
      calculatedPrice = Math.floor((totalStudentAssets * 0.6) / realStudentIds.length);
    }

    // 7. 최소 가격 보장
    if (calculatedPrice < 10000) {
      calculatedPrice = 10000;
    }

    return NextResponse.json({
      current_price: calculatedPrice,
      total_assets: totalStudentAssets,
      student_count: realStudentIds.length,
      formula: '(총 학생 자산 × 60%) ÷ 학생 수'
    });

  } catch (error) {
    console.error('Error calculating current price:', error);
    return NextResponse.json(
      { error: 'Failed to calculate current price' },
      { status: 500 }
    );
  }
}
