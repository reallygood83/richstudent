import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BookOpen, Users, TrendingUp, Shield } from 'lucide-react'

export default function HomePage() {

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="text-2xl">💰</div>
            <h1 className="text-2xl font-bold text-gray-900">RichStudent</h1>
          </div>
          <div className="space-x-4">
            <Link href="/auth/login">
              <Button variant="outline">로그인</Button>
            </Link>
            <Link href="/auth/register">
              <Button>회원가입</Button>
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-12">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-gray-900 mb-6">
            경제 교육의 새로운 시작
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            학생들이 가상 경제 환경에서 투자, 거래, 대출을 경험하며 
            실용적인 경제 지식을 배울 수 있는 교육 플랫폼입니다.
          </p>
          <div className="space-x-4">
            <Link href="/auth/register">
              <Button size="lg" className="text-lg px-8 py-3">
                무료로 시작하기
              </Button>
            </Link>
            <Link href="/demo">
              <Button variant="outline" size="lg" className="text-lg px-8 py-3">
                데모 체험하기
              </Button>
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card className="text-center">
            <CardHeader>
              <BookOpen className="w-12 h-12 text-blue-600 mx-auto mb-4" />
              <CardTitle>실습 중심 학습</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                이론이 아닌 직접적인 경험을 통해 경제 원리를 자연스럽게 습득합니다.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Users className="w-12 h-12 text-green-600 mx-auto mb-4" />
              <CardTitle>멀티 클래스</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                여러 학급을 독립적으로 관리하며 각각의 경제 환경을 운영할 수 있습니다.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <TrendingUp className="w-12 h-12 text-purple-600 mx-auto mb-4" />
              <CardTitle>실시간 시장</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                실제 주식, 암호화폐 시장 데이터를 활용한 생생한 투자 체험을 제공합니다.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Shield className="w-12 h-12 text-red-600 mx-auto mb-4" />
              <CardTitle>안전한 환경</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                가상 화폐로 진행되는 안전한 교육 환경에서 실수를 통해 배웁니다.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="text-center bg-white rounded-lg shadow-lg p-12">
          <h3 className="text-3xl font-bold text-gray-900 mb-4">
            지금 바로 시작해보세요
          </h3>
          <p className="text-lg text-gray-600 mb-8">
            무료 계정으로 학생 30명까지 모든 기능을 사용할 수 있습니다.
          </p>
          <Link href="/auth/register">
            <Button size="lg" className="text-lg px-12 py-4">
              교사 계정 만들기
            </Button>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 mt-16 border-t border-gray-200">
        <div className="text-center text-gray-600">
          <p>&copy; 2025 RichStudent. 모든 권리 보유.</p>
        </div>
      </footer>
    </div>
  )
}