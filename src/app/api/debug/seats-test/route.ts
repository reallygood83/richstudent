import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const supabase = createClient();

    // 세션에서 teacher_id 가져오기
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');

    if (!sessionCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const session = JSON.parse(sessionCookie.value);
    const teacherId = session.teacherId;

    if (!teacherId) {
      return NextResponse.json({ error: 'Teacher ID not found in session' }, { status: 401 });
    }

    // 먼저 기존 좌석 데이터 확인 (해당 교사의 좌석만)
    const { data: existingSeats, error: fetchError } = await supabase
      .from('classroom_seats')
      .select('*')
      .eq('teacher_id', teacherId)
      .order('seat_number');

    console.log('Existing seats:', existingSeats?.length || 0);

    if (fetchError) {
      console.error('Error fetching existing seats:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch existing seats', details: fetchError }, { status: 500 });
    }

    // 좌석이 없으면 30개 생성
    if (!existingSeats || existingSeats.length === 0) {
      console.log('No seats found, creating 30 seats for teacher:', teacherId);

      const seatsToInsert = [];
      for (let seatNum = 1; seatNum <= 30; seatNum++) {
        const rowNum = Math.floor((seatNum - 1) / 6) + 1;
        const colNum = ((seatNum - 1) % 6) + 1;

        seatsToInsert.push({
          teacher_id: teacherId,
          seat_number: seatNum,
          row_position: rowNum,
          column_position: colNum,
          current_price: 100000,
          is_available: true
        });
      }

      const { data: insertedSeats, error: insertError } = await supabase
        .from('classroom_seats')
        .insert(seatsToInsert)
        .select();

      if (insertError) {
        console.error('Error inserting seats:', insertError);
        return NextResponse.json({ error: 'Failed to insert seats', details: insertError }, { status: 500 });
      }

      return NextResponse.json({
        message: 'Created 30 seats successfully',
        teacher_id: teacherId,
        seats: insertedSeats
      });
    }

    return NextResponse.json({
      message: 'Seats already exist',
      teacher_id: teacherId,
      count: existingSeats.length,
      seats: existingSeats
    });

  } catch (error) {
    console.error('Error in seats test:', error);
    return NextResponse.json({ error: 'Internal server error', details: String(error) }, { status: 500 });
  }
}

export async function POST() {
  try {
    const supabase = createClient();

    // 세션에서 teacher_id 가져오기
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');

    if (!sessionCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const session = JSON.parse(sessionCookie.value);
    const teacherId = session.teacherId;

    if (!teacherId) {
      return NextResponse.json({ error: 'Teacher ID not found in session' }, { status: 401 });
    }

    // 기존 좌석 모두 삭제 (해당 교사의 좌석만)
    const { error: deleteError } = await supabase
      .from('classroom_seats')
      .delete()
      .eq('teacher_id', teacherId);

    if (deleteError) {
      console.error('Error deleting seats:', deleteError);
      return NextResponse.json({ error: 'Failed to delete seats', details: deleteError }, { status: 500 });
    }

    // 30개 좌석 새로 생성
    const seatsToInsert = [];
    for (let seatNum = 1; seatNum <= 30; seatNum++) {
      const rowNum = Math.floor((seatNum - 1) / 6) + 1;
      const colNum = ((seatNum - 1) % 6) + 1;

      seatsToInsert.push({
        teacher_id: teacherId,
        seat_number: seatNum,
        row_position: rowNum,
        column_position: colNum,
        current_price: 100000,
        is_available: true
      });
    }

    const { data: insertedSeats, error: insertError } = await supabase
      .from('classroom_seats')
      .insert(seatsToInsert)
      .select();

    if (insertError) {
      console.error('Error inserting seats:', insertError);
      return NextResponse.json({ error: 'Failed to insert seats', details: insertError }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Recreated 30 seats successfully',
      teacher_id: teacherId,
      seats: insertedSeats
    });

  } catch (error) {
    console.error('Error recreating seats:', error);
    return NextResponse.json({ error: 'Internal server error', details: String(error) }, { status: 500 });
  }
}
