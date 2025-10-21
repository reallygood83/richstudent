import { NextResponse } from 'next/server'

// Vercel Serverless Function 설정
export const maxDuration = 180 // 3분 타임아웃 (Hobby 플랜 최대값)

// 자동 업데이트를 위한 cron job 엔드포인트
// Vercel Cron Jobs나 외부 서비스에서 호출

export async function POST() {
  try {
    console.log('Auto market data update triggered at:', new Date().toISOString())
    
    // 내부 업데이트 API 호출
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'https://richstudent.vercel.app'}/api/market-data/update`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.CRON_SECRET || 'richstudent-cron-secret'}`
        }
      }
    )

    const result = await response.json()

    if (result.success) {
      console.log('Auto update successful:', result)
      return NextResponse.json({
        success: true,
        message: 'Market data auto-updated successfully',
        data: result.data
      })
    } else {
      console.error('Auto update failed:', result.error)
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Auto update error:', error)
    return NextResponse.json({
      success: false,
      error: 'Auto update failed'
    }, { status: 500 })
  }
}

// GET 요청으로도 접근 가능 (URL 기반 cron 서비스용)
export async function GET() {
  return POST()
}