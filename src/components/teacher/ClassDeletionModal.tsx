'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  X, 
  AlertTriangle, 
  Trash2, 
  Download, 
  Users, 
  DollarSign,
  Activity,
  Shield
} from 'lucide-react'

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

interface ClassDeletionModalProps {
  classInfo: ClassInfo
  onClose: () => void
  onSuccess: () => void
}

export default function ClassDeletionModal({ classInfo, onClose, onSuccess }: ClassDeletionModalProps) {
  const [step, setStep] = useState(1) // 1: 경고, 2: 확인, 3: 처리중, 4: 완료
  const [confirmText, setConfirmText] = useState('')
  const [backupRequested, setBackupRequested] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [deletionResult, setDeletionResult] = useState<any>(null)

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

  const handleDeleteClass = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/teacher/class-management', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          confirm_deletion: true,
          backup_requested: backupRequested
        }),
      })

      const data = await response.json()

      if (data.success) {
        setDeletionResult(data)
        setStep(4)
        
        // 백업 파일 다운로드
        if (backupRequested && data.backup_data) {
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
      } else {
        setError(data.error || '학급 삭제에 실패했습니다.')
      }
    } catch (err) {
      setError('서버 연결에 실패했습니다.')
      console.error('Class deletion error:', err)
    } finally {
      setLoading(false)
    }
  }

  const isConfirmValid = confirmText === '학급삭제'

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {step < 4 ? (
                <AlertTriangle className="w-6 h-6 text-red-500" />
              ) : (
                <Shield className="w-6 h-6 text-green-500" />
              )}
              <CardTitle className="text-red-900">
                {step === 1 && '학급 삭제 경고'}
                {step === 2 && '학급 삭제 확인'}
                {step === 3 && '학급 삭제 중...'}
                {step === 4 && '학급 삭제 완료'}
              </CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
              disabled={loading}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <CardDescription>
            {step === 1 && '학급을 삭제하면 모든 데이터가 영구적으로 제거됩니다.'}
            {step === 2 && '정말로 학급을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.'}
            {step === 3 && '학급 데이터를 삭제하고 있습니다. 잠시만 기다려주세요.'}
            {step === 4 && '학급이 성공적으로 삭제되었습니다.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-center text-red-700">
                <AlertTriangle className="w-4 h-4 mr-2" />
                <p className="text-sm">{error}</p>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              {/* 삭제될 데이터 개요 */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="font-semibold text-red-900 mb-3">삭제될 데이터</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <Users className="w-4 h-4 text-red-600" />
                    <span>학생 {classInfo.class.student_count}명</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <DollarSign className="w-4 h-4 text-red-600" />
                    <span>총 자산 {formatCurrency(classInfo.class.total_balance)}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Activity className="w-4 h-4 text-red-600" />
                    <span>거래 내역 {classInfo.class.transaction_count}건</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Activity className="w-4 h-4 text-red-600" />
                    <span>포트폴리오 {classInfo.class.portfolio_count}건</span>
                  </div>
                </div>
              </div>

              {/* 학급 정보 */}
              <div className="space-y-3">
                <h3 className="font-semibold">삭제될 학급 정보</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">교사:</span>
                    <span className="font-medium">{classInfo.teacher.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">학교:</span>
                    <span className="font-medium">{classInfo.teacher.school || '미설정'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">학급 시작일:</span>
                    <span className="font-medium">{formatDate(classInfo.class.created_at)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">운영 기간:</span>
                    <span className="font-medium">
                      {Math.ceil((Date.now() - new Date(classInfo.class.created_at).getTime()) / (1000 * 60 * 60 * 24))}일
                    </span>
                  </div>
                </div>
              </div>

              {/* 주의사항 */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="font-semibold text-yellow-900 mb-2">⚠️ 중요한 주의사항</h3>
                <ul className="text-sm text-yellow-800 space-y-1">
                  <li>• 삭제된 데이터는 복구할 수 없습니다.</li>
                  <li>• 모든 학생 계좌, 거래 내역, 포트폴리오가 삭제됩니다.</li>
                  <li>• 시장 자산 및 경제 주체 데이터도 함께 삭제됩니다.</li>
                  <li>• 삭제 후에는 새로운 학급으로 다시 시작해야 합니다.</li>
                </ul>
              </div>

              <div className="flex space-x-3 pt-4">
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="flex-1"
                >
                  취소
                </Button>
                <Button
                  onClick={() => setStep(2)}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                >
                  계속 진행
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              {/* 백업 옵션 */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="backup"
                    checked={backupRequested}
                    onCheckedChange={(checked) => setBackupRequested(checked as boolean)}
                  />
                  <Label htmlFor="backup" className="text-sm font-medium">
                    삭제 전 데이터 백업 파일 다운로드
                  </Label>
                </div>
                <p className="text-xs text-gray-600 ml-6">
                  삭제 전 모든 데이터를 JSON 파일로 백업하여 다운로드합니다.
                </p>
              </div>

              {/* 확인 텍스트 입력 */}
              <div className="space-y-2">
                <Label htmlFor="confirm-text">
                  삭제를 확인하려면 <span className="font-semibold text-red-600">"학급삭제"</span>를 정확히 입력하세요
                </Label>
                <Input
                  id="confirm-text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="학급삭제"
                  className="border-red-200 focus:border-red-500"
                />
              </div>

              {/* 최종 경고 */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-red-800">
                    <p className="font-semibold mb-1">최종 경고</p>
                    <p>
                      이 작업을 실행하면 <strong>{classInfo.class.student_count}명의 학생</strong>과 
                      관련된 모든 데이터가 영구적으로 삭제되며, 복구할 수 없습니다.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="flex-1"
                  disabled={loading}
                >
                  이전
                </Button>
                <Button
                  onClick={() => { setStep(3); handleDeleteClass(); }}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                  disabled={!isConfirmValid || loading}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  학급 삭제
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
                <h3 className="font-semibold text-lg mb-2">학급 데이터 삭제 중...</h3>
                <p className="text-gray-600 text-sm">
                  모든 관련 데이터를 삭제하고 있습니다. 잠시만 기다려주세요.
                </p>
              </div>
            </div>
          )}

          {step === 4 && deletionResult && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="font-semibold text-lg text-green-900 mb-2">삭제 완료</h3>
                <p className="text-gray-600">
                  학급이 성공적으로 삭제되었습니다.
                </p>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-semibold text-green-900 mb-2">삭제 요약</h4>
                <div className="text-sm text-green-800 space-y-1">
                  <div className="flex justify-between">
                    <span>삭제된 학생 수:</span>
                    <span className="font-medium">{deletionResult.deletion_summary.deleted_students}명</span>
                  </div>
                  <div className="flex justify-between">
                    <span>백업 파일 생성:</span>
                    <span className="font-medium">
                      {deletionResult.deletion_summary.backup_created ? '완료' : '안함'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>삭제 일시:</span>
                    <span className="font-medium">
                      {formatDate(deletionResult.deletion_summary.deletion_date)}
                    </span>
                  </div>
                </div>
              </div>

              {backupRequested && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Download className="w-4 h-4 text-blue-600" />
                    <span className="font-semibold text-blue-900">백업 파일</span>
                  </div>
                  <p className="text-sm text-blue-800">
                    학급 데이터가 JSON 파일로 자동 다운로드되었습니다. 
                    필요시 이 파일을 보관하여 데이터를 참조할 수 있습니다.
                  </p>
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <Button
                  onClick={onSuccess}
                  className="flex-1"
                >
                  확인
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}