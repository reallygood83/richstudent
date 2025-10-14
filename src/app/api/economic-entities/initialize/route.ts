import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import { validateSession } from '@/lib/auth'

// 기본 경제 주체들을 일괄 생성
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

    // 기존 경제 주체들 확인
    const { data: existingEntities, error: checkError } = await supabase
      .from('economic_entities')
      .select('entity_type')
      .eq('teacher_id', teacherId)

    if (checkError) {
      console.error('Existing entities check error:', checkError)
      return NextResponse.json({ success: false, error: '기존 경제 주체 확인에 실패했습니다.' }, { status: 500 })
    }

    const existingTypes = existingEntities?.map(e => e.entity_type) || []
    
    // 기본 경제 주체 설정
    const defaultEntities = [
      {
        entity_type: 'government',
        name: '한국 정부',
        balance: 100000000, // 1억원
        description: '세금 징수 및 보조금 지급'
      },
      {
        entity_type: 'bank',
        name: 'RichStudent 은행',
        balance: 50000000, // 5천만원
        description: '대출 서비스 및 신용 관리'
      },
      {
        entity_type: 'securities',
        name: 'RichStudent 증권',
        balance: 0, // 수수료로 수익 생성
        description: '투자 중개 및 거래 수수료 관리'
      }
    ]

    const entitiesToCreate = defaultEntities.filter(entity => 
      !existingTypes.includes(entity.entity_type)
    )

    if (entitiesToCreate.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: '모든 기본 경제 주체가 이미 생성되어 있습니다.' 
      }, { status: 400 })
    }

    // 경제 주체들 생성
    const createPromises = entitiesToCreate.map(entity => 
      supabase
        .from('economic_entities')
        .insert([
          {
            teacher_id: teacherId,
            entity_type: entity.entity_type,
            name: entity.name,
            balance: entity.balance,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ])
        .select()
        .single()
    )

    const results = await Promise.all(createPromises)
    
    // 오류 확인
    const errors = results.filter(result => result.error)
    if (errors.length > 0) {
      console.error('Economic entities creation errors:', errors)
      return NextResponse.json({ 
        success: false, 
        error: '일부 경제 주체 생성에 실패했습니다.' 
      }, { status: 500 })
    }

    const createdEntities = results.map(result => result.data).filter(Boolean)

    // 각 경제 기구에 계좌 생성 (checking, savings, investment)
    const accountCreationPromises = createdEntities.flatMap(entity =>
      ['checking', 'savings', 'investment'].map(accountType =>
        supabase
          .from('economic_entity_accounts')
          .insert({
            entity_id: entity.id,
            account_type: accountType,
            balance: accountType === 'checking' ? entity.balance : 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
      )
    )

    const accountResults = await Promise.all(accountCreationPromises)
    const accountErrors = accountResults.filter(result => result.error)

    if (accountErrors.length > 0) {
      console.error('Economic entity accounts creation errors:', accountErrors)
      // 계좌 생성 실패해도 경제 기구는 생성되었으므로 경고만 표시
    }

    return NextResponse.json({
      success: true,
      message: `${createdEntities.length}개의 경제 주체와 ${accountCreationPromises.length}개의 계좌가 성공적으로 생성되었습니다.`,
      entities: createdEntities,
      created_types: entitiesToCreate.map(e => e.entity_type),
      accounts_created: accountCreationPromises.length - accountErrors.length
    })

  } catch (error) {
    console.error('경제 주체 초기화 오류:', error)
    return NextResponse.json({ success: false, error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}