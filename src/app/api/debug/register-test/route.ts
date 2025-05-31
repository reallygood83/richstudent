import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('Debug register test - received data:', body)

    const testEmail = body.email || 'test@example.com'
    const testName = body.name || 'Test Teacher'
    const testSchool = body.school || 'Test School'

    // 1. 이메일 중복 확인 테스트
    console.log('Step 1: Checking for existing email...')
    const { data: existingTeacher, error: checkError } = await supabase
      .from('teachers')
      .select('id, email')
      .eq('email', testEmail)
      .single()

    console.log('Existing teacher check result:', { existingTeacher, checkError })

    if (existingTeacher) {
      return NextResponse.json({
        success: false,
        step: 'email_check',
        message: 'Email already exists',
        existing_teacher: existingTeacher
      })
    }

    // 2. 간단한 비밀번호 해싱 테스트
    console.log('Step 2: Testing password hashing...')
    const encoder = new TextEncoder()
    const data = encoder.encode('test123' + testEmail)
    const hash = await crypto.subtle.digest('SHA-256', data)
    const passwordHash = Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    console.log('Password hash generated successfully')

    // 3. 세션 코드 생성 테스트
    console.log('Step 3: Generating session code...')
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let sessionCode = ''
    for (let i = 0; i < 6; i++) {
      sessionCode += chars.charAt(Math.floor(Math.random() * chars.length))
    }

    console.log('Session code generated:', sessionCode)

    // 4. 테이블 삽입 시도 (실제로는 하지 않음)
    console.log('Step 4: Would insert data:', {
      email: testEmail,
      name: testName,
      school: testSchool,
      password_hash: passwordHash.substring(0, 10) + '...', // 보안상 일부만 표시
      session_code: sessionCode,
      plan: 'free',
      student_limit: 30
    })

    return NextResponse.json({
      success: true,
      message: 'All steps completed successfully',
      steps: {
        email_check: 'passed',
        password_hashing: 'passed',
        session_code_generation: 'passed',
        data_preparation: 'passed'
      },
      test_data: {
        email: testEmail,
        name: testName,
        school: testSchool,
        session_code: sessionCode
      }
    })

  } catch (error) {
    console.error('Debug register test error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      step: 'unknown'
    }, { status: 500 })
  }
}