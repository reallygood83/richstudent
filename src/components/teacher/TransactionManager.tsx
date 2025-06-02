'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowRightLeft, DollarSign, Users, PlusCircle } from 'lucide-react'
import TransferModal from './TransferModal'
import MultiTransferModal from './MultiTransferModal'
import AllowanceModal from './AllowanceModal'
import TaxCollectionModal from './TaxCollectionModal'
import TransactionHistory from './TransactionHistory'
import { Student } from '@/types'

interface TransactionManagerProps {
  students: Student[]
  onRefreshStudents: () => void
}

export default function TransactionManager({ students, onRefreshStudents }: TransactionManagerProps) {
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [showMultiTransferModal, setShowMultiTransferModal] = useState(false)
  const [showAllowanceModal, setShowAllowanceModal] = useState(false)
  const [showTaxCollectionModal, setShowTaxCollectionModal] = useState(false)
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(false)

  const totalStudents = students.length
  const totalAssets = students.reduce((sum, student) => sum + student.total_balance, 0)
  const averageAssets = totalStudents > 0 ? totalAssets / totalStudents : 0

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const fetchTransactions = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/transactions/list')
      const data = await response.json()
      
      if (data.success) {
        setTransactions(data.transactions)
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTransactions()
  }, [])

  const handleTransferSuccess = () => {
    setShowTransferModal(false)
    onRefreshStudents()
    fetchTransactions()
  }

  const handleMultiTransferSuccess = () => {
    setShowMultiTransferModal(false)
    onRefreshStudents()
    fetchTransactions()
  }

  const handleAllowanceSuccess = () => {
    setShowAllowanceModal(false)
    onRefreshStudents()
    fetchTransactions()
  }

  const handleTaxCollectionSuccess = () => {
    setShowTaxCollectionModal(false)
    onRefreshStudents()
    fetchTransactions()
  }

  return (
    <div className="space-y-6">
      {/* 거래 통계 카드들 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 학생 수</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStudents}명</div>
            <p className="text-xs text-muted-foreground">
              활성 학생 계정
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 자산</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalAssets)}</div>
            <p className="text-xs text-muted-foreground">
              모든 학생 계좌 합계
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">평균 자산</CardTitle>
            <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(averageAssets)}</div>
            <p className="text-xs text-muted-foreground">
              학생당 평균 보유 자산
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 거래 관리 탭 */}
      <Tabs defaultValue="actions" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="actions">거래 관리</TabsTrigger>
          <TabsTrigger value="history">거래 내역</TabsTrigger>
        </TabsList>

        <TabsContent value="actions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>거래 관리</CardTitle>
              <CardDescription>
                학생들의 자산을 관리하고 거래를 실행합니다
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <Button
                  onClick={() => setShowTransferModal(true)}
                  className="h-20 flex flex-col items-center justify-center space-y-2"
                  disabled={students.length < 2}
                >
                  <ArrowRightLeft className="h-6 w-6" />
                  <span>학생 간 송금</span>
                </Button>

                <Button
                  onClick={() => setShowMultiTransferModal(true)}
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center space-y-2"
                  disabled={students.length < 3}
                >
                  <Users className="h-6 w-6" />
                  <span>다중 송금</span>
                </Button>

                <Button
                  onClick={() => setShowAllowanceModal(true)}
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center space-y-2"
                  disabled={students.length === 0}
                >
                  <PlusCircle className="h-6 w-6" />
                  <span>수당 지급</span>
                </Button>

                <Button
                  onClick={() => setShowTaxCollectionModal(true)}
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center space-y-2"
                  disabled={students.length === 0}
                >
                  <DollarSign className="h-6 w-6" />
                  <span>세금 징수</span>
                </Button>

                <Button
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center space-y-2"
                  disabled={students.length === 0}
                >
                  <Users className="h-6 w-6" />
                  <span>잔액 조정</span>
                </Button>
              </div>

              {students.length === 0 && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    거래 기능을 사용하려면 먼저 학생을 추가해주세요.
                  </p>
                </div>
              )}

              {students.length === 1 && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    학생 간 송금을 하려면 최소 2명의 학생이 필요합니다.
                  </p>
                </div>
              )}

              {students.length === 2 && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    다중 송금을 하려면 최소 3명의 학생이 필요합니다 (송금자 1명 + 수신자 2명 이상).
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <TransactionHistory transactions={transactions} loading={loading} />
        </TabsContent>
      </Tabs>

      {/* 모달들 */}
      {showTransferModal && (
        <TransferModal
          students={students}
          onClose={() => setShowTransferModal(false)}
          onSuccess={handleTransferSuccess}
        />
      )}

      {showMultiTransferModal && (
        <MultiTransferModal
          students={students}
          onClose={() => setShowMultiTransferModal(false)}
          onSuccess={handleMultiTransferSuccess}
        />
      )}

      {showAllowanceModal && (
        <AllowanceModal
          students={students}
          onClose={() => setShowAllowanceModal(false)}
          onSuccess={handleAllowanceSuccess}
        />
      )}

      {showTaxCollectionModal && (
        <TaxCollectionModal
          students={students}
          onClose={() => setShowTaxCollectionModal(false)}
          onSuccess={handleTaxCollectionSuccess}
        />
      )}
    </div>
  )
}