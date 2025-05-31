import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { GraduationCap, Users, DollarSign, BookOpen } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="text-2xl">💰</div>
              <h1 className="text-xl font-bold text-gray-900">RichStudent</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            💰 RichStudent
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            실제 경제 활동을 통해 배우는 체험형 경제 교육 플랫폼
          </p>
          <p className="text-lg text-gray-500 mb-12">
            학생들이 가상의 경제 환경에서 돈을 관리하고, 투자하며, 경제 원리를 자연스럽게 습득할 수 있습니다
          </p>
        </div>

        {/* Access Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-16">
          {/* Teacher Card */}
          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100 rounded-full transform translate-x-16 -translate-y-16"></div>
            <CardHeader>
              <CardTitle className="flex items-center space-x-3 text-2xl">
                <Users className="w-8 h-8 text-blue-600" />
                <span>선생님 접속</span>
              </CardTitle>
              <CardDescription className="text-lg">
                학급을 관리하고 경제 교육 시뮬레이션을 운영하세요
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 mb-6 text-gray-600">
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                  학생 계정 생성 및 관리
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                  가상 화폐 발행 및 거래 승인
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                  실시간 경제 활동 모니터링
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                  수업 계획 및 활동 설계
                </li>
              </ul>
              <div className="space-y-3">
                <Button asChild className="w-full bg-blue-600 hover:bg-blue-700">
                  <a href="/auth/login">선생님 로그인</a>
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <a href="/auth/register">선생님 회원가입</a>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Student Card */}
          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-100 rounded-full transform translate-x-16 -translate-y-16"></div>
            <CardHeader>
              <CardTitle className="flex items-center space-x-3 text-2xl">
                <GraduationCap className="w-8 h-8 text-green-600" />
                <span>학생 접속</span>
              </CardTitle>
              <CardDescription className="text-lg">
                세션 코드로 접속하여 경제 활동에 참여하세요
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 mb-6 text-gray-600">
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                  개인 계좌 및 자산 관리
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                  다른 학생들과 거래 활동
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                  투자 및 저축 체험
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                  실시간 거래 내역 확인
                </li>
              </ul>
              <div className="space-y-3">
                <Button asChild className="w-full bg-green-600 hover:bg-green-700">
                  <a href="/student/login">학생 로그인</a>
                </Button>
                <p className="text-sm text-gray-500 text-center">
                  선생님이 제공한 세션 코드가 필요합니다
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Features Section */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">
            왜 RichStudent인가요?
          </h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <DollarSign className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">실전 경험</h3>
              <p className="text-gray-600">
                이론이 아닌 실제 거래를 통해 경제 원리를 체험하고 학습합니다
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">협력 학습</h3>
              <p className="text-gray-600">
                학생들 간 상호작용을 통해 사회적 경제 활동을 이해합니다
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">체계적 교육</h3>
              <p className="text-gray-600">
                교육과정에 맞춘 단계별 학습으로 효과적인 경제 교육을 제공합니다
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}