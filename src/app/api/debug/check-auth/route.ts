import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    
    // 모든 쿠키 확인
    const allCookies = cookieStore.getAll()
    const sessionToken = cookieStore.get('session_token')?.value
    const studentSessionToken = cookieStore.get('student_session_token')?.value
    
    // 요청 헤더의 쿠키도 확인
    const cookieHeader = request.headers.get('cookie')
    
    return NextResponse.json({
      success: true,
      debug: {
        allCookies: allCookies.map(c => ({ name: c.name, hasValue: !!c.value })),
        sessionToken: sessionToken ? 'exists' : 'missing',
        studentSessionToken: studentSessionToken ? 'exists' : 'missing',
        cookieHeader: cookieHeader ? 'exists' : 'missing',
        requestHeaders: {
          'user-agent': request.headers.get('user-agent'),
          'origin': request.headers.get('origin'),
          'referer': request.headers.get('referer')
        }
      }
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Debug check failed',
      details: error instanceof Error ? error.message : String(error)
    })
  }
}