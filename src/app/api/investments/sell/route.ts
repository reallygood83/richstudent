import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const studentId = cookieStore.get('student_id')?.value
    const teacherId = cookieStore.get('teacher_id')?.value

    if (!studentId || !teacherId) {
      return NextResponse.json({
        success: false,
        error: '인증이 필요합니다.'
      }, { status: 401 })
    }

    // 학생 정보 조회
    const { data: student } = await supabase
      .from('students')
      .select('id, teacher_id')
      .eq('id', studentId)
      .eq('teacher_id', teacherId)
      .single()

    if (!student) {
      return NextResponse.json({
        success: false,
        error: '학생 정보를 찾을 수 없습니다.'
      }, { status: 404 })
    }

    const studentData = {
      student_id: student.id,
      teacher_id: student.teacher_id
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
      .select('id, symbol, name, min_quantity')
      .eq('id', asset_id)
      .single()

    if (!asset) {
      return NextResponse.json({
        success: false,
        error: '존재하지 않는 자산입니다.'
      }, { status: 404 })
    }

    // 포트폴리오에서 보유 수량 확인
    const { data: portfolio } = await supabase
      .from('portfolio')
      .select('quantity, average_price, total_invested')
      .eq('student_id', studentData.student_id)
      .eq('asset_id', asset_id)
      .single()

    if (!portfolio) {
      return NextResponse.json({
        success: false,
        error: '보유하지 않은 자산입니다.'
      }, { status: 400 })
    }

    if (portfolio.quantity < quantity) {
      return NextResponse.json({
        success: false,
        error: `보유 수량이 부족합니다. 보유 수량: ${portfolio.quantity}`
      }, { status: 400 })
    }

    // 최소 수량 확인 (부분 매도 시)
    const remainingQuantity = portfolio.quantity - quantity
    if (remainingQuantity > 0 && asset.min_quantity && remainingQuantity < asset.min_quantity) {
      return NextResponse.json({
        success: false,
        error: `매도 후 잔여 수량이 최소 보유 수량(${asset.min_quantity})보다 적습니다. 전량 매도하시거나 더 적은 수량을 매도해주세요.`
      }, { status: 400 })
    }

    const totalAmount = Number(quantity) * Number(price)
    const brokerageFee = totalAmount * 0.001 // 0.1% 중개수수료
    const taxFee = totalAmount * 0.002 // 0.2% 매도세
    const totalFee = brokerageFee + taxFee
    const netAmount = totalAmount - totalFee

    // 계좌 정보 확인
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

    // 1. 계좌에 입금 (매도 대금 - 수수료)
    const { error: creditError } = await supabase
      .from('accounts')
      .update({ 
        balance: account.balance + netAmount,
        updated_at: new Date().toISOString()
      })
      .eq('student_id', studentData.student_id)
      .eq('account_type', account_type)

    if (creditError) {
      console.error('Balance credit error:', creditError)
      return NextResponse.json({
        success: false,
        error: '계좌 입금에 실패했습니다.'
      }, { status: 500 })
    }

    // 2. 자산 거래 기록 생성
    const { data: transaction, error: transactionError } = await supabase
      .from('asset_transactions')
      .insert({
        student_id: studentData.student_id,
        asset_id: asset_id,
        transaction_type: 'sell',
        quantity: Number(quantity),
        price: Number(price),
        total_amount: totalAmount,
        fee: totalFee,
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

    // 3. 매도 수수료를 해당 경제 주체로 이전
    if (totalFee > 0) {
      // 증권회사와 정부 경제 주체 조회
      const { data: entities } = await supabase
        .from('economic_entities')
        .select('id, entity_type, balance')
        .eq('teacher_id', studentData.teacher_id)
        .in('entity_type', ['securities', 'government'])

      const securities = entities?.find(e => e.entity_type === 'securities')
      const government = entities?.find(e => e.entity_type === 'government')

      // 중개수수료를 증권회사로
      if (securities && brokerageFee > 0) {
        await supabase
          .from('economic_entities')
          .update({ 
            balance: securities.balance + brokerageFee,
            updated_at: new Date().toISOString()
          })
          .eq('id', securities.id)
      }

      // 거래세를 정부로
      if (government && taxFee > 0) {
        await supabase
          .from('economic_entities')
          .update({ 
            balance: government.balance + taxFee,
            updated_at: new Date().toISOString()
          })
          .eq('id', government.id)
      }

      // 수수료 거래 기록
      await supabase
        .from('transactions')
        .insert([
          {
            from_student_id: studentData.student_id,
            to_student_id: null,
            amount: brokerageFee,
            transaction_type: 'brokerage_fee',
            description: `${asset.symbol} 매도 중개수수료`,
            status: 'completed'
          },
          {
            from_student_id: studentData.student_id,
            to_student_id: null,
            amount: taxFee,
            transaction_type: 'trading_tax',
            description: `${asset.symbol} 매도 거래세`,
            status: 'completed'
          }
        ])
    }

    // 4. 손익 계산
    const averageCost = portfolio.average_price * quantity
    const profit = totalAmount - averageCost
    const profitPercent = averageCost > 0 ? (profit / averageCost) * 100 : 0

    // 5. 포트폴리오 업데이트
    const newQuantity = portfolio.quantity - Number(quantity)
    const newTotalInvested = portfolio.total_invested - (portfolio.average_price * Number(quantity))

    if (newQuantity <= 0) {
      // 전량 매도 시 포트폴리오에서 삭제
      await supabase
        .from('portfolio')
        .delete()
        .eq('student_id', studentData.student_id)
        .eq('asset_id', asset_id)
    } else {
      // 부분 매도 시 포트폴리오 업데이트
      await supabase
        .from('portfolio')
        .update({
          quantity: newQuantity,
          total_invested: newTotalInvested,
          current_value: newQuantity * Number(price),
          profit_loss: (newQuantity * Number(price)) - newTotalInvested,
          profit_loss_percent: newTotalInvested > 0 ? (((newQuantity * Number(price)) - newTotalInvested) / newTotalInvested * 100) : 0,
          updated_at: new Date().toISOString()
        })
        .eq('student_id', studentData.student_id)
        .eq('asset_id', asset_id)
    }

    return NextResponse.json({
      success: true,
      message: `${asset.symbol} ${quantity}주를 성공적으로 매도했습니다.`,
      transaction: {
        id: transaction.id,
        asset_symbol: asset.symbol,
        asset_name: asset.name,
        quantity: Number(quantity),
        price: Number(price),
        total_amount: totalAmount,
        fees: {
          brokerage: brokerageFee,
          tax: taxFee,
          total: totalFee
        },
        net_amount: netAmount,
        profit: {
          amount: profit,
          percent: profitPercent
        },
        new_balance: account.balance + netAmount
      }
    })

  } catch (error) {
    console.error('Investment sell error:', error)
    return NextResponse.json({
      success: false,
      error: '서버 오류가 발생했습니다.'
    }, { status: 500 })
  }
}