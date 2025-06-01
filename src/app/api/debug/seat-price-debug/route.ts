import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = createClient();
    
    console.log('Starting seat price debugging...');
    
    // 1. 학생 데이터 확인
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('id, name, student_code')
      .order('created_at');

    console.log('Students found:', students?.length || 0);

    // 2. 계좌 데이터 확인
    const { data: accounts, error: accountsError } = await supabase
      .from('accounts')
      .select('id, student_id, account_type, balance')
      .order('student_id');

    console.log('Accounts found:', accounts?.length || 0);

    // 3. 경제 주체 확인
    const { data: economicEntities, error: entitiesError } = await supabase
      .from('economic_entities')
      .select('id, entity_type, name')
      .order('entity_type');

    console.log('Economic entities found:', economicEntities?.length || 0);

    // 4. 좌석 데이터 확인
    const { data: seats, error: seatsError } = await supabase
      .from('classroom_seats')
      .select('seat_number, current_price, owner_id')
      .order('seat_number')
      .limit(5);

    console.log('Seats found:', seats?.length || 0);

    // 5. 직접 가격 계산 함수 호출
    const { data: priceResult, error: priceError } = await supabase
      .rpc('calculate_seat_price', { manual_student_count: null });

    console.log('Price calculation result:', priceResult, 'Error:', priceError);

    // 6. 학생별 자산 계산 (수동)
    let totalStudentAssets = 0;
    let actualStudentCount = 0;
    
    if (students && accounts && economicEntities) {
      // 경제 주체 ID 목록
      const economicEntityIds = economicEntities
        .filter(e => ['government', 'bank', 'securities'].includes(e.entity_type))
        .map(e => e.id);

      // 실제 학생 (경제 주체 제외)
      const realStudents = students.filter(s => !economicEntityIds.includes(s.id));
      actualStudentCount = realStudents.length;

      // 학생 자산 합계
      totalStudentAssets = accounts
        .filter(a => 
          realStudents.some(s => s.id === a.student_id) &&
          ['checking', 'savings', 'investment'].includes(a.account_type)
        )
        .reduce((sum, account) => sum + (account.balance || 0), 0);
    }

    // 7. 수동 가격 계산
    const manualCalculatedPrice = actualStudentCount > 0 && totalStudentAssets > 0
      ? Math.floor((totalStudentAssets * 0.6) / actualStudentCount)
      : 100000; // 기본 가격

    const finalPrice = Math.max(manualCalculatedPrice, 10000); // 최소 1만원

    return NextResponse.json({
      success: true,
      debugging_info: {
        students: {
          count: students?.length || 0,
          data: students?.slice(0, 3) || [],
          error: studentsError?.message || null
        },
        accounts: {
          count: accounts?.length || 0,
          data: accounts?.slice(0, 5) || [],
          error: accountsError?.message || null,
          total_balance: accounts?.reduce((sum, acc) => sum + (acc.balance || 0), 0) || 0
        },
        economic_entities: {
          count: economicEntities?.length || 0,
          data: economicEntities || [],
          error: entitiesError?.message || null
        },
        seats: {
          count: seats?.length || 0,
          sample_data: seats || [],
          error: seatsError?.message || null
        },
        price_calculation: {
          function_result: priceResult,
          function_error: priceError?.message || null,
          manual_calculation: {
            total_student_assets: totalStudentAssets,
            actual_student_count: actualStudentCount,
            calculated_price: manualCalculatedPrice,
            final_price: finalPrice,
            formula: '(total_student_assets * 0.6) / student_count'
          }
        }
      },
      analysis: {
        issue_identified: priceResult === 0 || totalStudentAssets === 0,
        possible_causes: [
          totalStudentAssets === 0 ? 'No student account balances found' : null,
          actualStudentCount === 0 ? 'No students found (excluding economic entities)' : null,
          accounts?.length === 0 ? 'No accounts table data' : null,
          students?.length === 0 ? 'No students table data' : null
        ].filter(Boolean)
      }
    });

  } catch (error) {
    console.error('Error in seat price debugging:', error);
    return NextResponse.json({
      success: false,
      error: 'Debugging failed',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// POST endpoint to create test data if needed
export async function POST() {
  try {
    const supabase = createClient();
    
    console.log('Creating test data for seat price calculation...');

    // 1. 테스트 교사 생성 (이미 존재하지 않으면)
    const { data: existingTeacher } = await supabase
      .from('teachers')
      .select('id')
      .eq('email', 'test@teacher.com')
      .single();

    let teacherId = existingTeacher?.id;

    if (!teacherId) {
      const { data: newTeacher, error: teacherError } = await supabase
        .from('teachers')
        .insert([{
          name: 'Test Teacher',
          email: 'test@teacher.com',
          session_code: 'TEST123'
        }])
        .select('id')
        .single();

      if (teacherError) {
        throw new Error(`Failed to create teacher: ${teacherError.message}`);
      }
      teacherId = newTeacher.id;
    }

    // 2. 테스트 학생 3명 생성
    const testStudents = [
      { name: '김철수', student_code: 'STU001' },
      { name: '이영희', student_code: 'STU002' },
      { name: '박민수', student_code: 'STU003' }
    ];

    const { data: createdStudents, error: studentsError } = await supabase
      .from('students')
      .upsert(
        testStudents.map(student => ({
          ...student,
          teacher_id: teacherId,
          password_hash: 'test123'
        })),
        { onConflict: 'student_code' }
      )
      .select('id, name, student_code');

    if (studentsError) {
      throw new Error(`Failed to create students: ${studentsError.message}`);
    }

    // 3. 각 학생에게 계좌 생성 및 초기 잔액 설정
    const accountsToCreate = [];
    const initialBalances = [500000, 300000, 700000]; // 각각 50만원, 30만원, 70만원

    createdStudents?.forEach((student, index) => {
      ['checking', 'savings', 'investment'].forEach(accountType => {
        accountsToCreate.push({
          student_id: student.id,
          account_type: accountType,
          balance: accountType === 'checking' ? initialBalances[index] : 0
        });
      });
    });

    const { data: createdAccounts, error: accountsError } = await supabase
      .from('accounts')
      .upsert(accountsToCreate, { 
        onConflict: 'student_id,account_type',
        ignoreDuplicates: false 
      })
      .select();

    if (accountsError) {
      throw new Error(`Failed to create accounts: ${accountsError.message}`);
    }

    // 4. 좌석 가격 업데이트 함수 호출
    const { data: updateResult, error: updateError } = await supabase
      .rpc('update_all_seat_prices', { manual_student_count: null });

    // 5. 업데이트된 좌석 가격 확인
    const { data: updatedSeats, error: seatsError } = await supabase
      .from('classroom_seats')
      .select('seat_number, current_price')
      .limit(5);

    if (seatsError) {
      console.error('Error fetching updated seats:', seatsError);
    }

    return NextResponse.json({
      success: true,
      message: 'Test data created successfully',
      created_data: {
        teacher_id: teacherId,
        students: createdStudents?.length || 0,
        accounts: createdAccounts?.length || 0,
        total_student_assets: initialBalances.reduce((sum, balance) => sum + balance, 0),
        expected_seat_price: Math.floor((initialBalances.reduce((sum, balance) => sum + balance, 0) * 0.6) / 3)
      },
      price_update: {
        update_result: updateResult,
        update_error: updateError?.message || null,
        updated_seats: updatedSeats || []
      }
    });

  } catch (error) {
    console.error('Error creating test data:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create test data',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}