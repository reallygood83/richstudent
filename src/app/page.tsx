import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GraduationCap, Users, DollarSign, BookOpen } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-financial relative overflow-hidden">
      {/* Header */}
      <header className="relative z-10 glass-effect">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 md:h-20">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-gold rounded-full flex items-center justify-center">
                <DollarSign className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
              </div>
              <div>
                <h1 className="text-lg sm:text-2xl font-bold text-white">RichStudent</h1>
                <p className="text-xs sm:text-sm text-white/80 hidden sm:block">Financial Education Platform</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 md:py-20">
        <div className="text-center mb-12 sm:mb-16 md:mb-20">
          <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-4 sm:mb-6 md:mb-8 leading-tight px-2">
            미래의 <span className="text-financial-gold">금융 리더</span>를
            <br className="hidden sm:block" />키우는 특별한 경험
          </h1>
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-white/90 mb-4 sm:mb-6 max-w-4xl mx-auto leading-relaxed px-4">
            실제 금융 시장과 똑같은 환경에서 투자, 거래, 대출을 체험하며
            <br className="hidden sm:block" />경제 원리를 자연스럽게 학습하는 혁신적인 교육 플랫폼
          </p>
          <p className="text-sm sm:text-base md:text-lg text-white/70 mb-8 sm:mb-12 max-w-3xl mx-auto px-4">
            가상이지만 실전 같은 경험으로 학생들의 금융 이해력과 경제적 사고력을 키워주세요
          </p>
        </div>

        {/* Access Cards */}
        <div className="grid sm:grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-5xl mx-auto mb-12 sm:mb-16 md:mb-20 px-4">
          {/* Teacher Card */}
          <Card className="financial-card bg-white/95 backdrop-blur-sm border-0 relative overflow-hidden group">
            <CardHeader className="pb-3 sm:pb-4">
              <CardTitle className="flex items-center space-x-3 sm:space-x-4 text-xl sm:text-2xl md:text-3xl text-financial-navy">
                <div className="p-2 sm:p-3 bg-gradient-tech rounded-xl">
                  <Users className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </div>
                <span>선생님 접속</span>
              </CardTitle>
              <CardDescription className="text-sm sm:text-base md:text-lg text-gray-600 mt-2">
                학급을 관리하고 차세대 금융 교육을 시작하세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6">
              <div className="space-y-2 sm:space-y-3">
                <Button asChild className="w-full bg-gradient-tech text-white hover:shadow-lg glow-effect h-11 sm:h-12 text-sm sm:text-base">
                  <a href="/auth/login">선생님 로그인</a>
                </Button>
                <Button asChild variant="outline" className="w-full h-11 sm:h-12 text-sm sm:text-base">
                  <a href="/auth/register">선생님 회원가입</a>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Student Card */}
          <Card className="financial-card bg-white/95 backdrop-blur-sm border-0 relative overflow-hidden group">
            <CardHeader className="pb-3 sm:pb-4">
              <CardTitle className="flex items-center space-x-3 sm:space-x-4 text-xl sm:text-2xl md:text-3xl text-financial-navy">
                <div className="p-2 sm:p-3 bg-gradient-success rounded-xl">
                  <GraduationCap className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </div>
                <span>학생 접속</span>
              </CardTitle>
              <CardDescription className="text-sm sm:text-base md:text-lg text-gray-600 mt-2">
                세션 코드로 접속하여 금융의 세계를 탐험하세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6">
              <div className="space-y-2 sm:space-y-3">
                <Button asChild className="w-full bg-gradient-success text-white hover:shadow-lg glow-effect h-11 sm:h-12 text-sm sm:text-base">
                  <a href="/student/login">학생 로그인</a>
                </Button>
                <div className="text-center">
                  <p className="text-xs sm:text-sm text-gray-500">
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 md:py-20">
          <div className="text-center mb-10 sm:mb-12 md:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-financial-navy mb-4 sm:mb-6 px-4">
              왜 <span className="text-financial-gold">RichStudent</span>인가요?
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-3xl mx-auto px-4">
              실제 금융 시장의 복잡함을 교육에 맞게 단순화하여, 학생들이 쉽고 재미있게 경제를 배울 수 있습니다
            </p>
          </div>

          <div className="grid sm:grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 px-4">
            <div className="text-center group">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-gold rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6 group-hover:scale-110 transition-transform duration-300">
                <DollarSign className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-financial-navy mb-3 sm:mb-4">실전 경험</h3>
              <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                실시간 시장 데이터로 진짜 투자 경험을 제공하며, 이론이 아닌 실전을 통해 경제 원리를 체험합니다
              </p>
            </div>

            <div className="text-center group">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-success rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6 group-hover:scale-110 transition-transform duration-300">
                <Users className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-financial-navy mb-3 sm:mb-4">협력 학습</h3>
              <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                학생들 간의 자금 이체, 공동 투자, 경쟁적 거래를 통해 사회적 경제 활동과 협력의 중요성을 학습합니다
              </p>
            </div>

            <div className="text-center group">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-tech rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6 group-hover:scale-110 transition-transform duration-300">
                <BookOpen className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-financial-navy mb-3 sm:mb-4">혁신 기술</h3>
              <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                최신 웹 기술과 실시간 데이터 연동으로 끊김 없는 사용자 경험을 제공하며, 모든 기기에서 접속 가능합니다
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 bg-financial-navy text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 md:py-12">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-3 sm:space-x-4 mb-4 sm:mb-6">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-gold rounded-full flex items-center justify-center">
                <DollarSign className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-bold">RichStudent</h3>
                <p className="text-white/70 text-xs sm:text-sm">Financial Education Platform</p>
              </div>
            </div>
            <p className="text-sm sm:text-base text-white/70 mb-4 sm:mb-6 max-w-2xl mx-auto px-4">
              미래의 금융 리더를 키우는 혁신적인 경제 교육 플랫폼으로,
              학생들이 실전 경험을 통해 경제 원리를 배울 수 있도록 돕습니다.
            </p>
            <div className="border-t border-white/20 pt-4 sm:pt-6 space-y-3 sm:space-y-4">
              <p className="text-white/70 text-xs sm:text-sm px-4">
                © 2025 RichStudent Moon-Jung Kim |
                <a
                  href="https://www.youtube.com/@%EB%B0%B0%EC%9B%80%EC%9D%98%EB%8B%AC%EC%9D%B8-p5v"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-1 text-financial-gold hover:text-yellow-300 underline transition-colors"
                >
                  유튜브 배움의 달인
                </a>
              </p>
              <div>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="bg-white/10 text-white border-white/30 hover:bg-white/20 hover:border-white/50 h-9 sm:h-10 text-xs sm:text-sm px-4 sm:px-6"
                >
                  <a
                    href="https://open.kakao.com/me/vesa"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    개발자에게 연락하기
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
