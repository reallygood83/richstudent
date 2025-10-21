import { NextRequest, NextResponse } from 'next/server'

/**
 * Vercel Cron Job Endpoint - 시장 데이터 자동 업데이트
 *
 * 보안:
 * - Vercel Cron Secret으로 인증 (Authorization header)
 * - 30분마다 자동 실행 (vercel.json 설정)
 *
 * 장점:
 * - 중앙 집중식 업데이트 (사용자 수와 무관하게 1번만 실행)
 * - API 무료 한도 안전 (하루 48회 = 1,920 API calls)
 * - 클라이언트 부담 제거 (서버에서만 처리)
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Vercel Cron Secret 검증
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret) {
      console.error('❌ CRON_SECRET not configured')
      return NextResponse.json({
        success: false,
        error: 'Cron secret not configured'
      }, { status: 500 })
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      console.error('❌ Unauthorized cron request')
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 })
    }

    console.log('🔐 Cron authentication successful')

    // 2. 기존 market-data update API 호출
    const updateUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/market-data/update`

    console.log(`🚀 Calling market data update API: ${updateUrl}`)

    const response = await fetch(updateUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`Update API failed: ${response.status} ${response.statusText}`)
    }

    const result = await response.json()

    if (!result.success) {
      throw new Error(result.error || 'Update failed')
    }

    console.log(`✅ Market data updated successfully: ${result.successCount}/${result.totalAssets} assets`)

    // 3. 성공 응답
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      result: {
        successCount: result.successCount,
        totalAssets: result.totalAssets,
        yahooAssets: result.yahooAssets,
        finnhubAssets: result.finnhubAssets
      }
    })

  } catch (error) {
    console.error('❌ Cron job failed:', error)

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
