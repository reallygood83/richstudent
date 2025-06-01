import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import { validateSession } from '@/lib/auth'

// 특정 경제 주체 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { id: entityId } = await params

    const { data: entity, error } = await supabase
      .from('economic_entities')
      .select('*')
      .eq('id', entityId)
      .eq('teacher_id', teacherId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ success: false, error: '경제 주체를 찾을 수 없습니다.' }, { status: 404 })
      }
      console.error('Economic entity fetch error:', error)
      return NextResponse.json({ success: false, error: '경제 주체 조회에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      entity 
    })

  } catch (error) {
    console.error('경제 주체 조회 오류:', error)
    return NextResponse.json({ success: false, error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

// 경제 주체 정보 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { id: entityId } = await params
    const { name, balance } = await request.json()

    // 입력 검증
    if (!name) {
      return NextResponse.json({ success: false, error: '경제 주체 이름은 필수입니다.' }, { status: 400 })
    }

    if (typeof balance !== 'number') {
      return NextResponse.json({ success: false, error: '유효한 잔액을 입력해주세요.' }, { status: 400 })
    }

    // 경제 주체 존재 확인
    const { error: checkError } = await supabase
      .from('economic_entities')
      .select('id')
      .eq('id', entityId)
      .eq('teacher_id', teacherId)
      .single()

    if (checkError) {
      if (checkError.code === 'PGRST116') {
        return NextResponse.json({ success: false, error: '경제 주체를 찾을 수 없습니다.' }, { status: 404 })
      }
      console.error('Entity existence check error:', checkError)
      return NextResponse.json({ success: false, error: '경제 주체 확인에 실패했습니다.' }, { status: 500 })
    }

    // 경제 주체 정보 업데이트
    const { data: updatedEntity, error: updateError } = await supabase
      .from('economic_entities')
      .update({
        name,
        balance,
        updated_at: new Date().toISOString()
      })
      .eq('id', entityId)
      .eq('teacher_id', teacherId)
      .select()
      .single()

    if (updateError) {
      console.error('Economic entity update error:', updateError)
      return NextResponse.json({ success: false, error: '경제 주체 정보 수정에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: '경제 주체 정보가 성공적으로 수정되었습니다.',
      entity: updatedEntity 
    })

  } catch (error) {
    console.error('경제 주체 수정 오류:', error)
    return NextResponse.json({ success: false, error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

// 경제 주체 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { id: entityId } = await params

    // 경제 주체 존재 확인
    const { error: checkError } = await supabase
      .from('economic_entities')
      .select('entity_type')
      .eq('id', entityId)
      .eq('teacher_id', teacherId)
      .single()

    if (checkError) {
      if (checkError.code === 'PGRST116') {
        return NextResponse.json({ success: false, error: '경제 주체를 찾을 수 없습니다.' }, { status: 404 })
      }
      console.error('Entity existence check error:', checkError)
      return NextResponse.json({ success: false, error: '경제 주체 확인에 실패했습니다.' }, { status: 500 })
    }

    // 경제 주체 삭제
    const { error: deleteError } = await supabase
      .from('economic_entities')
      .delete()
      .eq('id', entityId)
      .eq('teacher_id', teacherId)

    if (deleteError) {
      console.error('Economic entity deletion error:', deleteError)
      return NextResponse.json({ success: false, error: '경제 주체 삭제에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: '경제 주체가 성공적으로 삭제되었습니다.' 
    })

  } catch (error) {
    console.error('경제 주체 삭제 오류:', error)
    return NextResponse.json({ success: false, error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}