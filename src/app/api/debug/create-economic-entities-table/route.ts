import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

export async function POST() {
  try {
    console.log('Creating economic_entities table...')

    // 경제 주체 테이블 생성
    const { data, error } = await supabase.rpc('create_economic_entities_table', {})

    if (error) {
      console.error('Table creation error:', error)
      
      // SQL 직접 실행으로 시도
      const sqlQuery = `
        CREATE TABLE IF NOT EXISTS economic_entities (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
          entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('government', 'bank', 'securities')),
          name VARCHAR(100) NOT NULL,
          balance DECIMAL(15,2) DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(teacher_id, entity_type)
        );

        CREATE INDEX IF NOT EXISTS idx_economic_entities_teacher_id ON economic_entities(teacher_id);
      `

      // Supabase SQL 실행은 직접 쿼리로는 불가능하므로, 사용자에게 수동 실행 요청
      return NextResponse.json({
        success: false,
        error: 'RPC 함수를 통한 테이블 생성에 실패했습니다.',
        sqlToExecute: sqlQuery,
        message: 'Supabase SQL 에디터에서 위 SQL을 직접 실행해주세요.'
      })
    }

    return NextResponse.json({
      success: true,
      message: 'economic_entities 테이블이 성공적으로 생성되었습니다.',
      data
    })

  } catch (error) {
    console.error('Create table error:', error)
    return NextResponse.json({
      success: false,
      error: '테이블 생성 중 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : String(error)
    })
  }
}