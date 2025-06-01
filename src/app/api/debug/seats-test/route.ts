import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = createClient();
    
    // 먼저 기존 좌석 데이터 확인
    const { data: existingSeats, error: fetchError } = await supabase
      .from('classroom_seats')
      .select('*')
      .order('seat_number');

    console.log('Existing seats:', existingSeats?.length || 0);

    if (fetchError) {
      console.error('Error fetching existing seats:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch existing seats', details: fetchError }, { status: 500 });
    }

    // 좌석이 없으면 30개 생성
    if (!existingSeats || existingSeats.length === 0) {
      console.log('No seats found, creating 30 seats...');
      
      const seatsToInsert = [];
      for (let seatNum = 1; seatNum <= 30; seatNum++) {
        const rowNum = Math.floor((seatNum - 1) / 6) + 1;
        const colNum = ((seatNum - 1) % 6) + 1;
        
        seatsToInsert.push({
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
        seats: insertedSeats 
      });
    }

    return NextResponse.json({ 
      message: 'Seats already exist',
      count: existingSeats.length,
      seats: existingSeats 
    });

  } catch (error) {
    console.error('Error in seats test:', error);
    return NextResponse.json({ error: 'Internal server error', details: error }, { status: 500 });
  }
}

export async function POST() {
  try {
    const supabase = createClient();
    
    // 기존 좌석 모두 삭제
    const { error: deleteError } = await supabase
      .from('classroom_seats')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // 모든 레코드 삭제

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
      seats: insertedSeats 
    });

  } catch (error) {
    console.error('Error recreating seats:', error);
    return NextResponse.json({ error: 'Internal server error', details: error }, { status: 500 });
  }
}