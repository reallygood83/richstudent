'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Users, Plus, Trash2, CreditCard, TrendingUp, Edit } from 'lucide-react'
import EditStudentModal from './EditStudentModal'
import CreditScoreManager from './CreditScoreManager'

interface Student {
  id: string
  name: string
  student_code: string
  credit_score: number
  weekly_allowance: number
  created_at: string
  accounts: {
    checking: number
    savings: number
    investment: number
  }
  total_balance: number
}

interface StudentListProps {
  onCreateStudent: () => void
}

export default function StudentList({ onCreateStudent }: StudentListProps) {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [totalCount, setTotalCount] = useState(0)
  const [limit, setLimit] = useState(30)
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)

  const fetchStudents = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/students/list')
      const data = await response.json()

      if (data.success) {
        setStudents(data.students)
        setTotalCount(data.total_count)
        setLimit(data.limit)
      } else {
        setError(data.error || '학생 목록을 불러오는데 실패했습니다.')
      }
    } catch {
      setError('서버 연결에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const deleteStudent = async (studentId: string, studentName: string) => {
    if (!confirm(`정말로 ${studentName} 학생을 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없으며, 해당 학생의 모든 데이터(계좌, 거래내역 등)가 함께 삭제됩니다.`)) {
      return
    }

    try {
      const response = await fetch('/api/students/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ student_id: studentId }),
      })

      const data = await response.json()

      if (data.success) {
        setStudents(prev => prev.filter(s => s.id !== studentId))
        setTotalCount(prev => prev - 1)
      } else {
        alert(data.error || '학생 삭제에 실패했습니다.')
      }
    } catch {
      alert('서버 연결에 실패했습니다.')
    }
  }

  const handleEditStudent = (student: Student) => {
    setEditingStudent(student)
    setShowEditModal(true)
  }

  const handleEditSuccess = () => {
    setShowEditModal(false)
    setEditingStudent(null)
    fetchStudents() // 학생 목록 새로고침
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      minimumFractionDigits: 0,
    }).format(amount)
  }


  useEffect(() => {
    fetchStudents()
  }, [])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="w-5 h-5" />
            <span>학생 관리</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">학생 목록을 불러오는 중...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span>학생 관리</span>
            </CardTitle>
            <CardDescription>
              총 {totalCount}명 / 최대 {limit}명
            </CardDescription>
          </div>
          <Button onClick={onCreateStudent} className="flex items-center space-x-2">
            <Plus className="w-4 h-4" />
            <span>학생 추가</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {students.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">아직 학생이 없습니다</h3>
            <p className="text-gray-500 mb-4">
              첫 번째 학생을 추가하여 경제 교육을 시작해보세요.
            </p>
            <Button onClick={onCreateStudent} className="flex items-center space-x-2">
              <Plus className="w-4 h-4" />
              <span>첫 학생 추가하기</span>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {students.map((student) => (
              <div
                key={student.id}
                className="border rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="font-semibold text-lg">{student.name}</h3>
                      <Badge variant="outline">#{student.student_code}</Badge>
                      <CreditScoreManager 
                        student={student}
                        onScoreUpdate={fetchStudents}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <CreditCard className="w-4 h-4 text-blue-500" />
                        <span>당좌: {formatCurrency(student.accounts.checking)}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <TrendingUp className="w-4 h-4 text-green-500" />
                        <span>저축: {formatCurrency(student.accounts.savings)}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <TrendingUp className="w-4 h-4 text-purple-500" />
                        <span>투자: {formatCurrency(student.accounts.investment)}</span>
                      </div>
                      <div className="font-semibold">
                        총 자산: {formatCurrency(student.total_balance)}
                      </div>
                    </div>
                    
                    <div className="mt-2 text-xs text-gray-500">
                      주급: {formatCurrency(student.weekly_allowance)} | 
                      가입일: {new Date(student.created_at).toLocaleDateString('ko-KR')}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditStudent(student)}
                      className="text-blue-600 hover:bg-blue-50"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteStudent(student.id, student.name)}
                      className="text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Edit Student Modal */}
      <EditStudentModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        student={editingStudent}
        onSuccess={handleEditSuccess}
      />
    </Card>
  )
}