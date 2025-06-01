'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  DollarSign, 
  CreditCard, 
  PiggyBank, 
  TrendingUp, 
  ArrowRightLeft,
  History,
  LogOut,
  User,
  Building2,
  MapPin
} from 'lucide-react'
import { Student, Transaction } from '@/types'
import TransferForm from '@/components/student/TransferForm'
import AccountTransfer from '@/components/student/AccountTransfer'
import ClassroomSeats from '@/components/student/ClassroomSeats'

interface StudentSession {
  studentId: string
  studentName: string
  studentCode: string
  teacherId: string
  teacherName: string
  sessionCode: string
}

export default function StudentDashboard() {
  const [student, setStudent] = useState<Student | null>(null)
  const [session, setSession] = useState<StudentSession | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const router = useRouter()

  const fetchStudentData = useCallback(async () => {
    try {
      setLoading(true)
      
      // 학생 정보와 계좌 정보 조회
      const response = await fetch('/api/student/me')
      const data = await response.json()

      if (data.success) {
        setStudent(data.student)
        setSession(data.session)
        
        // 거래 내역 조회
        fetchTransactions(data.student.id)
      } else {
        setError(data.error)
        if (data.error === '인증이 필요합니다.') {
          router.push('/student/login')
        }
      }
    } catch {
      setError('데이터를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    fetchStudentData()
  }, [fetchStudentData])

  const fetchTransactions = async (studentId: string) => {
    try {
      const response = await fetch(`/api/student/transactions?student_id=${studentId}`)
      const data = await response.json()

      if (data.success) {
        setTransactions(data.transactions)
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/student/logout', { method: 'POST' })
      router.push('/student/login')
    } catch {
      router.push('/student/login')
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getTransactionDescription = (transaction: Transaction) => {
    if (transaction.transaction_type === 'transfer') {
      if (transaction.from_student_id === student?.id) {
        return `${transaction.to_student_name}에게 송금`
      } else {
        return `${transaction.from_student_name}으로부터 입금`
      }
    } else if (transaction.transaction_type === 'allowance') {
      return '수당 지급'
    }
    return transaction.description || transaction.transaction_type
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Alert className="max-w-md border-red-200 bg-red-50">
          <AlertDescription className="text-red-600">
            {error}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!student || !session) {
    router.push('/student/login')
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="text-2xl">🎓</div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">RichStudent</h1>
                <p className="text-xs text-gray-500">{session.teacherName} 선생님 ({session.sessionCode})</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900 flex items-center">
                  <User className="w-4 h-4 mr-1" />
                  {student.name}
                </p>
                <p className="text-xs text-gray-500">{student.student_code}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="flex items-center space-x-2"
              >
                <LogOut className="w-4 h-4" />
                <span>로그아웃</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            안녕하세요, {student.name}님!
          </h2>
          <p className="text-gray-600">
            나의 경제 활동을 확인하고 관리해보세요.
          </p>
        </div>

        {/* Account Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-100">당좌 계좌</CardTitle>
              <CreditCard className="h-4 w-4 text-blue-100" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(student.accounts.checking)}</div>
              <p className="text-xs text-blue-100">
                일상 거래용 계좌
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-100">저축 계좌</CardTitle>
              <PiggyBank className="h-4 w-4 text-green-100" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(student.accounts.savings)}</div>
              <p className="text-xs text-green-100">
                미래를 위한 저축
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-100">투자 계좌</CardTitle>
              <TrendingUp className="h-4 w-4 text-purple-100" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(student.accounts.investment)}</div>
              <p className="text-xs text-purple-100">
                투자 및 자산 운용
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Total Balance */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <DollarSign className="w-5 h-5" />
              <span>총 자산</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {formatCurrency(student.total_balance)}
            </div>
            <p className="text-sm text-gray-600 mt-2">
              모든 계좌의 잔액을 합한 총 자산입니다
            </p>
          </CardContent>
        </Card>

        {/* Services Section */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Investment Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5" />
                <span>투자 관리</span>
              </CardTitle>
              <CardDescription>
                주식, 암호화폐 등 다양한 자산에 투자해보세요
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => router.push('/student/investments')}
                className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                투자 포트폴리오 관리
              </Button>
            </CardContent>
          </Card>

          {/* Loan Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Building2 className="w-5 h-5" />
                <span>대출 관리</span>
              </CardTitle>
              <CardDescription>
                신용점수에 따른 맞춤형 대출 서비스
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => router.push('/student/loans')}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
              >
                <Building2 className="w-4 h-4 mr-2" />
                대출 신청 및 관리
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Real Estate Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MapPin className="w-5 h-5" />
              <span>부동산 거래</span>
            </CardTitle>
            <CardDescription>
              교실 좌석을 거래하고 수익을 창출해보세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => router.push('/student/real-estate')}
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
            >
              <MapPin className="w-4 h-4 mr-2" />
              교실 좌석 거래소
            </Button>
          </CardContent>
        </Card>

        {/* Tabs for Activities */}
        <Tabs defaultValue="transactions" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="transactions" className="flex items-center space-x-2">
              <History className="w-4 h-4" />
              <span>거래 내역</span>
            </TabsTrigger>
            <TabsTrigger value="transfer" className="flex items-center space-x-2">
              <ArrowRightLeft className="w-4 h-4" />
              <span>송금하기</span>
            </TabsTrigger>
            <TabsTrigger value="account-transfer" className="flex items-center space-x-2">
              <ArrowRightLeft className="w-4 h-4" />
              <span>계좌 이체</span>
            </TabsTrigger>
            <TabsTrigger value="real-estate" className="flex items-center space-x-2">
              <MapPin className="w-4 h-4" />
              <span>좌석 거래</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="transactions" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>최근 거래 내역</CardTitle>
                <CardDescription>
                  최근 거래 활동을 확인할 수 있습니다
                </CardDescription>
              </CardHeader>
              <CardContent>
                {transactions.length === 0 ? (
                  <div className="text-center py-8">
                    <History className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">아직 거래 내역이 없습니다</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {transactions.slice(0, 10).map((transaction) => (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            transaction.from_student_id === student.id
                              ? 'bg-red-100 text-red-600'
                              : 'bg-green-100 text-green-600'
                          }`}>
                            <ArrowRightLeft className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-medium">
                              {getTransactionDescription(transaction)}
                            </p>
                            <p className="text-sm text-gray-500">
                              {formatDate(transaction.created_at)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold ${
                            transaction.from_student_id === student.id
                              ? 'text-red-600'
                              : 'text-green-600'
                          }`}>
                            {transaction.from_student_id === student.id ? '-' : '+'}
                            {formatCurrency(transaction.amount)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {transaction.status === 'completed' ? '완료' : '대기중'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transfer" className="mt-6">
            <TransferForm 
              currentStudent={student}
              onTransferSuccess={fetchStudentData}
            />
          </TabsContent>

          <TabsContent value="account-transfer" className="mt-6">
            <AccountTransfer 
              accounts={student.accounts}
              onTransferSuccess={fetchStudentData}
            />
          </TabsContent>

          <TabsContent value="real-estate" className="mt-6">
            <ClassroomSeats studentId={student?.id} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}