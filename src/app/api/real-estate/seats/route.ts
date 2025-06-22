import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const supabase = createClient();
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session_token')?.value;
    const studentToken = cookieStore.get('student_session_token')?.value;

    console.log('Fetching classroom seats...');

    let teacherId: string | null = null;

    if (sessionToken) {
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

      teacherId = teacher.teacher_id;
      console.log('Teacher ID (teacher session):', teacherId);
    } else if (studentToken) {
      // 학생 세션 검증
      const { data: sessionData, error: sessionError } = await supabase
        .from('student_sessions')
        .select('student_id, expires_at')
        .eq('session_token', studentToken)
        .single();

      if (sessionError || !sessionData) {
        return NextResponse.json({
          error: '유효하지 않은 세션입니다.'
        }, { status: 401 });
      }

      const now = new Date();
      const expiresAt = new Date(sessionData.expires_at);
      if (now > expiresAt) {
        // 만료된 세션 삭제
        await supabase
          .from('student_sessions')
          .delete()
          .eq('session_token', studentToken);

        return NextResponse.json({
          error: '세션이 만료되었습니다. 다시 로그인해주세요.'
        }, { status: 401 });
      }

      // 학생의 teacher_id 조회
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('teacher_id')
        .eq('id', sessionData.student_id)
        .single();

      if (studentError || !student) {
        return NextResponse.json({
          error: '학생 정보를 찾을 수 없습니다.'
        }, { status: 401 });
      }

      teacherId = student.teacher_id;
      console.log('Teacher ID (student session):', teacherId);
    } else {
      return NextResponse.json({
        error: '인증이 필요합니다.'
      }, { status: 401 });
    }
    
    // 해당 교사의 좌석 데이터 가져오기 (teacher_id 컬럼 누락 대응)
    const { data: seats, error: seatsError } = await supabase
      .from('classroom_seats')
      .select('*')
      .eq('teacher_id', teacherId)
      .order('seat_number');

    // teacher_id 컬럼이 없는 경우의 에러 처리
    if (seatsError && seatsError.message?.includes('teacher_id does not exist')) {
      console.warn('classroom_seats 테이블에 teacher_id 컬럼이 없습니다.');
      console.log('임시로 모든 좌석을 조회합니다. FIX_CLASSROOM_SEATS_TEACHER_ID.sql을 실행하세요.');
      
      // 모든 좌석 가져오기 (임시)
      const { data: allSeats, error: allSeatsError } = await supabase
        .from('classroom_seats')
        .select('*')
        .order('seat_number');
        
      if (allSeatsError) {
        console.error('Error fetching all seats:', allSeatsError);
        return NextResponse.json({ 
          error: 'Failed to fetch seats', 
          details: allSeatsError.message 
        }, { status: 500 });
      }
      
      // 좌석이 없으면 빈 배열 반환
      if (!allSeats || allSeats.length === 0) {
        return NextResponse.json({ 
          seats: [],
          message: '좌석이 없습니다. 좌석을 먼저 생성해주세요.',
          warning: 'teacher_id 컬럼이 없어 데이터 격리가 되지 않습니다.'
        });
      }
      
      return NextResponse.json({ 
        seats: allSeats,
        warning: 'teacher_id 컬럼이 없어 모든 교사의 좌석이 표시됩니다. FIX_CLASSROOM_SEATS_TEACHER_ID.sql을 실행하세요.'
      });
    }

    if (seatsError) {
      console.error('Error fetching seats:', seatsError);
      return NextResponse.json({ 
        error: 'Failed to fetch seats', 
        details: seatsError.message 
      }, { status: 500 });
    }

    if (!seats || seats.length === 0) {
      console.log('No seats found for teacher:', teacherId);
      return NextResponse.json({
        seats: [],
        message: '좌석이 없습니다. 좌석을 먼저 생성해주세요.',
        teacher_id: teacherId
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
        .eq('teacher_id', teacherId)
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