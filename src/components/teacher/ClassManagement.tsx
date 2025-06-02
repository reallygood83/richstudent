'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  School, 
  Users, 
  DollarSign, 
  Activity, 
  Trash2, 
  Download, 
  AlertTriangle,
  Calendar,
  TrendingUp
} from 'lucide-react'
import ClassDeletionModal from './ClassDeletionModal'

interface ClassInfo {
  teacher: {
    id: string
    name: string
    email: string
    school: string
    created_at: string
  }
  class: {
    created_at: string
    student_count: number
    total_balance: number
    transaction_count: number
    portfolio_count: number
    asset_transaction_count: number
  }
  students: Array<{
    id: string
    name: string
    student_code: string
    created_at: string
  }>
}

export default function ClassManagement() {
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showDeletionModal, setShowDeletionModal] = useState(false)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getClassDuration = () => {
    if (!classInfo) return ''
    
    const startDate = new Date(classInfo.class.created_at)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - startDate.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays < 30) {
      return `${diffDays}일`
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30)
      return `${months}개월`
    } else {
      const years = Math.floor(diffDays / 365)
      const months = Math.floor((diffDays % 365) / 30)
      return `${years}년 ${months}개월`
    }
  }

  const fetchClassInfo = async () => {
    try {
      setLoading(true)
      setError('')
      
      const response = await fetch('/api/teacher/class-management')
      const data = await response.json()
      
      if (data.success) {
        setClassInfo(data.classInfo)
      } else {
        setError(data.error || '학급 정보를 불러오는데 실패했습니다.')
      }
    } catch (err) {
      setError('서버 연결에 실패했습니다.')
      console.error('Class info fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDeletionSuccess = () => {
    setShowDeletionModal(false)
    // 삭제 후 데이터 새로고침 또는 리다이렉트
    fetchClassInfo()
  }

  const exportClassData = async () => {
    try {
      const response = await fetch('/api/teacher/class-management', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          confirm_deletion: false, // 삭제하지 않고 백업만
          backup_requested: true
        }),
      })

      const data = await response.json()
      
      if (data.backup_data) {
        // JSON 파일로 다운로드
        const blob = new Blob([JSON.stringify(data.backup_data, null, 2)], {
          type: 'application/json'
        })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `richstudent-class-backup-${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Export error:', error)
      setError('데이터 내보내기에 실패했습니다.')
    }
  }

  useEffect(() => {
    fetchClassInfo()
  }, [])

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">학급 정보를 불러오는 중...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <div className="text-center">
            <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-sm text-red-600">{error}</p>
            <Button 
              onClick={fetchClassInfo} 
              variant="outline" 
              size="sm" 
              className="mt-2"
            >
              다시 시도
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!classInfo) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <p className="text-sm text-gray-600">학급 정보가 없습니다.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* 학급 개요 카드 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <School className="w-5 h-5" />
                <span>학급 관리</span>
              </CardTitle>
              <CardDescription>
                현재 학급의 전체 현황을 확인하고 관리합니다
              </CardDescription>
            </div>
            <div className="flex space-x-2">
              <Button
                onClick={exportClassData}
                variant="outline"
                size="sm"
                className="flex items-center space-x-1"
              >
                <Download className="w-4 h-4" />
                <span>데이터 내보내기</span>
              </Button>
              <Button
                onClick={() => setShowDeletionModal(true)}
                variant="destructive"
                size="sm"
                className="flex items-center space-x-1"
              >
                <Trash2 className="w-4 h-4" />
                <span>학급 삭제</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600">총 학생 수</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {classInfo.class.student_count}명
                  </p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600">총 자산</p>
                  <p className="text-2xl font-bold text-green-900">
                    {formatCurrency(classInfo.class.total_balance)}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600">거래 건수</p>
                  <p className="text-2xl font-bold text-purple-900">
                    {classInfo.class.transaction_count}건
                  </p>
                </div>
                <Activity className="h-8 w-8 text-purple-600" />
              </div>
            </div>

            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-600">운영 기간</p>
                  <p className="text-2xl font-bold text-orange-900">
                    {getClassDuration()}
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-orange-600" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 상세 정보 탭 */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">학급 개요</TabsTrigger>
          <TabsTrigger value="students">학생 목록</TabsTrigger>
          <TabsTrigger value="activity">활동 통계</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>교사 및 학급 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900">교사 정보</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">이름:</span>
                      <span className="font-medium">{classInfo.teacher.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">이메일:</span>
                      <span className="font-medium">{classInfo.teacher.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">학교:</span>
                      <span className="font-medium">{classInfo.teacher.school || '미설정'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">계정 생성:</span>
                      <span className="font-medium">{formatDate(classInfo.teacher.created_at)}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900">학급 정보</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">학급 시작일:</span>
                      <span className="font-medium">{formatDate(classInfo.class.created_at)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">포트폴리오 보유:</span>
                      <span className="font-medium">{classInfo.class.portfolio_count}건</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">자산 거래:</span>
                      <span className="font-medium">{classInfo.class.asset_transaction_count}건</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">평균 자산:</span>
                      <span className="font-medium">
                        {classInfo.class.student_count > 0 
                          ? formatCurrency(classInfo.class.total_balance / classInfo.class.student_count)
                          : formatCurrency(0)
                        }
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="students" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>학생 목록</CardTitle>
              <CardDescription>
                현재 등록된 학생들의 목록입니다
              </CardDescription>
            </CardHeader>
            <CardContent>
              {classInfo.students.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">등록된 학생이 없습니다.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {classInfo.students.map((student) => (
                    <div key={student.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{student.name}</h4>
                        <Badge variant="outline">{student.student_code}</Badge>
                      </div>
                      <p className="text-sm text-gray-600">
                        등록일: {formatDate(student.created_at)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>활동 통계</CardTitle>
              <CardDescription>
                학급의 경제 활동 현황을 확인합니다
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center space-x-2">
                    <TrendingUp className="w-4 h-4" />
                    <span>거래 활동</span>
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>총 거래 건수:</span>
                      <span className="font-medium">{classInfo.class.transaction_count}건</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>자산 거래 건수:</span>
                      <span className="font-medium">{classInfo.class.asset_transaction_count}건</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>학생당 평균 거래:</span>
                      <span className="font-medium">
                        {classInfo.class.student_count > 0 
                          ? Math.round((classInfo.class.transaction_count + classInfo.class.asset_transaction_count) / classInfo.class.student_count)
                          : 0
                        }건
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center space-x-2">
                    <DollarSign className="w-4 h-4" />
                    <span>자산 현황</span>
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>총 자산:</span>
                      <span className="font-medium">{formatCurrency(classInfo.class.total_balance)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>포트폴리오 보유 건수:</span>
                      <span className="font-medium">{classInfo.class.portfolio_count}건</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>평균 포트폴리오:</span>
                      <span className="font-medium">
                        {classInfo.class.student_count > 0 
                          ? Math.round(classInfo.class.portfolio_count / classInfo.class.student_count * 10) / 10
                          : 0
                        }건/인
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 삭제 확인 모달 */}
      {showDeletionModal && (
        <ClassDeletionModal
          classInfo={classInfo}
          onClose={() => setShowDeletionModal(false)}
          onSuccess={handleDeletionSuccess}
        />
      )}
    </div>
  )
}