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

    // 좌석 판매 함수 호출 (teacher_id 필수 전달)
    const { data, error } = await supabase.rpc('sell_seat', {
      p_teacher_id: studentData.teacher_id,
      p_student_id: student_id,
      p_seat_number: seat_number
    });

    if (error) {
      console.error('Error selling seat:', error);
      return NextResponse.json({ error: 'Failed to sell seat' }, { status: 500 });
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
      transaction_type: 'real_estate_sale',
      amount: result.sale_price,
      description: `좌석 ${seat_number}번 판매`,
      created_at: new Date().toISOString()
    });

    return NextResponse.json({
      message: result.message,
      sale_price: result.sale_price
    });

  } catch (error) {
    console.error('Error in sell seat API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}