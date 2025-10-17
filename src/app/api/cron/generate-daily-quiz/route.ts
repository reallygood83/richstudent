// Daily Quiz Auto-Generation Cron Job
// Runs every day at 7:00 AM KST (scheduled via Vercel Cron)
// Generates AI-powered quizzes for all active teachers

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { generateQuizWithGemini } from '@/lib/gemini-quiz'

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

    console.log('🤖 Daily Quiz Generation Cron Job Started')

    // Get all active quiz settings
    const { data: activeSettings, error: settingsError } = await supabase
      .from('quiz_settings')
      .select('*')
      .eq('is_active', true)

    if (settingsError) {
      console.error('❌ Settings fetch error:', settingsError)
      return NextResponse.json(
        { success: false, error: 'Settings fetch failed' },
        { status: 500 }
      )
    }

    if (!activeSettings || activeSettings.length === 0) {
      console.log('ℹ️ No active quiz settings found')
      return NextResponse.json({
        success: true,
        message: 'No active quiz settings',
        generated: 0
      })
    }

    const today = new Date().toISOString().split('T')[0]
    const results = []

    // Generate quiz for each teacher
    for (const setting of activeSettings) {
      try {
        console.log(`📝 Generating quiz for teacher: ${setting.teacher_id}`)

        // Check if today's quiz already exists
        const { data: existingQuiz } = await supabase
          .from('daily_quizzes')
          .select('id')
          .eq('teacher_id', setting.teacher_id)
          .eq('quiz_date', today)
          .single()

        if (existingQuiz) {
          console.log(`⏭️ Quiz already exists for teacher ${setting.teacher_id}`)
          results.push({
            teacher_id: setting.teacher_id,
            status: 'skipped',
            reason: 'already_exists'
          })
          continue
        }

        // Get teacher's Gemini API key from news_settings
        const { data: newsSettings, error: newsSettingsError } = await supabase
          .from('news_settings')
          .select('gemini_api_key')
          .eq('teacher_id', setting.teacher_id)
          .single()

        if (newsSettingsError || !newsSettings?.gemini_api_key) {
          console.error(`❌ No Gemini API key for teacher ${setting.teacher_id}`)
          results.push({
            teacher_id: setting.teacher_id,
            status: 'failed',
            error: 'No Gemini API key configured in news settings'
          })
          continue
        }

        // Generate AI quiz using teacher's Gemini API key
        const questions = await generateQuizWithGemini(
          newsSettings.gemini_api_key,
          setting.quiz_type,
          setting.questions_per_quiz
        )

        if (!questions || questions.length === 0) {
          throw new Error('No questions generated')
        }

        // Save quiz to database
        const { data: newQuiz, error: insertError } = await supabase
          .from('daily_quizzes')
          .insert({
            teacher_id: setting.teacher_id,
            quiz_date: today,
            quiz_type: setting.quiz_type,
            questions: questions, // JSONB array
            generated_by: 'gemini-ai',
            generated_at: new Date().toISOString()
          })
          .select()
          .single()

        if (insertError) {
          throw insertError
        }

        console.log(`✅ Quiz generated successfully for teacher ${setting.teacher_id}`)
        results.push({
          teacher_id: setting.teacher_id,
          quiz_id: newQuiz.id,
          status: 'success',
          question_count: questions.length
        })

      } catch (error) {
        console.error(`❌ Quiz generation failed for teacher ${setting.teacher_id}:`, error)
        results.push({
          teacher_id: setting.teacher_id,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    const successCount = results.filter(r => r.status === 'success').length
    const failedCount = results.filter(r => r.status === 'failed').length
    const skippedCount = results.filter(r => r.status === 'skipped').length

    console.log(`🎉 Quiz Generation Complete: ${successCount} success, ${failedCount} failed, ${skippedCount} skipped`)

    return NextResponse.json({
      success: true,
      message: 'Daily quiz generation completed',
      stats: {
        total: results.length,
        success: successCount,
        failed: failedCount,
        skipped: skippedCount
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
