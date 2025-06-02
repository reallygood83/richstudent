import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const supabase = createClient();
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session_token')?.value;

    console.log('Fetching classroom seats...');

    // 세션 토큰 확인
    if (!sessionToken) {
      return NextResponse.json({
        error: '인증이 필요합니다.'
      }, { status: 401 });
    }

    // 교사 세션 검증
    const { data: teacher, error: sessionError } = await supabase
      .from('teacher_sessions')
      .select('teacher_id')
      .eq('session_token', sessionToken)
      .single();

    if (sessionError || !teacher) {
      return NextResponse.json({
        error: '유효하지 않은 세션입니다.'
      }, { status: 401 });
    }

    console.log('Teacher ID:', teacher.teacher_id);
    
    // 해당 교사의 좌석 데이터만 가져오기
    const { data: seats, error: seatsError } = await supabase
      .from('classroom_seats')
      .select('*')
      .eq('teacher_id', teacher.teacher_id)
      .order('seat_number');

    if (seatsError) {
      console.error('Error fetching seats:', seatsError);
      return NextResponse.json({ 
        error: 'Failed to fetch seats', 
        details: seatsError.message 
      }, { status: 500 });
    }

    if (!seats || seats.length === 0) {
      console.log('No seats found for teacher:', teacher.teacher_id);
      return NextResponse.json({ 
        seats: [],
        message: '좌석이 없습니다. 좌석을 먼저 생성해주세요.',
        teacher_id: teacher.teacher_id
      });
    }

    // 소유자 정보 별도로 가져오기 (해당 교사의 학생들만)
    const ownerIds = seats
      .filter(seat => seat.owner_id)
      .map(seat => seat.owner_id);

    let owners: Array<{ id: string; name: string }> = [];
    if (ownerIds.length > 0) {
      const { data: ownersData, error: ownersError } = await supabase
        .from('students')
        .select('id, name')
        .eq('teacher_id', teacher.teacher_id)
        .in('id', ownerIds);

      if (ownersError) {
        console.error('Error fetching owners:', ownersError);
        // 소유자 정보 실패해도 좌석 데이터는 반환
      } else {
        owners = ownersData || [];
      }
    }

    // 좌석과 소유자 정보 결합
    const seatsWithOwners = seats.map(seat => ({
      ...seat,
      owner: seat.owner_id 
        ? owners.find(owner => owner.id === seat.owner_id) || null
        : null
    }));

    console.log(`Successfully fetched ${seatsWithOwners.length} seats`);
    return NextResponse.json({ seats: seatsWithOwners });

  } catch (error) {
    console.error('Error in seats GET:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}