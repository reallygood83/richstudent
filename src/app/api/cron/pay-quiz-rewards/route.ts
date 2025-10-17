// Quiz Reward Auto-Payment Cron Job
// Runs hourly to process unpaid quiz rewards (backup system)
// Primary payment happens immediately in submit-quiz API

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    // Verify Cron secret for security
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    console.log('💰 Quiz Reward Payment Cron Job Started')

    // Get all unpaid completed attempts
    const { data: unpaidAttempts, error: fetchError } = await supabase
      .from('student_quiz_attempts')
      .select('*')
      .eq('status', 'completed')
      .eq('reward_paid', false)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: true })

    if (fetchError) {
      console.error('❌ Fetch unpaid attempts error:', fetchError)
      return NextResponse.json(
        { success: false, error: 'Fetch failed' },
        { status: 500 }
      )
    }

    if (!unpaidAttempts || unpaidAttempts.length === 0) {
      console.log('ℹ️ No unpaid rewards found')
      return NextResponse.json({
        success: true,
        message: 'No unpaid rewards to process',
        processed: 0
      })
    }

    console.log(`📊 Found ${unpaidAttempts.length} unpaid rewards to process`)

    const results = []

    for (const attempt of unpaidAttempts) {
      try {
        console.log(`💸 Processing payment for attempt ${attempt.id}`)

        // Update student account balance
        const { error: balanceError } = await supabase.rpc('update_account_balance', {
          p_student_id: attempt.student_id,
          p_account_type: 'checking',
          p_amount: attempt.total_reward
        })

        if (balanceError) {
          throw balanceError
        }

        // Create transaction record
        const { error: transactionError } = await supabase
          .from('transactions')
          .insert({
            from_entity: 'system',
            to_student_id: attempt.student_id,
            transaction_type: 'quiz_reward',
            amount: attempt.total_reward,
            to_account_type: 'checking',
            description: `퀴즈 보상 (${attempt.correct_answers}/${attempt.total_questions} 정답)`,
            status: 'completed'
          })

        if (transactionError) {
          throw transactionError
        }

        // Mark as paid
        const { error: updateError } = await supabase
          .from('student_quiz_attempts')
          .update({
            reward_paid: true,
            reward_paid_at: new Date().toISOString()
          })
          .eq('id', attempt.id)

        if (updateError) {
          throw updateError
        }

        console.log(`✅ Payment processed successfully for attempt ${attempt.id}`)
        results.push({
          attempt_id: attempt.id,
          student_id: attempt.student_id,
          amount: attempt.total_reward,
          status: 'success'
        })

      } catch (error) {
        console.error(`❌ Payment failed for attempt ${attempt.id}:`, error)
        results.push({
          attempt_id: attempt.id,
          student_id: attempt.student_id,
          amount: attempt.total_reward,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    const successCount = results.filter(r => r.status === 'success').length
    const failedCount = results.filter(r => r.status === 'failed').length
    const totalAmount = results
      .filter(r => r.status === 'success')
      .reduce((sum, r) => sum + r.amount, 0)

    console.log(`🎉 Payment Processing Complete: ${successCount} success, ${failedCount} failed, ${totalAmount} won paid`)

    return NextResponse.json({
      success: true,
      message: 'Quiz reward payment completed',
      stats: {
        total: results.length,
        success: successCount,
        failed: failedCount,
        total_amount: totalAmount
      },
      results
    })

  } catch (error) {
    console.error('❌ Cron Job Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Cron job failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
