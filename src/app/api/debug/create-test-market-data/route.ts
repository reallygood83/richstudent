import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

// 테스트용 시장 데이터 생성 API
export async function POST() {
  try {
    // 현재 교사들 조회
    const { data: teachers, error: teachersError } = await supabase
      .from('teachers')
      .select('id, name, email')

    if (teachersError || !teachers || teachers.length === 0) {
      return NextResponse.json({
        success: false,
        error: '등록된 교사가 없습니다.'
      })
    }

    const results = []

    for (const teacher of teachers) {
      // 기본 시장 자산 데이터
      const testAssets = [
        { symbol: '005930.KS', name: '삼성전자', price: 56200, type: 'stock' },
        { symbol: '000660.KS', name: 'SK하이닉스', price: 102250, type: 'stock' },
        { symbol: 'AAPL', name: 'Apple Inc', price: 230.50, type: 'stock' },
        { symbol: 'MSFT', name: 'Microsoft', price: 420.75, type: 'stock' },
        { symbol: 'BTC-USD', name: 'Bitcoin', price: 67500.00, type: 'crypto' },
        { symbol: 'ETH-USD', name: 'Ethereum', price: 3850.25, type: 'crypto' },
        { symbol: 'GLD', name: 'Gold ETF', price: 195.80, type: 'commodity' },
        { symbol: 'WTI', name: 'Crude Oil', price: 82.45, type: 'commodity' },
        { symbol: 'USDKRW=X', name: '달러/원', price: 1340.50, type: 'commodity', category: '환율' },
        { symbol: 'JPYKRW=X', name: '엔화/원', price: 960.75, type: 'commodity', category: '환율' }
      ]

      const assetsToInsert = testAssets.map(asset => ({
        teacher_id: teacher.id,
        symbol: asset.symbol,
        name: asset.name,
        current_price: asset.price,
        previous_price: asset.price * 0.98, // 2% 낮은 이전 가격
        asset_type: asset.type,
        category: asset.category || (asset.type === 'stock' ? '주식' : asset.type === 'crypto' ? '암호화폐' : '원자재'),
        currency: asset.symbol.includes('USD') ? 'USD' : 'KRW',
        min_quantity: asset.type === 'crypto' ? 0.1 : 1,
        last_updated: new Date().toISOString()
      }))

      // 기존 자산 삭제 후 재생성
      const { error: deleteError } = await supabase
        .from('market_assets')
        .delete()
        .eq('teacher_id', teacher.id)

      if (deleteError) {
        console.error(`Delete error for teacher ${teacher.id}:`, deleteError)
      }

      // 새 자산 삽입
      const { data: insertedAssets, error: insertError } = await supabase
        .from('market_assets')
        .insert(assetsToInsert)
        .select()

      results.push({
        teacher_id: teacher.id,
        teacher_name: teacher.name,
        assets_created: insertedAssets?.length || 0,
        error: insertError?.message || null
      })

      if (insertError) {
        console.error(`Insert error for teacher ${teacher.id}:`, insertError)
      }
    }

    return NextResponse.json({
      success: true,
      message: '테스트 시장 데이터가 생성되었습니다.',
      results
    })

  } catch (error) {
    console.error('Test market data creation error:', error)
    return NextResponse.json({
      success: false,
      error: '테스트 데이터 생성 중 오류가 발생했습니다.',
      details: error
    }, { status: 500 })
  }
}