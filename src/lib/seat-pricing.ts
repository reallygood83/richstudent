import { createClient } from '@/lib/supabase/server';

/**
 * 좌석 가격 자동 계산 및 업데이트
 * @param teacherId - 교사 ID (멀티테넌트 격리)
 * @param manualStudentCount - 수동 학생 수 (선택사항)
 * @returns 계산된 좌석 가격
 */
export async function updateSeatPrices(teacherId: string, manualStudentCount?: number): Promise<number> {
  const supabase = createClient();

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
    // 학생이 없으면 기본 가격 유지
    return 100000;
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
  if (manualStudentCount && manualStudentCount > 0) {
    studentCount = manualStudentCount;
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
    throw new Error('Failed to update seat prices');
  }

  return calculatedPrice;
}
