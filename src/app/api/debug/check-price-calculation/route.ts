import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { validateSession } from '@/lib/auth';

export async function GET() {
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

    // 1. 경제 주체 확인
    const { data: economicEntities } = await supabase
      .from('economic_entities')
      .select('*')
      .eq('teacher_id', teacherId);

    const economicEntityIds = economicEntities?.map(e => e.id) || [];

    // 2. 전체 학생 조회
    const { data: allStudents } = await supabase
      .from('students')
      .select('id, name, student_code')
      .eq('teacher_id', teacherId);

    // 3. 실제 학생 (경제 주체 제외)
    const realStudents = allStudents?.filter(s => !economicEntityIds.includes(s.id)) || [];

    // 4. 각 학생별 계좌 잔액 조회
    const studentBalances = [];
    let totalAssets = 0;

    for (const student of realStudents) {
      const { data: accounts } = await supabase
        .from('accounts')
        .select('account_type, balance')
        .eq('student_id', student.id)
        .in('account_type', ['checking', 'savings', 'investment']);

      const studentTotal = accounts?.reduce((sum, acc) => sum + (acc.balance || 0), 0) || 0;
      totalAssets += studentTotal;

      studentBalances.push({
        id: student.id,
        name: student.name,
        student_code: student.student_code,
        accounts: accounts || [],
        total_balance: studentTotal
      });
    }

    // 5. 가격 계산
    const studentCount = realStudents.length;
    let calculatedPrice = 100000;

    if (studentCount > 0 && totalAssets > 0) {
      calculatedPrice = Math.floor((totalAssets * 0.6) / studentCount);
    }

    if (calculatedPrice < 10000) {
      calculatedPrice = 10000;
    }

    // 6. 현재 좌석 가격 조회
    const { data: seats } = await supabase
      .from('classroom_seats')
      .select('current_price')
      .eq('teacher_id', teacherId)
      .is('owner_id', null)
      .limit(1);

    return NextResponse.json({
      teacher: {
        id: teacherId,
        email: teacher.email,
        session_code: teacher.session_code
      },
      economic_entities: economicEntities?.map(e => ({
        id: e.id,
        entity_type: e.entity_type,
        name: e.name
      })) || [],
      total_students: allStudents?.length || 0,
      real_students_count: realStudents.length,
      student_balances: studentBalances,
      calculation: {
        total_assets: totalAssets,
        student_count: studentCount,
        formula: `(${totalAssets} * 0.6) / ${studentCount}`,
        raw_price: studentCount > 0 ? (totalAssets * 0.6) / studentCount : 0,
        calculated_price: calculatedPrice,
        minimum_price: 10000
      },
      current_seat_price: seats?.[0]?.current_price || 0,
      price_match: seats?.[0]?.current_price === calculatedPrice
    });

  } catch (error) {
    console.error('Error checking price calculation:', error);
    return NextResponse.json({ error: 'Internal server error', details: String(error) }, { status: 500 });
  }
}
