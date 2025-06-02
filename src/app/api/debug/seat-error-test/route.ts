import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

// 좌석 API 에러 진단용 디버그 API
export async function GET() {
  try {
    const supabase = createClient();
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session_token')?.value;

    console.log('=== Seat Error Debug ===');
    console.log('Session token exists:', !!sessionToken);

    if (!sessionToken) {
      return NextResponse.json({
        success: false,
        error: '세션 토큰이 없습니다.',
        step: 'session_token_check'
      });
    }

    // 교사 세션 검증
    console.log('Checking teacher session...');
    const { data: teacher, error: sessionError } = await supabase
      .from('teacher_sessions')
      .select('teacher_id')
      .eq('session_token', sessionToken)
      .single();

    console.log('Session query result:', { teacher, sessionError });

    if (sessionError || !teacher) {
      return NextResponse.json({
        success: false,
        error: '세션 검증 실패',
        step: 'session_validation',
        sessionError: sessionError?.message,
        teacher
      });
    }

    console.log('Teacher ID:', teacher.teacher_id);

    // classroom_seats 테이블 존재 여부 확인
    console.log('Checking classroom_seats table...');
    const { data: tableCheck, error: tableError } = await supabase
      .from('classroom_seats')
      .select('count', { count: 'exact' })
      .limit(0);

    console.log('Table check result:', { tableCheck, tableError });

    if (tableError) {
      return NextResponse.json({
        success: false,
        error: 'classroom_seats 테이블 접근 실패',
        step: 'table_check',
        tableError: tableError.message
      });
    }

    // 해당 교사의 좌석 데이터 확인
    console.log('Checking teacher seats...');
    const { data: seats, error: seatsError } = await supabase
      .from('classroom_seats')
      .select('id, seat_number, teacher_id, owner_id')
      .eq('teacher_id', teacher.teacher_id)
      .limit(5);

    console.log('Seats query result:', { seats, seatsError });

    if (seatsError) {
      return NextResponse.json({
        success: false,
        error: '좌석 데이터 조회 실패',
        step: 'seats_query',
        seatsError: seatsError.message
      });
    }

    // 전체 좌석 수 확인 (교사 필터링 없이)
    const { data: allSeats, error: allSeatsError } = await supabase
      .from('classroom_seats')
      .select('id, teacher_id', { count: 'exact' })
      .limit(0);

    if (allSeatsError) {
      console.warn('All seats query error:', allSeatsError.message);
    }

    return NextResponse.json({
      success: true,
      debug: {
        teacher_id: teacher.teacher_id,
        teacher_seats_count: seats?.length || 0,
        teacher_seats: seats || [],
        total_seats_count: allSeats?.length || 0,
        total_seats_error: allSeatsError?.message || null,
        table_accessible: !tableError,
        step: 'complete'
      }
    });

  } catch (error) {
    console.error('Debug API error:', error);
    return NextResponse.json({
      success: false,
      error: '서버 오류',
      step: 'catch_block',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}