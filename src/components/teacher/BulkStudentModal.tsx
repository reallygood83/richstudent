'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Upload, Users, FileText, AlertCircle, CheckCircle, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface BulkStudentModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface StudentData {
  name: string
  student_code: string
  weekly_allowance: number
  error?: string
}

export default function BulkStudentModal({ isOpen, onClose, onSuccess }: BulkStudentModalProps) {
  const [studentText, setStudentText] = useState('')
  const [defaultAllowance, setDefaultAllowance] = useState('50000')
  const [parsedStudents, setParsedStudents] = useState<StudentData[]>([])
  const [loading, setLoading] = useState(false)
  const [validationStep, setValidationStep] = useState(false)

  const parseStudentData = () => {
    const lines = studentText.trim().split('\n').filter(line => line.trim())
    const students: StudentData[] = []
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      let name = ''
      let studentCode = ''
      let weeklyAllowance = parseInt(defaultAllowance)

      // 다양한 형식 지원
      if (line.includes('\t')) {
        // 탭으로 구분된 경우: 이름\t학번\t주급
        const parts = line.split('\t')
        name = parts[0]?.trim()
        studentCode = parts[1]?.trim() || `S${String(i + 1).padStart(3, '0')}`
        weeklyAllowance = parseInt(parts[2]) || weeklyAllowance
      } else if (line.includes(',')) {
        // 쉼표로 구분된 경우: 이름,학번,주급
        const parts = line.split(',')
        name = parts[0]?.trim()
        studentCode = parts[1]?.trim() || `S${String(i + 1).padStart(3, '0')}`
        weeklyAllowance = parseInt(parts[2]) || weeklyAllowance
      } else {
        // 이름만 있는 경우
        name = line
        studentCode = `S${String(i + 1).padStart(3, '0')}`
      }

      // 유효성 검사
      let error = ''
      if (!name) {
        error = '이름이 없습니다'
      } else if (name.length > 50) {
        error = '이름이 너무 깁니다 (50자 이하)'
      } else if (!studentCode) {
        error = '학번이 없습니다'
      } else if (studentCode.length > 20) {
        error = '학번이 너무 깁니다 (20자 이하)'
      } else if (weeklyAllowance < 0 || weeklyAllowance > 1000000) {
        error = '주급은 0원 이상 100만원 이하여야 합니다'
      }

      students.push({
        name,
        student_code: studentCode,
        weekly_allowance: weeklyAllowance,
        error
      })
    }

    // 중복 학번 검사
    const codeMap = new Map()
    students.forEach((student, index) => {
      if (codeMap.has(student.student_code)) {
        student.error = `중복된 학번입니다 (${codeMap.get(student.student_code) + 1}행과 중복)`
      } else {
        codeMap.set(student.student_code, index)
      }
    })

    setParsedStudents(students)
    setValidationStep(true)
  }

  const removeStudent = (index: number) => {
    setParsedStudents(prev => prev.filter((_, i) => i !== index))
  }

  const submitStudents = async () => {
    const validStudents = parsedStudents.filter(s => !s.error)
    if (validStudents.length === 0) {
      alert('등록할 수 있는 유효한 학생이 없습니다.')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/students/bulk-create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          students: validStudents
        }),
      })

      const data = await response.json()

      if (data.success) {
        alert(`${data.created_count}명의 학생이 성공적으로 등록되었습니다!`)
        onSuccess()
        handleClose()
      } else {
        alert(data.error || '학생 등록에 실패했습니다.')
      }
    } catch {
      alert('서버 연결에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setStudentText('')
    setParsedStudents([])
    setValidationStep(false)
    setDefaultAllowance('50000')
    onClose()
  }

  const validCount = parsedStudents.filter(s => !s.error).length
  const errorCount = parsedStudents.filter(s => s.error).length

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Users className="w-5 h-5" />
            <span>학생 일괄 등록</span>
          </DialogTitle>
          <DialogDescription>
            여러 명의 학생을 한 번에 등록할 수 있습니다. 
            각 줄에 학생 정보를 입력하세요.
          </DialogDescription>
        </DialogHeader>

        {!validationStep ? (
          // 1단계: 데이터 입력
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="defaultAllowance">기본 주급 (원)</Label>
              <Input
                id="defaultAllowance"
                type="number"
                value={defaultAllowance}
                onChange={(e) => setDefaultAllowance(e.target.value)}
                min="0"
                max="1000000"
                placeholder="50000"
              />
              <p className="text-sm text-gray-500">
                주급이 명시되지 않은 학생들에게 적용될 기본 주급입니다.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="studentData">학생 정보</Label>
              <Textarea
                id="studentData"
                value={studentText}
                onChange={(e) => setStudentText(e.target.value)}
                placeholder={`다음 형식 중 하나를 선택하여 입력하세요:

방법 1 - 이름만 (학번 자동 생성):
김철수
이영희
박민수

방법 2 - 이름과 학번 (쉼표 구분):
김철수,S001
이영희,S002
박민수,S003

방법 3 - 이름, 학번, 주급 (쉼표 구분):
김철수,S001,60000
이영희,S002,45000
박민수,S003,55000

방법 4 - 탭으로 구분 (엑셀에서 복사 가능):
김철수	S001	60000
이영희	S002	45000`}
                className="min-h-[300px] font-mono text-sm"
              />
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <FileText className="w-4 h-4" />
                <span>총 {studentText.trim().split('\n').filter(line => line.trim()).length}줄</span>
              </div>
            </div>

            <div className="flex space-x-2">
              <Button onClick={parseStudentData} disabled={!studentText.trim()} className="flex-1">
                <Upload className="w-4 h-4 mr-2" />
                데이터 확인
              </Button>
              <Button variant="outline" onClick={handleClose}>
                취소
              </Button>
            </div>
          </div>
        ) : (
          // 2단계: 검증 및 확인
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Badge variant="outline" className="text-green-600">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  유효: {validCount}명
                </Badge>
                {errorCount > 0 && (
                  <Badge variant="outline" className="text-red-600">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    오류: {errorCount}명
                  </Badge>
                )}
              </div>
              <Button
                variant="outline"
                onClick={() => setValidationStep(false)}
                size="sm"
              >
                다시 편집
              </Button>
            </div>

            <div className="max-h-[400px] overflow-y-auto space-y-2">
              {parsedStudents.map((student, index) => (
                <div
                  key={index}
                  className={`p-3 border rounded-lg ${
                    student.error ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <span className="font-medium">{student.name}</span>
                        <Badge variant="outline">#{student.student_code}</Badge>
                        <span className="text-sm text-gray-600">
                          {student.weekly_allowance.toLocaleString()}원/주
                        </span>
                      </div>
                      {student.error && (
                        <p className="text-sm text-red-600 mt-1">
                          <AlertCircle className="w-4 h-4 inline mr-1" />
                          {student.error}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeStudent(index)}
                      className="text-red-600 hover:bg-red-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex space-x-2">
              <Button
                onClick={submitStudents}
                disabled={loading || validCount === 0}
                className="flex-1"
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>등록 중...</span>
                  </div>
                ) : (
                  <>
                    <Users className="w-4 h-4 mr-2" />
                    {validCount}명 등록하기
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={handleClose} disabled={loading}>
                취소
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}