import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get('student_session')?.value

    if (!sessionToken) {
      return NextResponse.json({
        success: false,
        error: '인증이 필요합니다.'
      }, { status: 401 })
    }

    // 학생 세션 확인
    const { data: sessionData } = await supabase
      .from('student_sessions')
      .select('student_id, teacher_id')
      .eq('session_token', sessionToken)
      .eq('is_active', true)
      .single()

    if (!sessionData) {
      return NextResponse.json({
        success: false,
        error: '유효하지 않은 세션입니다.'
      }, { status: 401 })
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
      .eq('student_id', sessionData.student_id)
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
      .eq('student_id', sessionData.student_id)
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
        student_id: sessionData.student_id,
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
        .eq('student_id', sessionData.student_id)
        .eq('account_type', account_type)

      return NextResponse.json({
        success: false,
        error: '거래 기록 생성에 실패했습니다.'
      }, { status: 500 })
    }

    // 3. 수수료 기록 (일반 거래 기록으로)
    if (fee > 0) {
      await supabase
        .from('transactions')
        .insert({
          from_student_id: sessionData.student_id,
          to_student_id: null, // 수수료는 시스템으로
          amount: fee,
          transaction_type: 'investment_fee',
          description: `${asset.symbol} 매수 수수료`,
          status: 'completed'
        })
    }

    // 4. 포트폴리오는 트리거로 자동 업데이트됨

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