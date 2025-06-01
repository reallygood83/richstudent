import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // 요청 본문에서 수동 학생 수 가져오기
    let manual_student_count = null;
    try {
      const body = await request.json();
      manual_student_count = body.manual_student_count || null;
    } catch {
      // 본문이 없거나 파싱 실패해도 계속 진행
    }

    // 좌석 가격 업데이트 함수 호출 (수동 학생 수 전달)
    const { error } = await supabase.rpc('update_all_seat_prices', {
      manual_student_count
    });

    if (error) {
      console.error('Error updating seat prices:', error);
      return NextResponse.json({ error: 'Failed to update seat prices' }, { status: 500 });
    }

    // 업데이트된 가격 조회 (수동 학생 수 전달)
    const { data: currentPrice, error: priceError } = await supabase.rpc('calculate_seat_price', {
      manual_student_count
    });

    if (priceError) {
      console.error('Error calculating seat price:', priceError);
      return NextResponse.json({ error: 'Failed to calculate seat price' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Seat prices updated successfully',
      current_price: currentPrice,
      manual_student_count
    });

  } catch (error) {
    console.error('Error in price update API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}