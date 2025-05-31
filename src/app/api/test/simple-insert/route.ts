import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

export async function POST(request: NextRequest) {
  try {
    console.log('=== Simple Insert Test Started ===')
    
    const body = await request.json()
    console.log('Received data:', body)

    const testData = {
      email: body.email || 'simple-test@example.com',
      name: body.name || 'Simple Test',
      school: body.school || 'Test School',
      password_hash: 'simple_hash_123',
      session_code: 'TEST01',
      plan: 'free',
      student_limit: 30
    }

    console.log('Attempting to insert:', testData)

    // 매우 간단한 삽입 시도
    const { data, error } = await supabase
      .from('teachers')
      .insert(testData)
      .select()
      .single()

    console.log('Insert result data:', data)
    console.log('Insert result error:', error)

    if (error) {
      return NextResponse.json({
        success: false,
        error: `Database insert failed: ${error.message}`,
        details: error,
        test_data: testData
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: 'Simple insert successful!',
      inserted_data: data,
      test_data: testData
    })

  } catch (error) {
    console.error('Simple insert test error:', error)
    return NextResponse.json({
      success: false,
      error: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: error
    }, { status: 500 })
  }
}