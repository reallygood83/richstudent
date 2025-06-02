import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

// 교사용 좌석 생성 API
export async function POST() {
  try {
    const supabase = createClient();
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session_token')?.value;

    console.log('=== Creating Seats ===');

    if (!sessionToken) {
      return NextResponse.json({
        success: false,
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
        success: false,
        error: '유효하지 않은 세션입니다.'
      }, { status: 401 });
    }

    console.log('Creating seats for teacher:', teacher.teacher_id);

    // 기존 좌석 확인
    const { data: existingSeats, error: checkError } = await supabase
      .from('classroom_seats')
      .select('id')
      .eq('teacher_id', teacher.teacher_id);

    if (checkError) {
      console.error('Error checking existing seats:', checkError);
      return NextResponse.json({
        success: false,
        error: '기존 좌석 확인 실패',
        details: checkError.message
      }, { status: 500 });
    }

    if (existingSeats && existingSeats.length > 0) {
      return NextResponse.json({
        success: false,
        error: `이미 ${existingSeats.length}개의 좌석이 존재합니다.`
      }, { status: 400 });
    }

    // 30개 좌석 생성
    const seats = [];
    const basePrice = 100000; // 기본 가격 10만원

    for (let i = 1; i <= 30; i++) {
      seats.push({
        teacher_id: teacher.teacher_id,
        seat_number: i,
        current_price: basePrice,
        is_available: true,
        owner_id: null,
        purchase_price: null,
        purchased_at: null
      });
    }

    console.log('Inserting seats:', seats.length);

    // 좌석 일괄 생성
    const { data: insertedSeats, error: insertError } = await supabase
      .from('classroom_seats')
      .insert(seats)
      .select();

    if (insertError) {
      console.error('Error inserting seats:', insertError);
      return NextResponse.json({
        success: false,
        error: '좌석 생성 실패',
        details: insertError.message
      }, { status: 500 });
    }

    console.log('Successfully created seats:', insertedSeats?.length);

    return NextResponse.json({
      success: true,
      message: `${insertedSeats?.length || 0}개의 좌석이 성공적으로 생성되었습니다.`,
      data: {
        teacher_id: teacher.teacher_id,
        seats_created: insertedSeats?.length || 0,
        base_price: basePrice
      }
    });

  } catch (error) {
    console.error('Create seats error:', error);
    return NextResponse.json({
      success: false,
      error: '서버 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}