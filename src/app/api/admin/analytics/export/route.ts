import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

export async function GET() {
  try {
    // 전체 데이터 조회
    const [teachersData, studentsData, transactionsData] = await Promise.all([
      supabase
        .from('teachers')
        .select('id, email, school, created_at, last_login'),
      
      supabase
        .from('students')
        .select('id, name, teacher_id, student_code, created_at, accounts'),
      
      supabase
        .from('transactions')
        .select('id, student_id, transaction_type, amount, account_type, description, created_at')
        .order('created_at', { ascending: false })
        .limit(10000) // 최근 1만건
    ])

    const teachers = teachersData.data || []
    const students = studentsData.data || []
    const transactions = transactionsData.data || []

    // CSV 헤더
    const csvData = []
    
    // 요약 통계
    csvData.push(['=== 베타 테스트 요약 통계 ==='])
    csvData.push(['항목', '값'])
    csvData.push(['총 교사 수', teachers.length])
    csvData.push(['총 학생 수', students.length])
    csvData.push(['총 거래 건수', transactions.length])
    csvData.push(['총 거래 금액', transactions.reduce((sum, t) => sum + Math.abs(t.amount || 0), 0)])
    csvData.push(['데이터 내보내기 시간', new Date().toLocaleString('ko-KR')])
    csvData.push([]) // 빈 줄

    // 교사별 통계
    csvData.push(['=== 교사별 통계 ==='])
    csvData.push(['교사 ID', '이메일', '학교', '학생 수', '거래 건수', '가입일'])
    
    teachers.forEach(teacher => {
      const teacherStudents = students.filter(s => s.teacher_id === teacher.id)
      const teacherTransactions = transactions.filter(t => 
        teacherStudents.some(s => s.id === t.student_id)
      )
      
      csvData.push([
        teacher.id,
        teacher.email,
        teacher.school || '',
        teacherStudents.length,
        teacherTransactions.length,
        new Date(teacher.created_at).toLocaleDateString('ko-KR')
      ])
    })
    csvData.push([]) // 빈 줄

    // 학급별 활동 순위
    csvData.push(['=== 활성 학급 순위 (거래량 기준) ==='])
    csvData.push(['순위', '교사 이메일', '학생 수', '거래 건수', '평균 거래/학생'])
    
    const classStats = teachers.map(teacher => {
      const teacherStudents = students.filter(s => s.teacher_id === teacher.id)
      const teacherTransactions = transactions.filter(t => 
        teacherStudents.some(s => s.id === t.student_id)
      )
      
      return {
        email: teacher.email,
        studentCount: teacherStudents.length,
        transactionCount: teacherTransactions.length,
        avgTransactionPerStudent: teacherStudents.length > 0 
          ? Math.round(teacherTransactions.length / teacherStudents.length * 100) / 100 
          : 0
      }
    }).sort((a, b) => b.transactionCount - a.transactionCount)

    classStats.forEach((stat, index) => {
      csvData.push([
        index + 1,
        stat.email,
        stat.studentCount,
        stat.transactionCount,
        stat.avgTransactionPerStudent
      ])
    })
    csvData.push([]) // 빈 줄

    // 일별 활동 통계 (최근 30일)
    csvData.push(['=== 일별 활동 통계 (최근 30일) ==='])
    csvData.push(['날짜', '신규 교사', '신규 학생', '거래 건수'])

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const dailyStats = new Map()

    // 날짜별 신규 교사
    teachers.forEach(teacher => {
      const date = new Date(teacher.created_at).toLocaleDateString('ko-KR')
      if (new Date(teacher.created_at) >= thirtyDaysAgo) {
        if (!dailyStats.has(date)) {
          dailyStats.set(date, { teachers: 0, students: 0, transactions: 0 })
        }
        dailyStats.get(date).teachers++
      }
    })

    // 날짜별 신규 학생
    students.forEach(student => {
      const date = new Date(student.created_at).toLocaleDateString('ko-KR')
      if (new Date(student.created_at) >= thirtyDaysAgo) {
        if (!dailyStats.has(date)) {
          dailyStats.set(date, { teachers: 0, students: 0, transactions: 0 })
        }
        dailyStats.get(date).students++
      }
    })

    // 날짜별 거래 건수
    transactions.forEach(transaction => {
      const date = new Date(transaction.created_at).toLocaleDateString('ko-KR')
      if (new Date(transaction.created_at) >= thirtyDaysAgo) {
        if (!dailyStats.has(date)) {
          dailyStats.set(date, { teachers: 0, students: 0, transactions: 0 })
        }
        dailyStats.get(date).transactions++
      }
    })

    // 날짜순 정렬하여 CSV에 추가
    Array.from(dailyStats.entries())
      .sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime())
      .forEach(([date, stats]) => {
        csvData.push([date, stats.teachers, stats.students, stats.transactions])
      })

    // CSV 문자열 생성
    const csvString = csvData
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')

    // BOM 추가 (Excel 한글 깨짐 방지)
    const bomCsvString = '\uFEFF' + csvString

    return new Response(bomCsvString, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="richstudent-beta-analytics-${new Date().toISOString().split('T')[0]}.csv"`
      }
    })

  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json({
      success: false,
      error: '데이터 내보내기 중 오류가 발생했습니다.'
    }, { status: 500 })
  }
}