import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = createClient();
    
    console.log('Fetching classroom seats...');
    
    // 먼저 좌석 데이터만 가져오기
    const { data: seats, error: seatsError } = await supabase
      .from('classroom_seats')
      .select('*')
      .order('seat_number');

    if (seatsError) {
      console.error('Error fetching seats:', seatsError);
      return NextResponse.json({ 
        error: 'Failed to fetch seats', 
        details: seatsError.message 
      }, { status: 500 });
    }

    if (!seats || seats.length === 0) {
      console.log('No seats found, returning empty array');
      return NextResponse.json({ seats: [] });
    }

    // 소유자 정보 별도로 가져오기
    const ownerIds = seats
      .filter(seat => seat.owner_id)
      .map(seat => seat.owner_id);

    let owners: any[] = [];
    if (ownerIds.length > 0) {
      const { data: ownersData, error: ownersError } = await supabase
        .from('students')
        .select('id, name')
        .in('id', ownerIds);

      if (ownersError) {
        console.error('Error fetching owners:', ownersError);
        // 소유자 정보 실패해도 좌석 데이터는 반환
      } else {
        owners = ownersData || [];
      }
    }

    // 좌석과 소유자 정보 결합
    const seatsWithOwners = seats.map(seat => ({
      ...seat,
      owner: seat.owner_id 
        ? owners.find(owner => owner.id === seat.owner_id) || null
        : null
    }));

    console.log(`Successfully fetched ${seatsWithOwners.length} seats`);
    return NextResponse.json({ seats: seatsWithOwners });

  } catch (error) {
    console.error('Error in seats GET:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}