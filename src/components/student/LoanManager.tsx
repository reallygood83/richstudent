'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { 
  Building2,
  CreditCard,
  DollarSign,
  AlertTriangle,
  RefreshCw,
  Calendar
} from 'lucide-react'

interface Loan {
  id: string
  loan_amount: number
  interest_rate: number
  loan_duration_weeks: number
  weekly_payment: number
  total_payment: number
  remaining_balance: number
  remaining_weeks: number
  status: string
  next_payment_due: string
  created_at: string
  progress_percentage: number
}

interface LoanSummary {
  total_loans: number
  active_loans: number
  total_outstanding: number
  total_monthly_payment: number
}

interface Eligibility {
  can_apply: boolean
  reason: string
  current_loans_count: number
}

interface CurrentRate {
  annual_rate: number
  max_amount: number
  max_weeks: number
  description: string
}

interface LoanData {
  student: {
    name: string
    credit_score: number
  }
  loans: Loan[]
  summary: LoanSummary
  eligibility: Eligibility
  current_rate: CurrentRate | null
}

export default function LoanManager() {
  const [loanData, setLoanData] = useState<LoanData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [applying, setApplying] = useState(false)
  const [repaying, setRepaying] = useState(false)

  // 대출 신청 폼
  const [applyForm, setApplyForm] = useState({
    loan_amount: '',
    duration_weeks: '12' // 기본 12주 (1년)
  })

  // 상환 폼
  const [repayForm, setRepayForm] = useState({
    loan_id: '',
    payment_amount: ''
  })

  // const [showApplyModal, setShowApplyModal] = useState(false)
  const [showRepayModal, setShowRepayModal] = useState(false)
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null)

  useEffect(() => {
    fetchLoanData()
  }, [])

  const fetchLoanData = async () => {
    try {
      setLoading(true)
      setError('')

      const response = await fetch('/api/loans/list')
      const data = await response.json()

      if (data.success) {
        setLoanData(data.data)
      } else {
        setError(data.error || '대출 정보를 불러올 수 없습니다.')
      }
    } catch (err) {
      console.error('Loan data fetch error:', err)
      setError('서버 연결 실패')
    } finally {
      setLoading(false)
    }
  }

  const handleLoanApply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!applyForm.loan_amount || !applyForm.duration_weeks) {
      setError('모든 필드를 입력해주세요.')
      return
    }

    setApplying(true)
    setError('')

    try {
      const response = await fetch('/api/loans/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          loan_amount: Number(applyForm.loan_amount),
          duration_weeks: Number(applyForm.duration_weeks)
        }),
      })

      const data = await response.json()

      if (data.success) {
        alert(`🎉 대출 신청이 승인되었습니다!\n\n${data.message}`)
        setApplyForm({ loan_amount: '', duration_weeks: '12' })
        // setShowApplyModal(false)
        fetchLoanData()
      } else {
        setError(data.error)
      }
    } catch (err) {
      console.error('Loan application error:', err)
      setError('대출 신청에 실패했습니다.')
    } finally {
      setApplying(false)
    }
  }

  const handleLoanRepay = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!repayForm.loan_id || !repayForm.payment_amount) {
      setError('상환할 대출과 금액을 입력해주세요.')
      return
    }

    setRepaying(true)
    setError('')

    try {
      const response = await fetch('/api/loans/repay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          loan_id: repayForm.loan_id,
          payment_amount: Number(repayForm.payment_amount)
        }),
      })

      const data = await response.json()

      if (data.success) {
        alert(`✅ ${data.message}`)
        setRepayForm({ loan_id: '', payment_amount: '' })
        setShowRepayModal(false)
        setSelectedLoan(null)
        fetchLoanData()
      } else {
        setError(data.error)
      }
    } catch (err) {
      console.error('Loan repayment error:', err)
      setError('대출 상환에 실패했습니다.')
    } finally {
      setRepaying(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'completed': return 'bg-blue-100 text-blue-800'
      case 'overdue': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return '상환중'
      case 'completed': return '완료'
      case 'overdue': return '연체'
      default: return status
    }
  }

  const calculateProjectedTotal = () => {
    const amount = Number(applyForm.loan_amount) || 0
    const weeks = Number(applyForm.duration_weeks) || 1
    const rate = loanData?.current_rate?.annual_rate || 0
    
    if (amount === 0 || weeks === 0) return { weeklyPayment: 0, totalPayment: 0 }
    
    const weeklyRate = rate / 100 / 12
    let weeklyPayment: number
    
    if (weeklyRate === 0) {
      weeklyPayment = amount / weeks
    } else {
      weeklyPayment = amount * (weeklyRate * Math.pow(1 + weeklyRate, weeks)) / 
                     (Math.pow(1 + weeklyRate, weeks) - 1)
    }
    
    const totalPayment = weeklyPayment * weeks
    
    return { 
      weeklyPayment: Math.round(weeklyPayment), 
      totalPayment: Math.round(totalPayment) 
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-600">대출 정보를 불러오는 중...</span>
        </CardContent>
      </Card>
    )
  }

  if (error && !loanData) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-700">
              {error}
            </AlertDescription>
          </Alert>
          <Button onClick={fetchLoanData} className="mt-4" variant="outline">
            다시 시도
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* 대출 현황 요약 */}
      {loanData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">신용점수</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loanData.student.credit_score}</div>
              <p className="text-xs text-muted-foreground">
                연이자율: {loanData.current_rate?.annual_rate || 0}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">활성 대출</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loanData.summary.active_loans}개</div>
              <p className="text-xs text-muted-foreground">
                전체 {loanData.summary.total_loans}개 중
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">총 대출잔액</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(loanData.summary.total_outstanding)}
              </div>
              <p className="text-xs text-muted-foreground">
                미상환 금액
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">월 상환금</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(loanData.summary.total_monthly_payment)}
              </div>
              <p className="text-xs text-muted-foreground">
                매주 상환액
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="loans" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="loans">내 대출</TabsTrigger>
          <TabsTrigger value="apply">대출 신청</TabsTrigger>
        </TabsList>

        <TabsContent value="loans" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>대출 목록</CardTitle>
                  <CardDescription>현재 보유 중인 대출을 관리하세요</CardDescription>
                </div>
                <Button onClick={fetchLoanData} variant="outline" size="sm">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  새로고침
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {error && (
                <Alert className="mb-4 border-red-200 bg-red-50">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-700">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              {loanData?.loans.length === 0 ? (
                <div className="text-center py-12">
                  <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">대출이 없습니다</h3>
                  <p className="text-gray-500 mb-4">
                    새로운 대출을 신청해보세요.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {loanData?.loans.map((loan) => (
                    <div key={loan.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold">
                            대출 #{loan.id.slice(-8)}
                          </h3>
                          <Badge className={getStatusColor(loan.status)}>
                            {getStatusText(loan.status)}
                          </Badge>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-600">연이자율</div>
                          <div className="font-semibold">{loan.interest_rate}%</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                        <div>
                          <span className="text-gray-600">대출 원금</span>
                          <div className="font-semibold">{formatCurrency(loan.loan_amount)}</div>
                        </div>
                        <div>
                          <span className="text-gray-600">남은 잔액</span>
                          <div className="font-semibold text-red-600">
                            {formatCurrency(loan.remaining_balance)}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-600">주간 상환금</span>
                          <div className="font-semibold">{formatCurrency(loan.weekly_payment)}</div>
                        </div>
                        <div>
                          <span className="text-gray-600">남은 기간</span>
                          <div className="font-semibold">{loan.remaining_weeks}주</div>
                        </div>
                      </div>

                      {/* 진행률 바 */}
                      <div className="mb-3">
                        <div className="flex justify-between text-sm mb-1">
                          <span>상환 진행률</span>
                          <span>{loan.progress_percentage}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${loan.progress_percentage}%` }}
                          ></div>
                        </div>
                      </div>

                      {loan.status === 'active' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedLoan(loan)
                              setRepayForm({
                                loan_id: loan.id,
                                payment_amount: loan.weekly_payment.toString()
                              })
                              setShowRepayModal(true)
                            }}
                          >
                            <DollarSign className="w-4 h-4 mr-1" />
                            상환하기
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="apply" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>대출 신청</CardTitle>
              <CardDescription>
                신용점수에 따른 맞춤형 대출 상품을 신청하세요
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loanData?.current_rate && (
                <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-2">
                    현재 신용등급: {loanData.current_rate.description}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-blue-700">연이자율</span>
                      <div className="font-semibold">{loanData.current_rate.annual_rate}%</div>
                    </div>
                    <div>
                      <span className="text-blue-700">최대 대출한도</span>
                      <div className="font-semibold">
                        {formatCurrency(loanData.current_rate.max_amount)}
                      </div>
                    </div>
                    <div>
                      <span className="text-blue-700">최대 대출기간</span>
                      <div className="font-semibold">{loanData.current_rate.max_weeks}주</div>
                    </div>
                  </div>
                </div>
              )}

              {!loanData?.eligibility.can_apply ? (
                <Alert className="border-red-200 bg-red-50">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-700">
                    {loanData?.eligibility.reason}
                  </AlertDescription>
                </Alert>
              ) : (
                <form onSubmit={handleLoanApply} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="loan_amount">대출 금액</Label>
                      <Input
                        id="loan_amount"
                        type="number"
                        placeholder="대출 받을 금액"
                        value={applyForm.loan_amount}
                        onChange={(e) => setApplyForm({
                          ...applyForm,
                          loan_amount: e.target.value
                        })}
                        max={loanData?.current_rate?.max_amount}
                      />
                    </div>
                    <div>
                      <Label htmlFor="duration_weeks">대출 기간 (주)</Label>
                      <Input
                        id="duration_weeks"
                        type="number"
                        placeholder="상환 기간 (주 단위)"
                        value={applyForm.duration_weeks}
                        onChange={(e) => setApplyForm({
                          ...applyForm,
                          duration_weeks: e.target.value
                        })}
                        max={loanData?.current_rate?.max_weeks}
                        min="1"
                      />
                    </div>
                  </div>

                  {/* 대출 계산 미리보기 */}
                  {applyForm.loan_amount && applyForm.duration_weeks && (
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-semibold mb-2">대출 조건 미리보기</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">주간 상환금</span>
                          <div className="font-semibold text-blue-600">
                            {formatCurrency(calculateProjectedTotal().weeklyPayment)}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-600">총 상환금액</span>
                          <div className="font-semibold text-red-600">
                            {formatCurrency(calculateProjectedTotal().totalPayment)}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-600">총 이자비용</span>
                          <div className="font-semibold text-orange-600">
                            {formatCurrency(
                              calculateProjectedTotal().totalPayment - Number(applyForm.loan_amount)
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {error && (
                    <Alert className="border-red-200 bg-red-50">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <AlertDescription className="text-red-700">
                        {error}
                      </AlertDescription>
                    </Alert>
                  )}

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={applying || !applyForm.loan_amount || !applyForm.duration_weeks}
                  >
                    {applying ? '신청 중...' : '대출 신청'}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 상환 모달 */}
      <Dialog open={showRepayModal} onOpenChange={setShowRepayModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>대출 상환</DialogTitle>
            <DialogDescription>
              {selectedLoan && `대출 #${selectedLoan.id.slice(-8)} 상환`}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleLoanRepay} className="space-y-4">
            <div>
              <Label htmlFor="payment_amount">상환 금액</Label>
              <Input
                id="payment_amount"
                type="number"
                placeholder="상환할 금액"
                value={repayForm.payment_amount}
                onChange={(e) => setRepayForm({
                  ...repayForm,
                  payment_amount: e.target.value
                })}
              />
              {selectedLoan && (
                <p className="text-sm text-gray-600 mt-1">
                  정기 상환금: {formatCurrency(selectedLoan.weekly_payment)}
                </p>
              )}
            </div>

            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-700">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setShowRepayModal(false)}
              >
                취소
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={repaying || !repayForm.payment_amount}
              >
                {repaying ? '상환 중...' : '상환하기'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}