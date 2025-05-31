import { NextRequest, NextResponse } from 'next/server'
import { registerTeacher } from '@/lib/auth'
import type { RegisterRequest } from '@/types/auth'

export async function POST(request: NextRequest) {
  try {
    console.log('Register API called')
    const body: RegisterRequest = await request.json()
    console.log('Received registration data:', { 
      email: body.email, 
      name: body.name, 
      school: body.school,
      hasPassword: !!body.password 
    })

    // 입력 데이터 검증
    if (!body.email || !body.password || !body.name) {
      console.log('Validation failed: missing required fields')
      return NextResponse.json(
        { success: false, error: '필수 필드가 누락되었습니다.' },
        { status: 400 }
      )
    }

    if (body.password.length < 8) {
      return NextResponse.json(
        { success: false, error: '비밀번호는 8자 이상이어야 합니다.' },
        { status: 400 }
      )
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(body.email)) {
      return NextResponse.json(
        { success: false, error: '올바른 이메일 형식이 아닙니다.' },
        { status: 400 }
      )
    }

    // 회원가입 처리
    console.log('Calling registerTeacher function...')
    const result = await registerTeacher(body)
    console.log('registerTeacher result:', { 
      success: result.success, 
      error: result.error,
      hasTeacher: !!result.teacher 
    })

    if (!result.success) {
      console.log('Registration failed:', result.error)
      return NextResponse.json(result, { status: 400 })
    }

    console.log('Registration successful')
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Register API error:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}