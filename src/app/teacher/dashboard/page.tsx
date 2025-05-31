'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/hooks/useAuth'
import { Users, TrendingUp, DollarSign, Settings, LogOut, ArrowRightLeft } from 'lucide-react'
import StudentList from '@/components/teacher/StudentList'
import CreateStudentModal from '@/components/teacher/CreateStudentModal'
import TransactionManager from '@/components/teacher/TransactionManager'
import { Student } from '@/types'

export default function TeacherDashboard() {
  const { teacher, isAuthenticated, isLoading, logout } = useAuth()
  const router = useRouter()
  const [students, setStudents] = useState<Student[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login')
    } else if (isAuthenticated) {
      fetchStudents()
    }
  }, [isAuthenticated, isLoading, router])

  const fetchStudents = async () => {
    try {
      const response = await fetch('/api/students/list')
      const data = await response.json()
      
      if (data.success) {
        setStudents(data.students || [])
      }
    } catch (error) {
      console.error('Failed to fetch students:', error)
    }
  }

  const handleCreateSuccess = () => {
    setShowCreateModal(false)
    fetchStudents()
  }

  const handleLogout = async () => {
    await logout()
    router.push('/')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    )
  }

  if (!teacher) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="text-2xl">💰</div>
              <h1 className="text-xl font-bold text-gray-900">RichStudent</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{teacher.name}</p>
                <p className="text-xs text-gray-500">{teacher.school}</p>
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            안녕하세요, {teacher.name} 선생님!
          </h2>
          <p className="text-gray-600">
            학생들과 함께 경제 교육을 시작해보세요.
          </p>
        </div>

        {/* Session Info Card */}
        <div className="mb-8">
          <Card className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
            <CardHeader>
              <CardTitle className="text-white">세션 코드</CardTitle>
              <CardDescription className="text-blue-100">
                학생들이 이 코드로 접속할 수 있습니다
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold tracking-wider">
                  {teacher.session_code || 'ABC123'}
                </div>
                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={() => navigator.clipboard.writeText(teacher.session_code || 'ABC123')}
                >
                  복사
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">총 학생 수</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{students.length}</div>
              <p className="text-xs text-muted-foreground">
                최대 {teacher.student_limit}명
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">총 거래량</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">
                오늘 거래 건수
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">평균 자산</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ₩{students.length > 0 
                  ? Math.round(students.reduce((sum, s) => sum + (s.total_balance || 0), 0) / students.length).toLocaleString()
                  : '0'
                }
              </div>
              <p className="text-xs text-muted-foreground">
                학생 평균 보유 자산
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">플랜</CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold capitalize">{teacher.plan}</div>
              <p className="text-xs text-muted-foreground">
                현재 사용 중인 플랜
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="students" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="students" className="flex items-center space-x-2">
              <Users className="w-4 h-4" />
              <span>학생 관리</span>
            </TabsTrigger>
            <TabsTrigger value="transactions" className="flex items-center space-x-2">
              <ArrowRightLeft className="w-4 h-4" />
              <span>거래 관리</span>
            </TabsTrigger>
            <TabsTrigger value="market" className="flex items-center space-x-2" disabled>
              <TrendingUp className="w-4 h-4" />
              <span>시장 데이터</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="students" className="mt-6">
            <div className="space-y-6">
              <StudentList onCreateStudent={() => setShowCreateModal(true)} />
            </div>
          </TabsContent>

          <TabsContent value="transactions" className="mt-6">
            <TransactionManager students={students} onRefreshStudents={fetchStudents} />
          </TabsContent>

          <TabsContent value="market" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>시장 데이터</CardTitle>
                <CardDescription>
                  실시간 주식, 암호화폐, 상품 가격 데이터를 제공합니다
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">곧 출시 예정</h3>
                  <p className="text-gray-500">
                    시장 데이터 기능은 Phase 4에서 구현될 예정입니다.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Development Notice */}
        <div className="mt-8">
          <Card className="bg-yellow-50 border-yellow-200">
            <CardHeader>
              <CardTitle className="text-yellow-800">🚧 개발 진행 상황</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-yellow-700 space-y-2">
                <p><strong>✅ 완료:</strong> 교사 인증 시스템, 기본 대시보드, 학생 관리 시스템</p>
                <p><strong>🔄 진행 중:</strong> 거래 시스템, 계좌 이체 기능 (Phase 3)</p>
                <p><strong>📋 예정:</strong> 투자 기능, 시장 데이터, 대출 시스템</p>
                <p className="mt-4 text-sm">
                  Phase 2 완료! 이제 학생을 추가하고 경제 교육을 시작할 수 있습니다.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Create Student Modal */}
      {showCreateModal && (
        <CreateStudentModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreateSuccess}
        />
      )}
    </div>
  )
}