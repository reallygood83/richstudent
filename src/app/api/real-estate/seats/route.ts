import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const supabase = createClient();
    const cookieStore = await cookies();

    console.log('=== Fetching classroom seats ===');
    console.log('All cookies:', cookieStore.getAll().map(c => ({ name: c.name, value: c.value.substring(0, 10) + '...' })));

    // 교사 세션 또는 학생 세션 확인
    const sessionToken = cookieStore.get('session_token')?.value;
    const studentToken = cookieStore.get('student_session_token')?.value; // Fixed: was 'student_token'

    console.log('Session token exists:', !!sessionToken);
    console.log('Student token exists:', !!studentToken);

    let teacherId: string | null = null;

    // 1. 교사 세션 확인
    if (sessionToken) {
      const { data: teacher, error: sessionError } = await supabase
        .from('teacher_sessions')
        .select('teacher_id')
        .eq('session_token', sessionToken)
        .single();

      if (!sessionError && teacher) {
        teacherId = teacher.teacher_id;
        console.log('Teacher session detected, Teacher ID:', teacherId);
      }
    }

    // 2. 학생 세션 확인 (교사 세션이 없는 경우)
    if (!teacherId && studentToken) {
      console.log('Checking student session with token...');
      const { data: studentSession, error: studentError } = await supabase
        .from('student_sessions')
        .select('student_id')
        .eq('session_token', studentToken)
        .single();

      console.log('Student session query result:', { studentSession, error: studentError });

      if (!studentError && studentSession) {
        console.log('Found student session, fetching student data...');
        // 학생의 teacher_id 가져오기
        const { data: student, error: studentDataError } = await supabase
          .from('students')
          .select('teacher_id')
          .eq('id', studentSession.student_id)
          .single();

        console.log('Student data query result:', { student, error: studentDataError });

        if (!studentDataError && student) {
          teacherId = student.teacher_id;
          console.log('✅ Student session detected, Teacher ID:', teacherId);
        } else {
          console.error('❌ Failed to get student teacher_id:', studentDataError);
        }
      } else {
        console.error('❌ Student session not found or error:', studentError);
      }
    }

    // 3. 인증 실패
    if (!teacherId) {
      console.error('❌ Authentication failed - no teacherId found');
      console.error('Debug info:', {
        hasSessionToken: !!sessionToken,
        hasStudentToken: !!studentToken,
        teacherId
      });
      return NextResponse.json({
        error: '인증이 필요합니다.',
        debug: {
          hasSessionToken: !!sessionToken,
          hasStudentToken: !!studentToken
        }
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
