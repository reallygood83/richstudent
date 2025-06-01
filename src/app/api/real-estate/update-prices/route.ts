import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  try {
    const supabase = createClient();
    
    console.log('Updating all seat prices...');
    
    // 1. 현재 가격 계산
    const { data: calculatedPrice, error: priceError } = await supabase
      .rpc('calculate_seat_price', { manual_student_count: null });

    if (priceError) {
      console.error('Error calculating seat price:', priceError);
      return NextResponse.json({
        success: false,
        error: 'Failed to calculate seat price',
        details: priceError.message
      }, { status: 500 });
    }

    console.log('Calculated new seat price:', calculatedPrice);

    // 2. 모든 좌석 가격 업데이트
    const { data: updateResult, error: updateError } = await supabase
      .rpc('update_all_seat_prices', { manual_student_count: null });

    if (updateError) {
      console.error('Error updating seat prices:', updateError);
      return NextResponse.json({
        success: false,
        error: 'Failed to update seat prices',
        details: updateError.message
      }, { status: 500 });
    }

    console.log('Update function result:', updateResult);

    // 3. 업데이트된 좌석들 확인
    const { data: updatedSeats, error: fetchError } = await supabase
      .from('classroom_seats')
      .select('seat_number, current_price, owner_id')
      .order('seat_number')
      .limit(5);

    if (fetchError) {
      console.error('Error fetching updated seats:', fetchError);
      // 좌석 조회 실패해도 계속 진행
    }

    // 4. 통계 계산
    const { data: totalSeats } = await supabase
      .from('classroom_seats')
      .select('id', { count: 'exact' });

    const { data: ownedSeats } = await supabase
      .from('classroom_seats')
      .select('id', { count: 'exact' })
      .not('owner_id', 'is', null);

    return NextResponse.json({
      success: true,
      message: 'Seat prices updated successfully',
      data: {
        new_price: calculatedPrice,
        total_seats: totalSeats?.length || 0,
        owned_seats: ownedSeats?.length || 0,
        available_seats: (totalSeats?.length || 0) - (ownedSeats?.length || 0),
        sample_updated_seats: updatedSeats || []
      }
    });

  } catch (error) {
    console.error('Error updating seat prices:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabase = createClient();
    
    // 현재 가격만 계산해서 반환 (업데이트는 하지 않음)
    const { data: calculatedPrice, error: priceError } = await supabase
      .rpc('calculate_seat_price', { manual_student_count: null });

    if (priceError) {
      console.error('Error calculating seat price:', priceError);
      return NextResponse.json({
        success: false,
        error: 'Failed to calculate seat price',
        details: priceError.message
      }, { status: 500 });
    }

    // 현재 데이터베이스의 좌석 가격들 확인
    const { data: currentSeats, error: fetchError } = await supabase
      .from('classroom_seats')
      .select('current_price')
      .limit(1);

    const currentDbPrice = currentSeats?.[0]?.current_price || 0;

    return NextResponse.json({
      success: true,
      data: {
        calculated_price: calculatedPrice,
        current_db_price: currentDbPrice,
        needs_update: calculatedPrice !== currentDbPrice,
        price_difference: calculatedPrice - currentDbPrice
      }
    });

  } catch (error) {
    console.error('Error checking seat prices:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}