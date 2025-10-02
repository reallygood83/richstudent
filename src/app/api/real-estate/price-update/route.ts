import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { validateSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    // 세션 토큰으로 teacher 정보 가져오기
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session_token');

    if (!sessionToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const teacher = await validateSession(sessionToken.value);

    if (!teacher) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const teacherId = teacher.id;

    // 요청 본문에서 수동 학생 수 가져오기
    let manual_student_count = null;
    try {
      const body = await request.json();
      manual_student_count = body.manual_student_count || null;
    } catch {
      // 본문이 없거나 파싱 실패해도 계속 진행
    }

    // 1. 경제 주체 ID 목록 가져오기 (정부, 은행, 증권사 - 해당 교사만)
    const { data: economicEntities } = await supabase
      .from('economic_entities')
      .select('id')
      .eq('teacher_id', teacherId)
      .in('entity_type', ['government', 'bank', 'securities']);

    const economicEntityIds = economicEntities?.map(e => e.id) || [];

    // 2. 전체 학생 자산 계산 (경제 주체 제외, 해당 교사의 학생만)
    const { data: students } = await supabase
      .from('students')
      .select('id')
      .eq('teacher_id', teacherId);

    const studentIds = students?.map(s => s.id) || [];

    if (studentIds.length === 0) {
      return NextResponse.json({
        message: 'No students found',
        current_price: 100000, // 기본 가격
        teacher_id: teacherId
      });
    }

    // 경제 주체 제외한 실제 학생 ID들
    const realStudentIds = studentIds.filter(id => !economicEntityIds.includes(id));

    let totalStudentAssets = 0;
    if (realStudentIds.length > 0) {
      const { data: accounts } = await supabase
        .from('accounts')
        .select('balance, student_id')
        .in('account_type', ['checking', 'savings', 'investment'])
        .in('student_id', realStudentIds);

      totalStudentAssets = accounts?.reduce((sum, account) => sum + (account.balance || 0), 0) || 0;
    }

    // 3. 학생 수 결정
    let studentCount = 0;
    if (manual_student_count && manual_student_count > 0) {
      studentCount = manual_student_count;
    } else {
      studentCount = realStudentIds.length;
    }

    // 4. 좌석 가격 계산: (총 학생 자산 * 0.6) / 학생 수
    let calculatedPrice = 100000; // 기본값

    if (studentCount > 0 && totalStudentAssets > 0) {
      calculatedPrice = Math.floor((totalStudentAssets * 0.6) / studentCount);
    }

    // 5. 최소 가격 보장
    if (calculatedPrice < 10000) {
      calculatedPrice = 10000;
    }

    // 6. 소유자가 없는 모든 좌석의 가격 업데이트 (해당 교사만)
    const { error: updateError } = await supabase
      .from('classroom_seats')
      .update({
        current_price: calculatedPrice,
        updated_at: new Date().toISOString()
      })
      .eq('teacher_id', teacherId)
      .is('owner_id', null);

    if (updateError) {
      console.error('Error updating seat prices:', updateError);
      return NextResponse.json({ error: 'Failed to update seat prices', details: updateError }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Seat prices updated successfully',
      current_price: calculatedPrice,
      teacher_id: teacherId,
      manual_student_count: manual_student_count,
      debug: {
        total_student_assets: totalStudentAssets,
        student_count: studentCount,
        real_student_count: realStudentIds.length,
        economic_entity_count: economicEntityIds.length
      }
    });

  } catch (error) {
    console.error('Error in price update API:', error);
    return NextResponse.json({ error: 'Internal server error', details: String(error) }, { status: 500 });
  }
}
