import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GraduationCap, Users, DollarSign, BookOpen } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-financial relative overflow-hidden">
      {/* Header */}
      <header className="relative z-10 glass-effect">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-gold rounded-full flex items-center justify-center">
                <DollarSign className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">RichStudent</h1>
                <p className="text-sm text-white/80">Financial Education Platform</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-20">
          <h1 className="text-6xl md:text-7xl font-bold text-white mb-8 leading-tight">
            미래의 <span className="text-financial-gold">금융 리더</span>를
            <br />키우는 특별한 경험
          </h1>
          <p className="text-xl md:text-2xl text-white/90 mb-6 max-w-4xl mx-auto leading-relaxed">
            실제 금융 시장과 똑같은 환경에서 투자, 거래, 대출을 체험하며
            <br />경제 원리를 자연스럽게 학습하는 혁신적인 교육 플랫폼
          </p>
          <p className="text-lg text-white/70 mb-12 max-w-3xl mx-auto">
            가상이지만 실전 같은 경험으로 학생들의 금융 이해력과 경제적 사고력을 키워주세요
          </p>
        </div>

        {/* Access Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-20">
          {/* Teacher Card */}
          <Card className="financial-card bg-white/95 backdrop-blur-sm border-0 relative overflow-hidden group">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center space-x-4 text-3xl text-financial-navy">
                <div className="p-3 bg-gradient-tech rounded-xl">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <span>선생님 접속</span>
              </CardTitle>
              <CardDescription className="text-lg text-gray-600">
                학급을 관리하고 차세대 금융 교육을 시작하세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Button asChild className="w-full bg-gradient-tech text-white hover:shadow-lg glow-effect">
                  <a href="/auth/login">선생님 로그인</a>
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <a href="/auth/register">선생님 회원가입</a>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Student Card */}
          <Card className="financial-card bg-white/95 backdrop-blur-sm border-0 relative overflow-hidden group">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center space-x-4 text-3xl text-financial-navy">
                <div className="p-3 bg-gradient-success rounded-xl">
                  <GraduationCap className="w-8 h-8 text-white" />
                </div>
                <span>학생 접속</span>
              </CardTitle>
              <CardDescription className="text-lg text-gray-600">
                세션 코드로 접속하여 금융의 세계를 탐험하세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Button asChild className="w-full bg-gradient-success text-white hover:shadow-lg glow-effect">
                  <a href="/student/login">학생 로그인</a>
                </Button>
                <div className="text-center">
                  <p className="text-sm text-gray-500">
                    선생님이 제공한 세션 코드로 안전하게 접속
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 bg-white/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-financial-navy mb-6">
              왜 <span className="text-financial-gold">RichStudent</span>인가요?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              실제 금융 시장의 복잡함을 교육에 맞게 단순화하여, 학생들이 쉽고 재미있게 경제를 배울 수 있습니다
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center group">
              <div className="w-20 h-20 bg-gradient-gold rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <DollarSign className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-financial-navy mb-4">실전 경험</h3>
              <p className="text-gray-600 leading-relaxed">
                실시간 시장 데이터로 진짜 투자 경험을 제공하며, 이론이 아닌 실전을 통해 경제 원리를 체험합니다
              </p>
            </div>
            
            <div className="text-center group">
              <div className="w-20 h-20 bg-gradient-success rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <Users className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-financial-navy mb-4">협력 학습</h3>
              <p className="text-gray-600 leading-relaxed">
                학생들 간의 자금 이체, 공동 투자, 경쟁적 거래를 통해 사회적 경제 활동과 협력의 중요성을 학습합니다
              </p>
            </div>
            
            <div className="text-center group">
              <div className="w-20 h-20 bg-gradient-tech rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <BookOpen className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-financial-navy mb-4">혁신 기술</h3>
              <p className="text-gray-600 leading-relaxed">
                최신 웹 기술과 실시간 데이터 연동으로 끊김 없는 사용자 경험을 제공하며, 모든 기기에서 접속 가능합니다
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 bg-financial-navy text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-4 mb-6">
              <div className="w-12 h-12 bg-gradient-gold rounded-full flex items-center justify-center">
                <DollarSign className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold">RichStudent</h3>
                <p className="text-white/70 text-sm">Financial Education Platform</p>
              </div>
            </div>
            <p className="text-white/70 mb-6 max-w-2xl mx-auto">
              미래의 금융 리더를 키우는 혁신적인 경제 교육 플랫폼으로, 
              학생들이 실전 경험을 통해 경제 원리를 배울 수 있도록 돕습니다.
            </p>
            <div className="border-t border-white/20 pt-6">
              <p className="text-white/50 text-sm">
                © 2024 RichStudent. 모든 권리 보유. | 교육용 시뮬레이션 플랫폼
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
