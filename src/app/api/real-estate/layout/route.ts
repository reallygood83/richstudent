import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { validateSession } from '@/lib/auth';

interface SeatLayoutConfig {
  total_seats: number;
  layout_type: 'auto' | 'manual';
  rows: Array<{ row: number; seats: number }>;
}

// GET: 현재 좌석 배치 설정 조회
export async function GET() {
  try {
    const supabase = createClient();

    // 세션 인증
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

    // 현재 좌석 배치 설정 조회
    const { data, error } = await supabase
      .from('teachers')
      .select('seat_layout_config')
      .eq('id', teacherId)
      .single();

    if (error) {
      console.error('Error fetching seat layout:', error);
      return NextResponse.json({ error: 'Failed to fetch seat layout' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      layout_config: data.seat_layout_config || {
        total_seats: 30,
        layout_type: 'auto',
        rows: [
          { row: 1, seats: 6 },
          { row: 2, seats: 6 },
          { row: 3, seats: 6 },
          { row: 4, seats: 6 },
          { row: 5, seats: 6 }
        ]
      }
    });

  } catch (error) {
    console.error('Error in GET /api/real-estate/layout:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: 좌석 배치 설정 업데이트 및 좌석 재생성
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    // 세션 인증
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

    // 요청 본문 파싱
    const layoutConfig: SeatLayoutConfig = await request.json();

    // 유효성 검증
    if (!layoutConfig.rows || layoutConfig.rows.length === 0) {
      return NextResponse.json({ error: 'Invalid layout configuration' }, { status: 400 });
    }

    const totalSeats = layoutConfig.rows.reduce((sum, row) => sum + row.seats, 0);
    if (totalSeats !== layoutConfig.total_seats) {
      return NextResponse.json({ error: 'Total seats mismatch' }, { status: 400 });
    }

    // 1. 좌석 배치 설정 업데이트
    const { error: updateError } = await supabase
      .from('teachers')
      .update({
        seat_layout_config: layoutConfig
      })
      .eq('id', teacherId);

    if (updateError) {
      console.error('Error updating seat layout:', updateError);
      return NextResponse.json({
        error: 'Failed to update seat layout',
        details: updateError.message
      }, { status: 500 });
    }

    // 2. 기존 좌석 삭제 (소유자가 없는 좌석만)
    const { error: deleteError } = await supabase
      .from('classroom_seats')
      .delete()
      .eq('teacher_id', teacherId)
      .is('owner_id', null);

    if (deleteError) {
      console.error('Error deleting old seats:', deleteError);
    }

    // 3. 새로운 좌석 생성 (칠판 기준: row=앞뒤, column=좌우)
    let seatNumber = 1;
    const newSeats = [];

    for (const rowConfig of layoutConfig.rows) {
      for (let col = 1; col <= rowConfig.seats; col++) {
        newSeats.push({
          teacher_id: teacherId,
          seat_number: seatNumber,
          row_position: rowConfig.row,  // 칠판에서 뒤로 가는 행 (앞줄=1, 뒷줄=2,3,4...)
          column_position: col,          // 칠판과 평행한 열 (왼쪽=1, 오른쪽=2,3,4...)
          current_price: 100000, // 기본 가격 10만원
          owner_id: null,
          purchase_price: 0,
          purchase_date: null,
          is_available: true
        });
        seatNumber++;
      }
    }

    const { error: insertError } = await supabase
      .from('classroom_seats')
      .insert(newSeats);

    if (insertError) {
      console.error('Error creating new seats:', insertError);
      return NextResponse.json({
        error: 'Failed to create new seats',
        details: insertError.message,
        hint: insertError.hint
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: '좌석 배치가 성공적으로 업데이트되었습니다.',
      total_created: newSeats.length,
      layout_config: layoutConfig
    });

  } catch (error) {
    console.error('Error in POST /api/real-estate/layout:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE: 특정 좌석 삭제 (소유자가 없는 좌석만)
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createClient();

    // 세션 인증
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

    // 요청 본문에서 seat_number 가져오기
    const { seat_number } = await request.json();

    if (!seat_number) {
      return NextResponse.json({ error: 'seat_number is required' }, { status: 400 });
    }

    // 좌석 존재 여부 및 소유자 확인
    const { data: seat, error: fetchError } = await supabase
      .from('classroom_seats')
      .select('owner_id')
      .eq('teacher_id', teacherId)
      .eq('seat_number', seat_number)
      .single();

    if (fetchError || !seat) {
      return NextResponse.json({ error: '좌석을 찾을 수 없습니다.' }, { status: 404 });
    }

    if (seat.owner_id) {
      return NextResponse.json({
        error: '소유자가 있는 좌석은 삭제할 수 없습니다.'
      }, { status: 400 });
    }

    // 좌석 삭제
    const { error: deleteError } = await supabase
      .from('classroom_seats')
      .delete()
      .eq('teacher_id', teacherId)
      .eq('seat_number', seat_number)
      .is('owner_id', null);

    if (deleteError) {
      console.error('Error deleting seat:', deleteError);
      return NextResponse.json({ error: 'Failed to delete seat' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `좌석 ${seat_number}번이 삭제되었습니다.`,
      deleted_seat: seat_number
    });

  } catch (error) {
    console.error('Error in DELETE /api/real-estate/layout:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
