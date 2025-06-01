import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createServerClient();
    
    const { data: seats, error } = await supabase
      .from('classroom_seats')
      .select(`
        *,
        owner:students!classroom_seats_owner_id_fkey(id, name)
      `)
      .order('seat_number');

    if (error) {
      console.error('Error fetching seats:', error);
      return NextResponse.json({ error: 'Failed to fetch seats' }, { status: 500 });
    }

    return NextResponse.json({ seats });
  } catch (error) {
    console.error('Error in seats GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}