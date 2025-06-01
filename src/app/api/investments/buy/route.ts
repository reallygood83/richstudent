import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get('student_session_token')?.value

    if (!sessionToken) {
      return NextResponse.json({
        success: false,
        error: '인증이 필요합니다.'
      }, { status: 401 })
    }

    // 세션 토큰으로 실제 학생 정보 조회
    const { data: sessionData, error: sessionError } = await supabase
      .from('student_sessions')
      .select(`
        student_id,
        expires_at,
        students (
          id,
          teacher_id
        )
      `)
      .eq('session_token', sessionToken)
      .single()

    if (sessionError || !sessionData) {
      return NextResponse.json({
        success: false,
        error: '유효하지 않은 세션입니다.'
      }, { status: 401 })
    }

    // 세션 만료 확인
    const now = new Date()
    const expiresAt = new Date(sessionData.expires_at)
    if (now > expiresAt) {
      // 만료된 세션 삭제
      await supabase
        .from('student_sessions')
        .delete()
        .eq('session_token', sessionToken)
      
      return NextResponse.json({
        success: false,
        error: '세션이 만료되었습니다. 다시 로그인해주세요.'
      }, { status: 401 })
    }

    const studentData = { 
      student_id: sessionData.student_id, 
      teacher_id: sessionData.students.teacher_id 
    }

    const body = await request.json()
    const { asset_id, quantity, price, account_type = 'investment' } = body

    // 입력 데이터 검증
    if (!asset_id || !quantity || !price) {
      return NextResponse.json({
        success: false,
        error: '자산 ID, 수량, 가격은 필수입니다.'
      }, { status: 400 })
    }

    if (quantity <= 0 || price <= 0) {
      return NextResponse.json({
        success: false,
        error: '수량과 가격은 양수여야 합니다.'
      }, { status: 400 })
    }

    if (!['checking', 'savings', 'investment'].includes(account_type)) {
      return NextResponse.json({
        success: false,
        error: '유효하지 않은 계좌 타입입니다.'
      }, { status: 400 })
    }

    // 자산 정보 확인
    const { data: asset } = await supabase
      .from('market_assets')
      .select('id, symbol, name, min_quantity, current_price')
      .eq('id', asset_id)
      .single()

    if (!asset) {
      return NextResponse.json({
        success: false,
        error: '존재하지 않는 자산입니다.'
      }, { status: 404 })
    }

    // 최소 수량 확인
    if (asset.min_quantity && quantity < asset.min_quantity) {
      return NextResponse.json({
        success: false,
        error: `최소 주문 수량은 ${asset.min_quantity}입니다.`
      }, { status: 400 })
    }

    // 학생 계좌 잔액 확인
    const { data: account } = await supabase
      .from('accounts')
      .select('balance')
      .eq('student_id', studentData.student_id)
      .eq('account_type', account_type)
      .single()

    if (!account) {
      return NextResponse.json({
        success: false,
        error: `${account_type} 계좌를 찾을 수 없습니다.`
      }, { status: 404 })
    }

    const totalAmount = Number(quantity) * Number(price)
    const fee = totalAmount * 0.001 // 0.1% 수수료

    if (account.balance < totalAmount + fee) {
      return NextResponse.json({
        success: false,
        error: `잔액이 부족합니다. 필요 금액: ${Math.round(totalAmount + fee).toLocaleString()}원`
      }, { status: 400 })
    }

    // 트랜잭션 시작 (Supabase에서는 rpc 함수를 사용)
    // 1. 계좌에서 차감
    const { error: deductError } = await supabase
      .from('accounts')
      .update({ 
        balance: account.balance - totalAmount - fee,
        updated_at: new Date().toISOString()
      })
      .eq('student_id', studentData.student_id)
      .eq('account_type', account_type)

    if (deductError) {
      console.error('Balance deduction error:', deductError)
      return NextResponse.json({
        success: false,
        error: '계좌 차감에 실패했습니다.'
      }, { status: 500 })
    }

    // 2. 자산 거래 기록 생성
    const { data: transaction, error: transactionError } = await supabase
      .from('asset_transactions')
      .insert({
        student_id: studentData.student_id,
        asset_id: asset_id,
        transaction_type: 'buy',
        quantity: Number(quantity),
        price: Number(price),
        total_amount: totalAmount,
        fee: fee,
        status: 'completed'
      })
      .select()
      .single()

    if (transactionError) {
      console.error('Transaction creation error:', transactionError)
      
      // 롤백: 계좌 금액 복구
      await supabase
        .from('accounts')
        .update({ 
          balance: account.balance,
          updated_at: new Date().toISOString()
        })
        .eq('student_id', studentData.student_id)
        .eq('account_type', account_type)

      return NextResponse.json({
        success: false,
        error: '거래 기록 생성에 실패했습니다.'
      }, { status: 500 })
    }

    // 3. 수수료를 증권회사 계좌로 이전
    if (fee > 0) {
      // 증권회사 경제 주체 조회
      const { data: securities } = await supabase
        .from('economic_entities')
        .select('id, balance')
        .eq('teacher_id', studentData.teacher_id)
        .eq('entity_type', 'securities')
        .single()

      if (securities) {
        // 증권회사 잔액 증가
        await supabase
          .from('economic_entities')
          .update({ 
            balance: securities.balance + fee,
            updated_at: new Date().toISOString()
          })
          .eq('id', securities.id)
      }

      // 수수료 거래 기록
      await supabase
        .from('transactions')
        .insert({
          from_student_id: studentData.student_id,
          to_student_id: null, // 증권회사로
          amount: fee,
          transaction_type: 'investment_fee',
          description: `${asset.symbol} 매수 수수료`,
          status: 'completed'
        })
    }

    // 4. 포트폴리오 업데이트 또는 생성
    const { data: existingPortfolio } = await supabase
      .from('portfolio')
      .select('id, quantity, average_price, total_invested')
      .eq('student_id', studentData.student_id)
      .eq('asset_id', asset_id)
      .single()

    if (existingPortfolio) {
      // 기존 포트폴리오 업데이트 (평균 단가 계산)
      const newQuantity = existingPortfolio.quantity + Number(quantity)
      const newTotalInvested = existingPortfolio.total_invested + totalAmount
      const newAveragePrice = newTotalInvested / newQuantity

      await supabase
        .from('portfolio')
        .update({
          quantity: newQuantity,
          average_price: newAveragePrice,
          total_invested: newTotalInvested,
          current_value: newQuantity * Number(price),
          profit_loss: (newQuantity * Number(price)) - newTotalInvested,
          profit_loss_percent: newTotalInvested > 0 ? (((newQuantity * Number(price)) - newTotalInvested) / newTotalInvested * 100) : 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingPortfolio.id)
    } else {
      // 새 포트폴리오 생성
      await supabase
        .from('portfolio')
        .insert({
          student_id: studentData.student_id,
          asset_id: asset_id,
          quantity: Number(quantity),
          average_price: Number(price),
          total_invested: totalAmount,
          current_value: Number(quantity) * Number(price),
          profit_loss: 0,
          profit_loss_percent: 0
        })
    }

    return NextResponse.json({
      success: true,
      message: `${asset.symbol} ${quantity}주를 성공적으로 매수했습니다.`,
      transaction: {
        id: transaction.id,
        asset_symbol: asset.symbol,
        asset_name: asset.name,
        quantity: Number(quantity),
        price: Number(price),
        total_amount: totalAmount,
        fee: fee,
        remaining_balance: account.balance - totalAmount - fee
      }
    })

  } catch (error) {
    console.error('Investment buy error:', error)
    return NextResponse.json({
      success: false,
      error: '서버 오류가 발생했습니다.'
    }, { status: 500 })
  }
}