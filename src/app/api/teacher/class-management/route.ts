import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase/client'

// 학급 정보 조회 API
export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('session_token')?.value

    if (!sessionToken) {
      return NextResponse.json({
        success: false,
        error: '인증이 필요합니다.'
      }, { status: 401 })
    }

    const teacher = await validateSession(sessionToken)
    if (!teacher) {
      return NextResponse.json({
        success: false,
        error: '유효하지 않은 세션입니다.'
      }, { status: 401 })
    }

    // 현재 교사의 학급 정보 조회
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('id, name, student_code, created_at')
      .eq('teacher_id', teacher.id)
      .order('created_at', { ascending: false })

    if (studentsError) {
      return NextResponse.json({
        success: false,
        error: '학생 정보 조회에 실패했습니다.'
      }, { status: 500 })
    }

    // 교사의 계좌 정보 조회
    const { data: accounts, error: accountsError } = await supabase
      .from('accounts')
      .select(`
        account_type,
        balance,
        student_id
      `)
      .in('student_id', students?.map(s => s.id) || [])

    if (accountsError) {
      console.error('Accounts query error:', accountsError)
    }

    // 거래 내역 수 조회
    const { count: transactionCount, error: transactionError } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .or(`from_student_id.in.(${students?.map(s => s.id).join(',') || ''}),to_student_id.in.(${students?.map(s => s.id).join(',') || ''})`)

    if (transactionError) {
      console.error('Transaction count error:', transactionError)
    }

    // 포트폴리오 조회
    const { count: portfolioCount, error: portfolioError } = await supabase
      .from('portfolio')
      .select('*', { count: 'exact', head: true })
      .in('student_id', students?.map(s => s.id) || [])

    if (portfolioError) {
      console.error('Portfolio count error:', portfolioError)
    }

    // 자산 거래 내역 조회
    const { count: assetTransactionCount, error: assetTxError } = await supabase
      .from('asset_transactions')
      .select('*', { count: 'exact', head: true })
      .in('student_id', students?.map(s => s.id) || [])

    if (assetTxError) {
      console.error('Asset transaction count error:', assetTxError)
    }

    // 총 자산 계산
    const totalBalance = accounts?.reduce((sum, account) => sum + Number(account.balance), 0) || 0

    // 학급 생성일 (첫 번째 학생 등록일)
    const classCreatedAt = students && students.length > 0 
      ? students[students.length - 1].created_at 
      : teacher.created_at

    return NextResponse.json({
      success: true,
      classInfo: {
        teacher: {
          id: teacher.id,
          name: teacher.name,
          email: teacher.email,
          school: teacher.school,
          created_at: teacher.created_at
        },
        class: {
          created_at: classCreatedAt,
          student_count: students?.length || 0,
          total_balance: totalBalance,
          transaction_count: transactionCount || 0,
          portfolio_count: portfolioCount || 0,
          asset_transaction_count: assetTransactionCount || 0
        },
        students: students || []
      }
    })

  } catch (error) {
    console.error('Class management API error:', error)
    return NextResponse.json({
      success: false,
      error: '서버 오류가 발생했습니다.'
    }, { status: 500 })
  }
}

// 학급 데이터 완전 삭제 API
export async function DELETE(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('session_token')?.value

    if (!sessionToken) {
      return NextResponse.json({
        success: false,
        error: '인증이 필요합니다.'
      }, { status: 401 })
    }

    const teacher = await validateSession(sessionToken)
    if (!teacher) {
      return NextResponse.json({
        success: false,
        error: '유효하지 않은 세션입니다.'
      }, { status: 401 })
    }

    const { confirm_deletion, backup_requested } = await request.json()

    if (!confirm_deletion) {
      return NextResponse.json({
        success: false,
        error: '삭제 확인이 필요합니다.'
      }, { status: 400 })
    }

    // 삭제 전 백업 데이터 생성 (선택사항)
    let backupData = null
    if (backup_requested) {
      // 모든 관련 데이터를 JSON으로 백업
      const { data: students } = await supabase
        .from('students')
        .select(`
          *,
          accounts(*),
          transactions(*),
          portfolio(*),
          asset_transactions(*)
        `)
        .eq('teacher_id', teacher.id)

      const { data: marketAssets } = await supabase
        .from('market_assets')
        .select('*')
        .eq('teacher_id', teacher.id)

      const { data: economicEntities } = await supabase
        .from('economic_entities')
        .select(`
          *,
          economic_entity_accounts(*)
        `)
        .eq('teacher_id', teacher.id)

      backupData = {
        teacher_info: {
          name: teacher.name,
          email: teacher.email,
          school: teacher.school,
          export_date: new Date().toISOString()
        },
        students,
        market_assets: marketAssets,
        economic_entities: economicEntities
      }
    }

    // 학급 데이터 삭제 시작
    // CASCADE 설정으로 인해 students 삭제 시 관련 데이터가 자동 삭제됨
    
    // 1. 경제 주체 ID 조회
    const { data: economicEntities } = await supabase
      .from('economic_entities')
      .select('id')
      .eq('teacher_id', teacher.id)

    const entityIds = economicEntities?.map(entity => entity.id) || []

    // 2. 경제 주체 계좌 삭제
    if (entityIds.length > 0) {
      const { error: entityAccountsError } = await supabase
        .from('economic_entity_accounts')
        .delete()
        .in('entity_id', entityIds)

      if (entityAccountsError) {
        console.error('Economic entity accounts deletion error:', entityAccountsError)
      }
    }

    // 3. 경제 주체 삭제
    const { error: entitiesError } = await supabase
      .from('economic_entities')
      .delete()
      .eq('teacher_id', teacher.id)

    if (entitiesError) {
      console.error('Economic entities deletion error:', entitiesError)
    }

    // 4. 시장 자산 삭제
    const { error: marketAssetsError } = await supabase
      .from('market_assets')
      .delete()
      .eq('teacher_id', teacher.id)

    if (marketAssetsError) {
      console.error('Market assets deletion error:', marketAssetsError)
    }

    // 5. 학생 ID 조회 (교실 좌석 삭제를 위해)
    const { data: students } = await supabase
      .from('students')
      .select('id')
      .eq('teacher_id', teacher.id)

    const studentIds = students?.map(student => student.id) || []

    // 6. 교실 좌석 삭제 (만약 있다면)
    if (studentIds.length > 0) {
      const { error: seatsError } = await supabase
        .from('classroom_seats')
        .delete()
        .in('owner_id', studentIds)

      if (seatsError) {
        console.error('Classroom seats deletion error:', seatsError)
      }
    }

    // 7. 학생 삭제 (CASCADE로 accounts, transactions, portfolio, asset_transactions 자동 삭제)
    const { error: studentsError, count: deletedStudentsCount } = await supabase
      .from('students')
      .delete({ count: 'exact' })
      .eq('teacher_id', teacher.id)

    if (studentsError) {
      return NextResponse.json({
        success: false,
        error: '학생 데이터 삭제에 실패했습니다.',
        details: studentsError.message
      }, { status: 500 })
    }

    // 8. 교사 세션 정리
    const { error: sessionsError } = await supabase
      .from('teacher_sessions')
      .delete()
      .eq('teacher_id', teacher.id)

    if (sessionsError) {
      console.error('Teacher sessions deletion error:', sessionsError)
    }

    return NextResponse.json({
      success: true,
      message: '학급 데이터가 성공적으로 삭제되었습니다.',
      deletion_summary: {
        deleted_students: deletedStudentsCount || 0,
        backup_created: backup_requested,
        deletion_date: new Date().toISOString()
      },
      backup_data: backup_requested ? backupData : null
    })

  } catch (error) {
    console.error('Class deletion error:', error)
    return NextResponse.json({
      success: false,
      error: '학급 삭제 중 오류가 발생했습니다.'
    }, { status: 500 })
  }
}