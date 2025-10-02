import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

async function calculateCurrentSeatPrice(supabase: ReturnType<typeof createClient>) {
  // 경제 주체 ID 목록 가져오기
  const { data: economicEntities } = await supabase
    .from('economic_entities')
    .select('id')
    .in('entity_type', ['government', 'bank', 'securities']);

  const economicEntityIds = economicEntities?.map(e => e.id) || [];

  // 전체 학생 자산 계산
  const { data: accounts } = await supabase
    .from('accounts')
    .select('balance, student_id')
    .in('account_type', ['checking', 'savings', 'investment'])
    .not('student_id', 'in', `(${economicEntityIds.join(',')})`);

  const totalStudentAssets = accounts?.reduce((sum, account) => sum + (account.balance || 0), 0) || 0;

  // 학생 수 계산
  const { data: students } = await supabase
    .from('students')
    .select('id')
    .not('id', 'in', `(${economicEntityIds.join(',')})`);

  const studentCount = students?.length || 0;

  // 가격 계산
  let calculatedPrice = 100000;
  if (studentCount > 0 && totalStudentAssets > 0) {
    calculatedPrice = Math.floor((totalStudentAssets * 0.6) / studentCount);
  }

  // 최소 가격 보장
  if (calculatedPrice < 10000) {
    calculatedPrice = 10000;
  }

  return calculatedPrice;
}

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

    // 1. 소유 좌석 확인
    const { data: seat, error: seatError } = await supabase
      .from('classroom_seats')
      .select('id, current_price, purchase_price, owner_id, is_available')
      .eq('seat_number', seat_number)
      .eq('owner_id', student_id)
      .eq('is_available', true)
      .single();

    if (seatError || !seat) {
      return NextResponse.json(
        { error: '소유하지 않은 좌석입니다.' },
        { status: 400 }
      );
    }

    // 2. 현재 시장 가격 계산
    const currentMarketPrice = await calculateCurrentSeatPrice(supabase);

    // 3. 좌석 판매 처리 (소유권 해제)
    const { error: updateSeatError } = await supabase
      .from('classroom_seats')
      .update({
        owner_id: null,
        current_price: currentMarketPrice,
        purchase_price: 0,
        purchase_date: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', seat.id);

    if (updateSeatError) {
      console.error('Error updating seat:', updateSeatError);
      return NextResponse.json(
        { error: '좌석 판매 처리 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    // 4. 학생 당좌계좌 잔액 가져오기
    const { data: sellerAccount, error: accountError } = await supabase
      .from('accounts')
      .select('balance')
      .eq('student_id', student_id)
      .eq('account_type', 'checking')
      .single();

    if (accountError || !sellerAccount) {
      console.error('Error fetching seller account:', accountError);
      // 롤백: 좌석 소유권 복구
      await supabase
        .from('classroom_seats')
        .update({
          owner_id: student_id,
          purchase_price: seat.purchase_price,
          current_price: seat.current_price
        })
        .eq('id', seat.id);

      return NextResponse.json(
        { error: '판매자 계좌 정보를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 5. 학생에게 판매 대금 지급 (당좌계좌)
    const { error: updateBalanceError } = await supabase
      .from('accounts')
      .update({
        balance: sellerAccount.balance + currentMarketPrice
      })
      .eq('student_id', student_id)
      .eq('account_type', 'checking');

    if (updateBalanceError) {
      console.error('Error updating balance:', updateBalanceError);
      // 롤백: 좌석 소유권 복구
      await supabase
        .from('classroom_seats')
        .update({
          owner_id: student_id,
          purchase_price: seat.purchase_price,
          current_price: seat.current_price
        })
        .eq('id', seat.id);

      return NextResponse.json(
        { error: '판매 대금 지급 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    // 6. 거래 기록 저장
    await supabase.from('seat_transactions').insert({
      seat_id: seat.id,
      seat_number: seat_number,
      seller_id: student_id,
      transaction_price: currentMarketPrice,
      transaction_type: 'sell'
    });

    // 7. transactions 테이블에도 기록
    await supabase.from('transactions').insert({
      student_id,
      transaction_type: 'real_estate_sale',
      amount: currentMarketPrice,
      description: `좌석 ${seat_number}번 판매`,
      created_at: new Date().toISOString()
    });

    // 8. 좌석 가격 자동 업데이트 (백그라운드로 호출)
    try {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/real-estate/price-update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
    } catch (priceUpdateError) {
      console.error('Error updating prices in background:', priceUpdateError);
      // 가격 업데이트 실패는 무시
    }

    return NextResponse.json({
      message: '좌석을 성공적으로 판매했습니다.',
      sale_price: currentMarketPrice
    });

  } catch (error) {
    console.error('Error in sell seat API:', error);
    return NextResponse.json({ error: 'Internal server error', details: String(error) }, { status: 500 });
  }
}
