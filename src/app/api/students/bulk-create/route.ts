import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase/client'

interface StudentInput {
  name: string;
  student_code: string;
  weekly_allowance: number;
}

export async function POST(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('session_token')?.value

    if (!sessionToken) {
      return NextResponse.json({
        success: false,
        error: '인증이 필요합니다.'
      }, { status: 401 })
    }

    // 세션 검증
    const teacher = await validateSession(sessionToken)
    if (!teacher) {
      return NextResponse.json({
        success: false,
        error: '유효하지 않은 세션입니다.'
      }, { status: 401 })
    }

    const { students }: { students: StudentInput[] } = await request.json();

    if (!students || !Array.isArray(students) || students.length === 0) {
      return NextResponse.json({
        success: false,
        error: '유효한 학생 데이터가 필요합니다.'
      }, { status: 400 });
    }

    if (students.length > 100) {
      return NextResponse.json({
        success: false,
        error: '한 번에 최대 100명까지만 등록할 수 있습니다.'
      }, { status: 400 });
    }

    // 기존 학번 중복 체크
    const existingCodes = students.map(s => s.student_code);
    const { data: existingStudents, error: checkError } = await supabase
      .from('students')
      .select('student_code')
      .eq('teacher_id', teacher.id)
      .in('student_code', existingCodes);

    if (checkError) {
      console.error('Error checking existing student codes:', checkError);
      return NextResponse.json({
        success: false,
        error: '기존 학번 확인 중 오류가 발생했습니다.'
      }, { status: 500 });
    }

    const duplicateCodes = existingStudents?.map(s => s.student_code) || [];
    if (duplicateCodes.length > 0) {
      return NextResponse.json({
        success: false,
        error: `이미 존재하는 학번입니다: ${duplicateCodes.join(', ')}`
      }, { status: 400 });
    }

    // 학생 데이터 준비
    const studentsToCreate = students.map(student => ({
      name: student.name.trim(),
      student_code: student.student_code.trim(),
      teacher_id: teacher.id,
      weekly_allowance: student.weekly_allowance || 50000,
      credit_score: 700, // 기본 신용점수
      password: null, // 비밀번호는 나중에 설정
    }));

    // 학생 일괄 생성
    const { data: createdStudents, error: createError } = await supabase
      .from('students')
      .insert(studentsToCreate)
      .select('id, name, student_code');

    if (createError) {
      console.error('Error creating students:', createError);
      return NextResponse.json({
        success: false,
        error: '학생 등록 중 오류가 발생했습니다.'
      }, { status: 500 });
    }

    if (!createdStudents || createdStudents.length === 0) {
      return NextResponse.json({
        success: false,
        error: '학생 생성에 실패했습니다.'
      }, { status: 500 });
    }

    // 각 학생에 대해 계좌 생성
    const accountsToCreate = [];
    for (const student of createdStudents) {
      // 당좌, 저축, 투자 계좌 생성
      accountsToCreate.push(
        {
          student_id: student.id,
          account_type: 'checking',
          balance: 0,
          interest_rate: 0
        },
        {
          student_id: student.id,
          account_type: 'savings', 
          balance: 0,
          interest_rate: 0.02 // 2% 기본 이자율
        },
        {
          student_id: student.id,
          account_type: 'investment',
          balance: 0,
          interest_rate: 0
        }
      );
    }

    const { error: accountError } = await supabase
      .from('accounts')
      .insert(accountsToCreate);

    if (accountError) {
      console.error('Error creating accounts:', accountError);
      // 학생은 생성되었지만 계좌 생성 실패 - 부분적 성공으로 처리
      return NextResponse.json({
        success: true,
        created_count: createdStudents.length,
        warning: '학생은 생성되었지만 일부 계좌 생성에 실패했습니다. 개별적으로 확인해주세요.',
        students: createdStudents
      });
    }

    return NextResponse.json({
      success: true,
      created_count: createdStudents.length,
      message: `${createdStudents.length}명의 학생이 성공적으로 등록되었습니다.`,
      students: createdStudents
    });

  } catch (error) {
    console.error('Error in bulk student creation:', error);
    return NextResponse.json({
      success: false,
      error: '서버 오류가 발생했습니다.'
    }, { status: 500 });
  }
}