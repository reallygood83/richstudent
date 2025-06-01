import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import { validateSession } from '@/lib/auth'

// 경제 주체 목록 조회
export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('session_token')?.value

    if (!sessionToken) {
      return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 })
    }

    // 세션 검증
    const teacher = await validateSession(sessionToken)
    if (!teacher) {
      return NextResponse.json({ success: false, error: '유효하지 않은 세션입니다.' }, { status: 401 })
    }

    const teacherId = teacher.id

    // 해당 교사의 경제 주체들 조회
    const { data: entities, error } = await supabase
      .from('economic_entities')
      .select('*')
      .eq('teacher_id', teacherId)
      .order('entity_type')

    if (error) {
      console.error('Economic entities fetch error:', error)
      return NextResponse.json({ success: false, error: '경제 주체 조회에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      entities: entities || [] 
    })

  } catch (error) {
    console.error('경제 주체 조회 오류:', error)
    return NextResponse.json({ success: false, error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

// 경제 주체 생성
export async function POST(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('session_token')?.value

    if (!sessionToken) {
      return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 })
    }

    // 세션 검증
    const teacher = await validateSession(sessionToken)
    if (!teacher) {
      return NextResponse.json({ success: false, error: '유효하지 않은 세션입니다.' }, { status: 401 })
    }

    const teacherId = teacher.id
    const { entity_type, name, initial_balance = 0 } = await request.json()

    // 입력 검증
    if (!entity_type || !name) {
      return NextResponse.json({ success: false, error: '경제 주체 유형과 이름은 필수입니다.' }, { status: 400 })
    }

    const validTypes = ['government', 'bank', 'securities']
    if (!validTypes.includes(entity_type)) {
      return NextResponse.json({ success: false, error: '유효하지 않은 경제 주체 유형입니다.' }, { status: 400 })
    }

    // 기존에 같은 유형의 경제 주체가 있는지 확인
    const { data: existingEntity, error: checkError } = await supabase
      .from('economic_entities')
      .select('id')
      .eq('teacher_id', teacherId)
      .eq('entity_type', entity_type)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Existing entity check error:', checkError)
      return NextResponse.json({ success: false, error: '경제 주체 확인에 실패했습니다.' }, { status: 500 })
    }

    if (existingEntity) {
      return NextResponse.json({ 
        success: false, 
        error: `이미 ${entity_type === 'government' ? '정부' : entity_type === 'bank' ? '은행' : '증권회사'} 경제 주체가 존재합니다.` 
      }, { status: 400 })
    }

    // 경제 주체 생성
    const { data: newEntity, error: insertError } = await supabase
      .from('economic_entities')
      .insert([
        {
          teacher_id: teacherId,
          entity_type,
          name,
          balance: initial_balance,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select()
      .single()

    if (insertError) {
      console.error('Economic entity creation error:', insertError)
      return NextResponse.json({ success: false, error: '경제 주체 생성에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: '경제 주체가 성공적으로 생성되었습니다.',
      entity: newEntity 
    })

  } catch (error) {
    console.error('경제 주체 생성 오류:', error)
    return NextResponse.json({ success: false, error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}