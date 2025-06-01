import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { seat_number, student_id } = await request.json();

    if (!seat_number || !student_id) {
      return NextResponse.json(
        { error: 'seat_number and student_id are required' },
        { status: 400 }
      );
    }

    // 좌석 구매 함수 호출
    const { data, error } = await supabase.rpc('buy_seat', {
      p_student_id: student_id,
      p_seat_number: seat_number,
      p_payment_amount: 0 // 함수 내에서 가격 계산
    });

    if (error) {
      console.error('Error buying seat:', error);
      return NextResponse.json({ error: 'Failed to buy seat' }, { status: 500 });
    }

    const result = data[0];
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }

    // 거래 내역을 transactions 테이블에도 기록
    await supabase.from('transactions').insert({
      student_id,
      transaction_type: 'real_estate_purchase',
      amount: -result.final_price,
      description: `좌석 ${seat_number}번 구매`,
      created_at: new Date().toISOString()
    });

    return NextResponse.json({
      message: result.message,
      seat_id: result.seat_id,
      price: result.final_price
    });

  } catch (error) {
    console.error('Error in buy seat API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}