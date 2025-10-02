import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { updateSeatPrices } from '@/lib/seat-pricing';

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

    // 학생의 teacher_id 가져오기 (멀티테넌트 격리 필수!)
    const { data: studentData, error: studentError } = await supabase
      .from('students')
      .select('teacher_id')
      .eq('id', student_id)
      .single();

    if (studentError || !studentData) {
      return NextResponse.json(
        { error: '학생 정보를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 1. 좌석 정보 조회 (구매 가능한지 확인)
    const { data: seat, error: seatError } = await supabase
      .from('classroom_seats')
      .select('id, current_price, owner_id, is_available')
      .eq('seat_number', seat_number)
      .is('owner_id', null)
      .eq('is_available', true)
      .single();

    if (seatError || !seat) {
      return NextResponse.json(
        { error: '해당 좌석을 구매할 수 없습니다.' },
        { status: 400 }
      );
    }

    // 2. 학생 잔액 확인 (당좌계좌)
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('balance')
      .eq('student_id', student_id)
      .eq('account_type', 'checking')
      .single();

    if (accountError || !account) {
      return NextResponse.json(
        { error: '계좌 정보를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    if (account.balance < seat.current_price) {
      return NextResponse.json(
        { error: '잔액이 부족합니다.', required: seat.current_price, current: account.balance },
        { status: 400 }
      );
    }

    // 3. 좌석 구매 처리
    const { error: updateSeatError } = await supabase
      .from('classroom_seats')
      .update({
        owner_id: student_id,
        purchase_price: seat.current_price,
        purchase_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', seat.id);

    if (updateSeatError) {
      console.error('Error updating seat:', updateSeatError);
      return NextResponse.json(
        { error: '좌석 구매 처리 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    // 4. 학생 잔액 차감 (당좌계좌)
    const { error: updateBalanceError } = await supabase
      .from('accounts')
      .update({
        balance: account.balance - seat.current_price
      })
      .eq('student_id', student_id)
      .eq('account_type', 'checking');

    if (updateBalanceError) {
      console.error('Error updating balance:', updateBalanceError);
      // 롤백: 좌석 소유권 제거
      await supabase
        .from('classroom_seats')
        .update({
          owner_id: null,
          purchase_price: 0,
          purchase_date: null
        })
        .eq('id', seat.id);

      return NextResponse.json(
        { error: '잔액 차감 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    // 5. 거래 기록 저장
    await supabase.from('seat_transactions').insert({
      seat_id: seat.id,
      seat_number: seat_number,
      buyer_id: student_id,
      transaction_price: seat.current_price,
      transaction_type: 'buy'
    });

    // 6. transactions 테이블에도 기록
    await supabase.from('transactions').insert({
      student_id,
      transaction_type: 'real_estate_purchase',
      amount: -seat.current_price,
      description: `좌석 ${seat_number}번 구매`,
      created_at: new Date().toISOString()
    });

    // 7. 좌석 가격 자동 업데이트 (구매 후 즉시 반영)
    try {
      await updateSeatPrices(studentData.teacher_id);
      console.log('✅ Seat prices auto-updated after purchase');
    } catch (priceUpdateError) {
      console.error('⚠️ Error auto-updating prices:', priceUpdateError);
      // 가격 업데이트 실패는 무시 (다음 업데이트 때 반영됨)
    }

    return NextResponse.json({
      message: '좌석을 성공적으로 구매했습니다.',
      seat_id: seat.id,
      price: seat.current_price
    });

  } catch (error) {
    console.error('Error in buy seat API:', error);
    return NextResponse.json({ error: 'Internal server error', details: String(error) }, { status: 500 });
  }
}
