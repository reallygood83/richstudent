import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  try {
    const supabase = createClient();

    // 좌석 가격 업데이트 함수 호출
    const { error } = await supabase.rpc('update_all_seat_prices');

    if (error) {
      console.error('Error updating seat prices:', error);
      return NextResponse.json({ error: 'Failed to update seat prices' }, { status: 500 });
    }

    // 업데이트된 가격 조회
    const { data: currentPrice, error: priceError } = await supabase.rpc('calculate_seat_price');

    if (priceError) {
      console.error('Error calculating seat price:', priceError);
      return NextResponse.json({ error: 'Failed to calculate seat price' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Seat prices updated successfully',
      current_price: currentPrice
    });

  } catch (error) {
    console.error('Error in price update API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}